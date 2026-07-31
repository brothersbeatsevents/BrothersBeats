// ──────────────────────────────────────────
// Admin: Audit Log — read-only view of sensitive actions
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { db } from '../../store';
import { AuthRequest, authenticate, requireAdmin } from '../../middleware/auth';
import { AuditLogEntity } from '../../types';

const router = Router();
router.use(authenticate, requireAdmin);

// GET /api/admin/audit-log — filterable, most-recent-first
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { entityType, actorUserId, action, eventId, bookingId, limit } = req.query as Record<string, string>;
  let logs = await db.getAll<AuditLogEntity>('auditLogs');

  if (entityType) logs = logs.filter((l) => l.entityType === entityType);
  if (actorUserId) logs = logs.filter((l) => l.actorUserId === actorUserId);
  if (action) logs = logs.filter((l) => l.action.toLowerCase().includes(action.toLowerCase()));
  if (eventId) logs = logs.filter((l) => l.eventId === eventId);
  if (bookingId) logs = logs.filter((l) => l.bookingId === bookingId);

  logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const max = Math.min(Number(limit) || 100, 500);
  res.json({ success: true, data: logs.slice(0, max) });
});

export default router;
