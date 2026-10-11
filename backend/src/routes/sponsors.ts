// ──────────────────────────────────────────
// Public sponsors — site-wide "Our Sponsors" for the landing page.
// Event-specific sponsors are returned inside GET /api/events/:slug.
// GET /api/sponsors
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { db } from '../store';
import { SponsorEntity } from '../types';
import { toPublicSponsor } from '../services/sponsor-validation';

const router = Router();

router.get('/', async (_req, res: Response): Promise<void> => {
  const sponsors = (await db.getAll<SponsorEntity>('sponsors'))
    .filter((s) => s.scope === 'SITE' && s.active)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.created_at.localeCompare(b.created_at));
  res.json({ success: true, data: sponsors.map(toPublicSponsor) });
});

export default router;
