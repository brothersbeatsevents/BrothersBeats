import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../store';
import { AuthRequest, authenticate, generateToken } from '../middleware/auth';
import {
  verifyCognitoToken,
  isConfigured as cognitoConfigured,
  authenticateUser,
  signUpUser,
  confirmSignUp,
  resendConfirmationCode,
  forgotPassword,
  confirmForgotPassword,
  addUserToGroup,
} from '../services/cognito';
import { sendWelcomeEmail } from '../services/email';
import { User } from '../types';

const router = Router();

const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN
  ? `https://${process.env.COGNITO_DOMAIN}.auth.${process.env.AWS_REGION || 'eu-west-1'}.amazoncognito.com`
  : '';
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID || '';
const CUSTOMER_GROUP = process.env.COGNITO_CUSTOMER_GROUP_NAME || 'CUSTOMER';

// FRONTEND_URL may be comma-separated for CORS; use only the first entry as the canonical URL
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')[0]
  .trim();

function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    role: user.role,
    avatar_url: user.avatar_url,
    phone: user.phone,
    marketing_consent: user.marketing_consent,
    category_preferences: user.category_preferences,
    city_preference: user.city_preference,
  };
}

async function findOrCreateCustomer(payload: {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  'cognito:username'?: string;
}): Promise<User> {
  let user = await db.findBy<User>('users', 'cognito_sub', payload.sub);
  if (!user && payload.email) {
    user = await db.findBy<User>('users', 'email', payload.email);
  }

  if (!user) {
    const now = new Date().toISOString();
    const displayName = payload.name || payload.email?.split('@')[0] || 'Customer';
    user = {
      id: `user-${uuid()}`,
      cognito_sub: payload.sub,
      email: payload.email || '',
      display_name: displayName,
      role: 'CUSTOMER',
      google_verified: !!payload['cognito:username']?.startsWith('google_'),
      avatar_url: payload.picture,
      marketing_consent: false,
      created_at: now,
      updated_at: now,
    };
    await db.put('users', user);

    if (payload.email) {
      await sendWelcomeEmail(payload.email, user.display_name).catch(
        console.error,
      );
    }
  } else if (!user.cognito_sub) {
    user.cognito_sub = payload.sub;
    if (payload.picture && !user.avatar_url) user.avatar_url = payload.picture;
    user.updated_at = new Date().toISOString();
    await db.put('users', user);
  }

  return user;
}

// POST /api/auth/login — Mock login for local development (disabled when Cognito is active)
router.post(
  '/login',
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (cognitoConfigured()) {
      res.status(400).json({
        success: false,
        error:
          'Direct login disabled. Use /api/auth/cognito/login for OAuth flow.',
      });
      return;
    }

    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: 'Email is required' });
      return;
    }

    const user = await db.findBy<User>('users', 'email', email);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found. Use a seeded email address for local dev.',
      });
      return;
    }

    const token = generateToken(user);
    res.json({ success: true, data: { token, user: publicUser(user) } });
  },
);

// GET /api/auth/cognito/login — Redirect to Cognito Hosted UI (Google)
router.get('/cognito/login', (_req, res: Response): void => {
  if (!COGNITO_DOMAIN || !COGNITO_CLIENT_ID) {
    res.status(503).json({ success: false, error: 'Cognito not configured' });
    return;
  }

  const redirectUri = `${FRONTEND_URL}/auth/callback`;
  const loginUrl = `${COGNITO_DOMAIN}/oauth2/authorize?client_id=${COGNITO_CLIENT_ID}&response_type=code&scope=openid+email+profile&identity_provider=Google&redirect_uri=${encodeURIComponent(redirectUri)}`;

  res.json({ success: true, data: { loginUrl } });
});

// POST /api/auth/cognito/token — Exchange authorization code for tokens
router.post(
  '/cognito/token',
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { code, redirect_uri } = req.body;
    if (!code) {
      res
        .status(400)
        .json({ success: false, error: 'Authorization code is required' });
      return;
    }

    try {
      const tokenEndpoint = `${COGNITO_DOMAIN}/oauth2/token`;
      const tokenResponse = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: COGNITO_CLIENT_ID,
          code,
          redirect_uri: redirect_uri || `${FRONTEND_URL}/auth/callback`,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const errBody = await tokenResponse.text();
        console.error('[Auth] Token exchange failed:', errBody);
        res
          .status(401)
          .json({ success: false, error: 'Token exchange failed' });
        return;
      }

      const tokens = (await tokenResponse.json()) as {
        id_token: string;
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };

      const payload = await verifyCognitoToken(tokens.id_token);
      const user = await findOrCreateCustomer(payload);

      // Ensure the customer is a member of the CUSTOMER group so bookings/refunds
      // authorization (role derived from Cognito groups) works immediately.
      if (!payload['cognito:groups']?.length) {
        await addUserToGroup(payload.sub, CUSTOMER_GROUP).catch(() => {});
      }

      res.json({
        success: true,
        data: {
          id_token: tokens.id_token,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_in: tokens.expires_in,
          user: publicUser(user),
        },
      });
    } catch (error) {
      console.error('[Auth] Cognito token error:', error);
      res.status(401).json({ success: false, error: 'Authentication failed' });
    }
  },
);

