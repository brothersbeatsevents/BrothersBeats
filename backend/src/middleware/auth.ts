import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../store';
import { User, UserRole } from '../types';
import {
  verifyCognitoToken,
  isConfigured as cognitoConfigured,
} from '../services/cognito';

const JWT_SECRET = process.env.JWT_SECRET || 'brothers-beats-local-dev-secret';
const USE_COGNITO = !!process.env.COGNITO_USER_POOL_ID;
const ADMIN_GROUP = process.env.COGNITO_ADMIN_GROUP_NAME || 'ADMIN';
const SUPER_ADMIN_GROUP =
  process.env.COGNITO_SUPER_ADMIN_GROUP_NAME || 'SUPER_ADMIN';

// Fail-fast in production: if Cognito is not configured and no JWT_SECRET is provided, tokens are forgeable
if (
  process.env.USE_DYNAMODB &&
  !process.env.COGNITO_USER_POOL_ID &&
  !process.env.JWT_SECRET
) {
  throw new Error(
    '[Auth] JWT_SECRET must be set in production when Cognito is not configured',
  );
}

export interface AuthRequest extends Request {
  user?: User;
}

// Generate a mock JWT for local dev (only used when Cognito is not configured)
export function generateToken(user: User): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' },
  );
}

// ── Resolve user from token payload ──
async function resolveUser(sub: string, email?: string): Promise<User | null> {
  // Try by cognito_sub first (for Cognito users)
  if (USE_COGNITO) {
    const bySub = await db.findBy<User>('users', 'cognito_sub', sub);
    if (bySub) return bySub;
  }

  // Try by ID (for local dev mock tokens)
  const byId = await db.get<User>('users', sub);
  if (byId) return byId;

  // Try by email as fallback
  if (email) {
    const byEmail = await db.findBy<User>('users', 'email', email);
    if (byEmail) return byEmail;
  }

  return null;
}

// ── Token verification (Cognito or local JWT) ──
async function verifyToken(
  token: string,
): Promise<{ sub: string; email?: string; groups?: string[] }> {
  if (USE_COGNITO && cognitoConfigured()) {
    const payload = await verifyCognitoToken(token);
    return {
      sub: payload.sub,
      email: payload.email,
      groups: payload['cognito:groups'],
    };
  }

  // Local dev: verify with JWT_SECRET
  const decoded = jwt.verify(token, JWT_SECRET) as {
    sub: string;
    email: string;
    role: string;
  };
  return { sub: decoded.sub, email: decoded.email, groups: [decoded.role] };
}

// Derive the application role from Cognito group membership (source of truth
// for admin/super-admin) — falls back to the persisted user role otherwise.
function resolveRoleFromGroups(
  groups: string[] | undefined,
  fallback: UserRole,
): UserRole {
  if (!groups) return fallback;
  if (groups.includes(SUPER_ADMIN_GROUP)) return 'SUPER_ADMIN';
  if (groups.includes(ADMIN_GROUP)) return 'ADMIN';
  if (groups.includes('CUSTOMER')) return 'CUSTOMER';
  return fallback;
}

// Verify token and attach user to request
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);
    const user = await resolveUser(decoded.sub, decoded.email);
    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }
    if (user.disabled) {
      res.status(403).json({ success: false, error: 'Account disabled' });
      return;
    }
    const effectiveRole = resolveRoleFromGroups(decoded.groups, user.role);
    req.user = effectiveRole === user.role ? user : { ...user, role: effectiveRole };
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

// Optional auth - sets user if token present but doesn't require it
export async function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decoded = await verifyToken(token);
      const user = await resolveUser(decoded.sub, decoded.email);
      if (user && !user.disabled) {
        const effectiveRole = resolveRoleFromGroups(decoded.groups, user.role);
        req.user = effectiveRole === user.role ? user : { ...user, role: effectiveRole };
      }
    } catch {
      // silently continue without auth
    }
  }
  next();
}

// Role-based authorization
export function authorize(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res
        .status(403)
        .json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

// Admin check (ADMIN or SUPER_ADMIN)
export const ADMIN_ROLES: UserRole[] = ['ADMIN', 'SUPER_ADMIN'];

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  if (!ADMIN_ROLES.includes(req.user.role)) {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }
  next();
}

export function requireSuperAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  if (req.user.role !== 'SUPER_ADMIN') {
    res
      .status(403)
      .json({ success: false, error: 'Super admin access required' });
    return;
  }
  next();
}
