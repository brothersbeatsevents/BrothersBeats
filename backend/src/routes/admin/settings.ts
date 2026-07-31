// ──────────────────────────────────────────
// Admin: Organization Settings (single record)
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { db } from '../../store';
import { AuthRequest, authenticate, requireAdmin } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { OrgSettings } from '../../types';

const router = Router();
router.use(authenticate, requireAdmin);

const SETTINGS_ID = 'org-settings';

async function getOrCreateSettings(): Promise<OrgSettings> {
  const existing = await db.get<OrgSettings>('orgSettings', SETTINGS_ID);
  if (existing) return existing;
  const defaults: OrgSettings = {
    id: SETTINGS_ID,
    organizationName: 'Brothers Beats Events',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@brothersbeats.events',
    defaultCurrency: 'EUR',
    defaultTimezone: 'Europe/Dublin',
    updated_at: new Date().toISOString(),
  };
  await db.put('orgSettings', defaults);
  return defaults;
}

// GET /api/admin/settings
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json({ success: true, data: settings });
});

// PUT /api/admin/settings
router.put('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const settings = await getOrCreateSettings();
  const fields = [
    'organizationName', 'supportEmail', 'defaultCurrency', 'defaultTimezone',
    'defaultRefundPolicy', 'defaultTermsAndConditions', 'socialLinks',
  ] as const;
  for (const field of fields) {
    if (req.body[field] !== undefined) (settings as any)[field] = req.body[field];
  }
  settings.updated_at = new Date().toISOString();
  settings.updatedBy = req.user!.id;
  await db.put('orgSettings', settings);
  auditLog(req.user!.id, 'UPDATE_ORG_SETTINGS', 'ORG_SETTINGS', settings.id, {
    actorRole: req.user!.role as any,
    summary: 'Updated organization settings',
  });
  res.json({ success: true, data: settings });
});

export default router;
