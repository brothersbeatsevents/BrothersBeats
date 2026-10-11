// ──────────────────────────────────────────
// Admin: Sponsors — logo + optional text.
// scope SITE  → "Our Sponsors" on the landing page
// scope EVENT → shown only on that event's page
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../../store';
import { AuthRequest, authenticate, requireAdmin } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { SponsorEntity, EventEntity } from '../../types';
import { validateSponsorInput } from '../../services/sponsor-validation';

const router = Router();
router.use(authenticate, requireAdmin);

const orEmpty = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

// GET /api/admin/sponsors?scope=SITE|EVENT&eventId=
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { scope, eventId } = req.query as Record<string, string>;
  let items = await db.getAll<SponsorEntity>('sponsors');
  if (scope === 'SITE' || scope === 'EVENT') items = items.filter((s) => s.scope === scope);
  if (eventId) items = items.filter((s) => s.eventId === eventId);
  items.sort((a, b) => a.sortOrder - b.sortOrder || a.created_at.localeCompare(b.created_at));
  res.json({ success: true, data: items });
});

// POST /api/admin/sponsors
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { scope, eventId, name, logoUrl, logoS3Key, websiteUrl, description, active, sortOrder } = req.body;

  if (scope !== 'SITE' && scope !== 'EVENT') {
    res.status(400).json({ success: false, error: 'scope must be SITE or EVENT' });
    return;
  }
  if (scope === 'EVENT') {
    const event = eventId ? await db.get<EventEntity>('events', eventId) : null;
    if (!event) {
      res.status(400).json({ success: false, error: 'A valid eventId is required for an event sponsor' });
      return;
    }
  }
  const invalid = validateSponsorInput(req.body, true);
  if (invalid) {
    res.status(400).json({ success: false, error: invalid });
    return;
  }

  const now = new Date().toISOString();
  const sponsor: SponsorEntity = {
    id: `sponsor-${uuid()}`,
    scope,
    eventId: scope === 'EVENT' ? eventId : undefined,
    name: name.trim(),
    logoUrl,
    logoS3Key: orEmpty(logoS3Key),
    websiteUrl: orEmpty(websiteUrl),
    description: orEmpty(description),
    active: active !== false,
    sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
    createdBy: req.user!.id,
    updatedBy: req.user!.id,
    created_at: now,
    updated_at: now,
  };
  await db.put('sponsors', sponsor);

  auditLog(req.user!.id, 'CREATE_SPONSOR', 'SPONSOR', sponsor.id, {
    actorRole: req.user!.role as any,
    eventId: sponsor.eventId,
    summary: `Added ${scope === 'SITE' ? 'site' : 'event'} sponsor "${sponsor.name}"`,
  });
  res.status(201).json({ success: true, data: sponsor });
});

// PATCH /api/admin/sponsors/:id — scope/event are fixed after creation
router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const sponsor = await db.get<SponsorEntity>('sponsors', req.params.id);
  if (!sponsor) {
    res.status(404).json({ success: false, error: 'Sponsor not found' });
    return;
  }
  const invalid = validateSponsorInput(req.body, false);
  if (invalid) {
    res.status(400).json({ success: false, error: invalid });
    return;
  }

  const { name, logoUrl, logoS3Key, websiteUrl, description, active, sortOrder } = req.body;
  if (name !== undefined) sponsor.name = name.trim();
  if (logoUrl !== undefined) {
    sponsor.logoUrl = logoUrl;
    sponsor.logoS3Key = orEmpty(logoS3Key);
  }
  if (websiteUrl !== undefined) sponsor.websiteUrl = orEmpty(websiteUrl);
  if (description !== undefined) sponsor.description = orEmpty(description);
  if (typeof active === 'boolean') sponsor.active = active;
  if (typeof sortOrder === 'number') sponsor.sortOrder = sortOrder;

  sponsor.updatedBy = req.user!.id;
  sponsor.updated_at = new Date().toISOString();
  await db.put('sponsors', sponsor);

  auditLog(req.user!.id, 'UPDATE_SPONSOR', 'SPONSOR', sponsor.id, {
    actorRole: req.user!.role as any,
    eventId: sponsor.eventId,
    summary: `Updated sponsor "${sponsor.name}"`,
  });
  res.json({ success: true, data: sponsor });
});

// DELETE /api/admin/sponsors/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const sponsor = await db.get<SponsorEntity>('sponsors', req.params.id);
  if (!sponsor) {
    res.status(404).json({ success: false, error: 'Sponsor not found' });
    return;
  }
  await db.delete('sponsors', sponsor.id);

  auditLog(req.user!.id, 'DELETE_SPONSOR', 'SPONSOR', sponsor.id, {
    actorRole: req.user!.role as any,
    eventId: sponsor.eventId,
    summary: `Deleted sponsor "${sponsor.name}"`,
  });
  res.json({ success: true, message: 'Sponsor deleted' });
});

export default router;
