// ──────────────────────────────────────────
// Admin: Admin-user management (SUPER_ADMIN only)
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../../store';
import { AuthRequest, authenticate, requireSuperAdmin } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { User } from '../../types';
import {
  adminInviteUser,
  addUserToGroup,
  removeUserFromGroup,
  disableCognitoUser,
  enableCognitoUser,
  isConfigured as cognitoConfigured,
} from '../../services/cognito';

const router = Router();
router.use(authenticate, requireSuperAdmin);

const ADMIN_GROUP = process.env.COGNITO_ADMIN_GROUP_NAME || 'ADMIN';
const SUPER_ADMIN_GROUP = process.env.COGNITO_SUPER_ADMIN_GROUP_NAME || 'SUPER_ADMIN';

function publicAdminUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    role: user.role,
    disabled: user.disabled,
    created_at: user.created_at,
  };
}

// GET /api/admin/admin-users — list ADMIN + SUPER_ADMIN accounts
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  const users = await db.getAll<User>('users');
  const admins = users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');
  res.json({ success: true, data: admins.map(publicAdminUser) });
});

// POST /api/admin/admin-users/invite
router.post('/invite', async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, name, role } = req.body;
  if (!email || !name || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
    res.status(400).json({ success: false, error: 'email, name, and role (ADMIN or SUPER_ADMIN) are required' });
    return;
  }
  if (!cognitoConfigured()) {
    res.status(503).json({ success: false, error: 'Cognito is not configured in this environment' });
    return;
  }

  const existing = await db.findBy<User>('users', 'email', email);
  if (existing) {
    res.status(409).json({ success: false, error: 'A user with this email already exists' });
    return;
  }

  const groupName = role === 'SUPER_ADMIN' ? SUPER_ADMIN_GROUP : ADMIN_GROUP;
  await adminInviteUser(email, name, groupName);

  const now = new Date().toISOString();
  const user: User = {
    id: `user-${uuid()}`,
    email,
    display_name: name,
    role,
    google_verified: false,
    marketing_consent: false,
    created_at: now,
    updated_at: now,
  };
  await db.put('users', user);

  auditLog(req.user!.id, 'INVITE_ADMIN_USER', 'USER', user.id, {
    actorRole: 'SUPER_ADMIN',
    summary: `Invited ${email} as ${role}`,
  });

  res.status(201).json({ success: true, data: publicAdminUser(user) });
});

// PATCH /api/admin/admin-users/:id — change role and/or enabled state
router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await db.get<User>('users', req.params.id);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    res.status(404).json({ success: false, error: 'Admin user not found' });
    return;
  }
  if (user.id === req.user!.id && (req.body.role || req.body.disabled === true)) {
    res.status(400).json({ success: false, error: 'You cannot change your own role or disable your own account' });
    return;
  }

  const { role, disabled } = req.body;
  if (role && role !== user.role) {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      res.status(400).json({ success: false, error: 'role must be ADMIN or SUPER_ADMIN' });
      return;
    }
    const oldGroup = user.role === 'SUPER_ADMIN' ? SUPER_ADMIN_GROUP : ADMIN_GROUP;
    const newGroup = role === 'SUPER_ADMIN' ? SUPER_ADMIN_GROUP : ADMIN_GROUP;
    if (cognitoConfigured() && user.cognito_sub) {
      await removeUserFromGroup(user.cognito_sub, oldGroup).catch(() => {});
      await addUserToGroup(user.cognito_sub, newGroup).catch(() => {});
    }
    user.role = role;
  }

  if (disabled !== undefined && disabled !== user.disabled) {
    if (cognitoConfigured() && user.cognito_sub) {
      if (disabled) await disableCognitoUser(user.cognito_sub).catch(() => {});
      else await enableCognitoUser(user.cognito_sub).catch(() => {});
    }
    user.disabled = disabled;
  }

  user.updated_at = new Date().toISOString();
  await db.put('users', user);

  auditLog(req.user!.id, 'UPDATE_ADMIN_USER', 'USER', user.id, {
    actorRole: 'SUPER_ADMIN',
    summary: `Updated admin user ${user.email} (role=${user.role}, disabled=${!!user.disabled})`,
  });

  res.json({ success: true, data: publicAdminUser(user) });
});

export default router;
