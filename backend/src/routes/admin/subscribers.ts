// ──────────────────────────────────────────
// Admin: Subscribers — list/search newsletter subscribers
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { db } from '../../store';
import { AuthRequest, authenticate, requireAdmin } from '../../middleware/auth';
import { SubscriberEntity } from '../../types';

const router = Router();
router.use(authenticate, requireAdmin);

// GET /api/admin/subscribers?status=&q=
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, q } = req.query as Record<string, string>;
  let subscribers = await db.getAll<SubscriberEntity>('subscribers');

  if (status) subscribers = subscribers.filter((s) => s.status === status);
  if (q) {
    const needle = q.toLowerCase();
    subscribers = subscribers.filter(
      (s) =>
        s.email.toLowerCase().includes(needle) ||
        (s.fullName && s.fullName.toLowerCase().includes(needle)),
    );
  }

  subscribers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const counts = {
    total: subscribers.length,
    subscribed: subscribers.filter((s) => s.status === 'SUBSCRIBED').length,
    unsubscribed: subscribers.filter((s) => s.status === 'UNSUBSCRIBED').length,
    bounced: subscribers.filter((s) => s.status === 'BOUNCED').length,
  };

  res.json({ success: true, data: subscribers, meta: counts });
});

export default router;