// POST /api/auth/cognito/refresh — Refresh tokens
router.post(
  '/cognito/refresh',
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      res
        .status(400)
        .json({ success: false, error: 'Refresh token is required' });
      return;
    }

    try {
      const tokenEndpoint = `${COGNITO_DOMAIN}/oauth2/token`;
      const tokenResponse = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: COGNITO_CLIENT_ID,
          refresh_token,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        res.status(401).json({ success: false, error: 'Token refresh failed' });
        return;
      }

      const tokens = (await tokenResponse.json()) as {
        id_token: string;
        access_token: string;
        expires_in: number;
      };

      res.json({ success: true, data: tokens });
    } catch {
      res.status(401).json({ success: false, error: 'Token refresh failed' });
    }
  },
);

// ── Direct Email/Password Auth ──

// POST /api/auth/signin — Sign in with email + password via Cognito
router.post(
  '/signin',
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { email, password } = req.body;
    if (!email || !password) {
      res
        .status(400)
        .json({ success: false, error: 'Email and password are required' });
      return;
    }

    try {
      const tokens = await authenticateUser(email, password);
      const payload = await verifyCognitoToken(tokens.id_token);
      const user = await findOrCreateCustomer(payload);

      res.json({
        success: true,
        data: {
          id_token: tokens.id_token,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_in: tokens.expires_in,
          user: publicUser(user),
        },
      });
    } catch (error: any) {
      if (error.name === 'UserNotConfirmedException') {
        try {
          await resendConfirmationCode(email);
        } catch {
          /* ignore resend errors */
        }
        res.status(401).json({
          success: false,
          error: 'Please verify your email first',
          code: 'USER_NOT_CONFIRMED',
        });
        return;
      }
      const message =
        error.name === 'NotAuthorizedException' ||
        error.name === 'UserNotFoundException'
          ? 'Incorrect email or password'
          : 'Authentication failed';
      res.status(401).json({ success: false, error: message });
    }
  },
);

// POST /api/auth/signup — Create a new customer account
router.post(
  '/signup',
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { email, password, name } = req.body;
    if (!email || !password) {
      res
        .status(400)
        .json({ success: false, error: 'Email and password are required' });
      return;
    }

    try {
      await signUpUser(email, password, name || email.split('@')[0]);
      res.json({
        success: true,
        message:
          'Account created. Please check your email for a verification code.',
      });
    } catch (error: any) {
      // Return the same message for UsernameExistsException to prevent
      // email enumeration (attacker cannot distinguish existing vs new accounts).
      if (error.name === 'UsernameExistsException') {
        res.json({
          success: true,
          message:
            'Account created. Please check your email for a verification code.',
        });
        return;
      }
      const message =
        error.name === 'InvalidPasswordException'
          ? 'Password does not meet requirements (min 8 chars, uppercase, lowercase, number)'
          : error.message || 'Sign up failed';
      res.status(400).json({ success: false, error: message });
    }
  },
);

// POST /api/auth/confirm — Confirm email with verification code
router.post(
  '/confirm',
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400).json({
        success: false,
        error: 'Email and verification code are required',
      });
      return;
    }

    try {
      await confirmSignUp(email, code);
      // Newly confirmed customers join the CUSTOMER group so their JWT
      // carries CUSTOMER as their authorization role.
      await addUserToGroup(email, CUSTOMER_GROUP).catch((err) =>
        console.error('[Auth] Failed to add user to CUSTOMER group:', err),
      );
      res.json({
        success: true,
        message: 'Email verified. You can now sign in.',
      });
    } catch (error: any) {
      const message =
        error.name === 'CodeMismatchException'
          ? 'Invalid verification code'
          : error.name === 'ExpiredCodeException'
            ? 'Verification code has expired. Please request a new one.'
            : 'Verification failed';
      res.status(400).json({ success: false, error: message });
    }
  },
);

// POST /api/auth/resend-code — Resend email verification code
router.post(
  '/resend-code',
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: 'Email is required' });
      return;
    }

    try {
      await resendConfirmationCode(email);
    } catch {
      /* don't reveal if account exists */
    }
    res.json({
      success: true,
      message: 'If an unverified account exists, a new code has been sent.',
    });
  },
);

// POST /api/auth/forgot-password — Send password reset code
router.post(
  '/forgot-password',
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: 'Email is required' });
      return;
    }

    try {
      await forgotPassword(email);
    } catch {
      /* don't reveal if account exists */
    }
    res.json({
      success: true,
      message:
        'If an account exists, a reset code has been sent to your email.',
    });
  },
);

// POST /api/auth/reset-password — Confirm password reset with code
router.post(
  '/reset-password',
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { email, code, new_password } = req.body;
    if (!email || !code || !new_password) {
      res.status(400).json({
        success: false,
        error: 'Email, code, and new password are required',
      });
      return;
    }

    try {
      await confirmForgotPassword(email, code, new_password);
      res.json({
        success: true,
        message: 'Password reset successful. You can now sign in.',
      });
    } catch (error: any) {
      const message =
        error.name === 'CodeMismatchException'
          ? 'Invalid reset code'
          : error.name === 'ExpiredCodeException'
            ? 'Reset code has expired'
            : error.name === 'InvalidPasswordException'
              ? 'Password does not meet requirements'
              : 'Password reset failed';
      res.status(400).json({ success: false, error: message });
    }
  },
);

// GET /api/auth/me — Get current user profile
router.get('/me', authenticate, (req: AuthRequest, res: Response): void => {
  res.json({ success: true, data: publicUser(req.user!) });
});

export default router;
