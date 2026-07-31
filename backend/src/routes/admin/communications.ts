// ──────────────────────────────────────────
// Admin: Communications (email campaigns) — CRUD + test/schedule/send/cancel
//
// NOTE: campaign sends are synchronous (looped over matching subscribers with
// a hard cap) rather than queued through SQS/EventBridge. This is a
// deliberate scope simplification for this delivery — see the final report's
// "known limitations" section for the recommended follow-up (SQS worker +
// EventBridge Scheduler for true async, resumable, rate-limited sends).
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../../store';
import { AuthRequest, authenticate, requireAdmin } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { CampaignEntity, SubscriberEntity, BookingEntity, EventEntity } from '../../types';
import { sendCampaignEmail } from '../../services/email';

const router = Router();
router.use(authenticate, requireAdmin);

const MAX_SYNC_RECIPIENTS = 500; // safety cap for synchronous sends

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();

async function resolveAudience(campaign: CampaignEntity): Promise<SubscriberEntity[]> {
  const filters = campaign.audienceFilters || {};
  const allSubscribers = await db.getAll<SubscriberEntity>('subscribers');
  const subscribed = allSubscribers.filter((s) => s.status === 'SUBSCRIBED');

  switch (campaign.audienceType) {
    case 'ALL_SUBSCRIBERS':
      return subscribed;
    case 'CATEGORY_SUBSCRIBERS':
      return subscribed.filter((s) => s.categories?.includes(filters.category as any));
    case 'CITY_SUBSCRIBERS':
      return subscribed.filter((s) => s.city?.toLowerCase() === String(filters.city).toLowerCase());
    case 'EVENT_ATTENDEES':
    case 'PAST_ATTENDEES': {
      const eventId = filters.eventId as string;
      if (!eventId) return [];
      const bookings = (await db.filterBy<BookingEntity>('bookings', 'eventId', eventId)).filter(
        (b) => b.bookingStatus === 'CONFIRMED',
      );
      const emails = new Set(bookings.map((b) => b.normalizedBuyerEmail));
      return Array.from(emails).map((email) => {
        const b = bookings.find((bk) => bk.normalizedBuyerEmail === email)!;
        return {
          id: `attendee-${email}`,
          email: b.buyerEmail,
          normalizedEmail: email,
          fullName: b.buyerName,
          status: 'SUBSCRIBED',
          source: 'CHECKOUT',
          consentTextVersion: '1.0',
          subscribedAt: b.created_at,
          created_at: b.created_at,
          updated_at: b.created_at,
        } as SubscriberEntity;
      });
    }
    default:
      return [];
  }
}

// GET /api/admin/communications
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  const campaigns = await db.getAll<CampaignEntity>('campaigns');
  campaigns.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json({ success: true, data: campaigns });
});

// POST /api/admin/communications
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, content, audienceType, audienceFilters } = req.body;
  if (!name || !content?.subject || !content?.heading || !content?.body || !audienceType) {
    res.status(400).json({ success: false, error: 'name, content (subject/heading/body), and audienceType are required' });
    return;
  }
  const now = new Date().toISOString();
  const campaign: CampaignEntity = {
    id: `campaign-${uuid()}`,
    name,
    subject: content.subject,
    preheader: content.preheader,
    content,
    audienceType,
    audienceFilters,
    status: 'DRAFT',
    createdBy: req.user!.id,
    created_at: now,
    updated_at: now,
  };
  await db.put('campaigns', campaign);
  auditLog(req.user!.id, 'CREATE_CAMPAIGN', 'CAMPAIGN', campaign.id, { actorRole: req.user!.role as any, summary: `Created campaign "${name}"` });
  res.status(201).json({ success: true, data: campaign });
});

// GET /api/admin/communications/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const campaign = await db.get<CampaignEntity>('campaigns', req.params.id);
  if (!campaign) {
    res.status(404).json({ success: false, error: 'Campaign not found' });
    return;
  }
  res.json({ success: true, data: campaign });
});

// PATCH /api/admin/communications/:id — only while DRAFT
router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const campaign = await db.get<CampaignEntity>('campaigns', req.params.id);
  if (!campaign) {
    res.status(404).json({ success: false, error: 'Campaign not found' });
    return;
  }
  if (campaign.status !== 'DRAFT') {
    res.status(409).json({ success: false, error: 'Only draft campaigns can be edited' });
    return;
  }
  const { name, content, audienceType, audienceFilters } = req.body;
  if (name !== undefined) campaign.name = name;
  if (content !== undefined) {
    campaign.content = content;
    campaign.subject = content.subject;
    campaign.preheader = content.preheader;
  }
  if (audienceType !== undefined) campaign.audienceType = audienceType;
  if (audienceFilters !== undefined) campaign.audienceFilters = audienceFilters;
  campaign.updated_at = new Date().toISOString();
  await db.put('campaigns', campaign);
  res.json({ success: true, data: campaign });
});

