// ──────────────────────────────────────────
// Public: Organization Settings (read-only, public-safe subset)
// ──────────────────────────────────────────

import { Router, Request, Response } from 'express';
import { db } from '../store';
import { OrgSettings } from '../types';

const router = Router();

// GET /api/settings — public subset used to render the marketing site
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const settings = await db.get<OrgSettings>('orgSettings', 'org-settings');
  res.json({
    success: true,
    data: {
      organizationName: settings?.organizationName || 'Brothers Beats Events',
      heroImageUrl: settings?.heroImageUrl || null,
    },
  });
});

export default router;