// DELETE /api/admin/communications/:id — only while DRAFT
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const campaign = await db.get<CampaignEntity>('campaigns', req.params.id);
  if (!campaign) {
    res.status(404).json({ success: false, error: 'Campaign not found' });
    return;
  }
  if (campaign.status !== 'DRAFT') {
    res.status(409).json({ success: false, error: 'Only draft campaigns can be deleted' });
    return;
  }
  await db.delete('campaigns', campaign.id);
  auditLog(req.user!.id, 'DELETE_CAMPAIGN', 'CAMPAIGN', campaign.id, { actorRole: req.user!.role as any, summary: `Deleted campaign "${campaign.name}"` });
  res.json({ success: true, message: 'Campaign deleted' });
});

// POST /api/admin/communications/:id/test — send a single test email
router.post('/:id/test', async (req: AuthRequest, res: Response): Promise<void> => {
  const campaign = await db.get<CampaignEntity>('campaigns', req.params.id);
  if (!campaign) {
    res.status(404).json({ success: false, error: 'Campaign not found' });
    return;
  }
  const to = req.body.email || req.user!.email;
  const unsubscribeUrl = `${FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(to)}`;
  await sendCampaignEmail(to, campaign.content, unsubscribeUrl);
  res.json({ success: true, message: `Test email sent to ${to}` });
});

// POST /api/admin/communications/:id/schedule — mark for future sending
router.post('/:id/schedule', async (req: AuthRequest, res: Response): Promise<void> => {
  const campaign = await db.get<CampaignEntity>('campaigns', req.params.id);
  if (!campaign || campaign.status !== 'DRAFT') {
    res.status(409).json({ success: false, error: 'Only draft campaigns can be scheduled' });
    return;
  }
  const { scheduledAt } = req.body;
  if (!scheduledAt || new Date(scheduledAt).getTime() < Date.now()) {
    res.status(400).json({ success: false, error: 'scheduledAt must be a valid future date' });
    return;
  }
  campaign.status = 'SCHEDULED';
  campaign.scheduledAt = scheduledAt;
  campaign.updated_at = new Date().toISOString();
  await db.put('campaigns', campaign);
  auditLog(req.user!.id, 'SCHEDULE_CAMPAIGN', 'CAMPAIGN', campaign.id, { actorRole: req.user!.role as any, summary: `Scheduled "${campaign.name}" for ${scheduledAt}` });
  res.json({
    success: true,
    data: campaign,
    note: 'No background scheduler is wired up in this deployment — trigger the send via POST /:id/send at or after the scheduled time.',
  });
});

// POST /api/admin/communications/:id/send — resolve audience and send now (synchronous, capped)
router.post('/:id/send', async (req: AuthRequest, res: Response): Promise<void> => {
  const campaign = await db.get<CampaignEntity>('campaigns', req.params.id);
  if (!campaign || !['DRAFT', 'SCHEDULED'].includes(campaign.status)) {
    res.status(409).json({ success: false, error: 'Only draft or scheduled campaigns can be sent' });
    return;
  }

  campaign.status = 'SENDING';
  await db.put('campaigns', campaign);

  const audience = (await resolveAudience(campaign)).slice(0, MAX_SYNC_RECIPIENTS);
  let delivered = 0;
  for (const subscriber of audience) {
    const unsubscribeUrl = `${FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(subscriber.email)}`;
    const ok = await sendCampaignEmail(subscriber.email, campaign.content, unsubscribeUrl).catch(() => false);
    if (ok) delivered++;
  }

  campaign.status = 'SENT';
  campaign.sentAt = new Date().toISOString();
  campaign.recipientCount = audience.length;
  campaign.deliveredCount = delivered;
  campaign.updated_at = campaign.sentAt;
  await db.put('campaigns', campaign);

  auditLog(req.user!.id, 'SEND_CAMPAIGN', 'CAMPAIGN', campaign.id, {
    actorRole: req.user!.role as any,
    summary: `Sent "${campaign.name}" to ${delivered}/${audience.length} recipient(s)`,
  });

  res.json({ success: true, data: campaign });
});

// POST /api/admin/communications/:id/cancel — cancel a scheduled (not yet sent) campaign
router.post('/:id/cancel', async (req: AuthRequest, res: Response): Promise<void> => {
  const campaign = await db.get<CampaignEntity>('campaigns', req.params.id);
  if (!campaign || campaign.status !== 'SCHEDULED') {
    res.status(409).json({ success: false, error: 'Only scheduled campaigns can be cancelled' });
    return;
  }
  campaign.status = 'CANCELLED';
  campaign.updated_at = new Date().toISOString();
  await db.put('campaigns', campaign);
  auditLog(req.user!.id, 'CANCEL_CAMPAIGN', 'CAMPAIGN', campaign.id, { actorRole: req.user!.role as any, summary: `Cancelled campaign "${campaign.name}"` });
  res.json({ success: true, data: campaign });
});

export default router;
