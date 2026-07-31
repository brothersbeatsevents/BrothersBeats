// ──────────────────────────────────────────
// Admin: Events + nested Ticket Tiers CRUD and lifecycle management
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../../store';
import { AuthRequest, authenticate, requireAdmin } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { EventEntity, TicketTierEntity, BookingEntity } from '../../types';
import { sendEventUpdated, sendEventCancelled } from '../../services/email';

const router = Router();
router.use(authenticate, requireAdmin);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function ensureUniqueSlug(base: string): Promise<string> {
  const root = base || 'event';
  let slug = root;
  let suffix = 0;
  while (await db.findBy<EventEntity>('events', 'slug', slug)) {
    suffix += 1;
    slug = `${root}-${suffix}`;
  }
  return slug;
}

// GET /api/admin/events — list all events regardless of status
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  const events = await db.getAll<EventEntity>('events');
  events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json({ success: true, data: events });
});

// POST /api/admin/events — create a new draft event
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body;
  if (!body.title || !body.venueName || !body.city || !body.startDateTime || !body.endDateTime || !body.capacity) {
    res.status(400).json({
      success: false,
      error: 'title, venueName, city, startDateTime, endDateTime, and capacity are required',
    });
    return;
  }

  const now = new Date().toISOString();
  const event: EventEntity = {
    id: `event-${uuid()}`,
    slug: await ensureUniqueSlug(slugify(body.title)),
    title: body.title,
    category: body.category || 'OTHER',
    shortDescription: body.shortDescription || '',
    longDescription: body.longDescription || '',
    status: 'DRAFT',
    visibility: body.visibility || 'PUBLIC',

    venueName: body.venueName,
    venueAddress: body.venueAddress,
    city: body.city,
    countyOrRegion: body.countyOrRegion,
    country: body.country || 'Ireland',
    postalCode: body.postalCode,
    mapUrl: body.mapUrl,

    startDateTime: body.startDateTime,
    endDateTime: body.endDateTime,
    doorsOpenAt: body.doorsOpenAt,
    timezone: body.timezone || 'Europe/Dublin',

    capacity: Number(body.capacity),
    totalTicketsSold: 0,
    totalTicketsReserved: 0,
    perOrderLimit: Number(body.perOrderLimit) || 10,

    heroImageUrl: body.heroImageUrl,
    galleryImageUrls: body.galleryImageUrls,
    socialImageUrl: body.socialImageUrl,

    seoTitle: body.seoTitle,
    seoDescription: body.seoDescription,

    refundPolicy: body.refundPolicy,
    termsAndConditions: body.termsAndConditions,
    supportEmail: body.supportEmail,

    collectAttendeeNames: body.collectAttendeeNames ?? true,
    collectAttendeeEmails: body.collectAttendeeEmails ?? false,
    collectBuyerPhone: body.collectBuyerPhone ?? false,
    allowGuestCheckout: body.allowGuestCheckout ?? true,

    reminderScheduleHours: body.reminderScheduleHours || [168, 24],
    returnInventoryOnRefund: body.returnInventoryOnRefund ?? true,

    createdBy: req.user!.id,
    updatedBy: req.user!.id,
    created_at: now,
    updated_at: now,
  };

  await db.put('events', event);
  auditLog(req.user!.id, 'CREATE_EVENT', 'EVENT', event.id, {
    actorRole: req.user!.role as 'ADMIN' | 'SUPER_ADMIN',
    eventId: event.id,
    summary: `Created event "${event.title}"`,
  });

  res.status(201).json({ success: true, data: event });
});

// GET /api/admin/events/:id — detail + ticket tiers
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const event = await db.get<EventEntity>('events', req.params.id);
  if (!event) {
    res.status(404).json({ success: false, error: 'Event not found' });
    return;
  }
  const tiers = (await db.filterBy<TicketTierEntity>('ticketTiers', 'eventId', event.id)).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  res.json({ success: true, data: { ...event, ticketTiers: tiers } });
});

const EDITABLE_FIELDS = [
  'title', 'category', 'shortDescription', 'longDescription', 'visibility',
  'venueName', 'venueAddress', 'city', 'countyOrRegion', 'country', 'postalCode', 'mapUrl',
  'startDateTime', 'endDateTime', 'doorsOpenAt', 'timezone', 'capacity', 'perOrderLimit',
  'heroImageUrl', 'galleryImageUrls', 'socialImageUrl', 'seoTitle', 'seoDescription',
  'refundPolicy', 'termsAndConditions', 'supportEmail', 'collectAttendeeNames',
  'collectAttendeeEmails', 'collectBuyerPhone', 'allowGuestCheckout', 'reminderScheduleHours',
  'returnInventoryOnRefund',
] as const;

// PATCH /api/admin/events/:id — update event fields
router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const event = await db.get<EventEntity>('events', req.params.id);
  if (!event) {
    res.status(404).json({ success: false, error: 'Event not found' });
    return;
  }

  const hasSales = event.totalTicketsSold > 0 || event.totalTicketsReserved > 0;
  const majorChangeFields = ['startDateTime', 'endDateTime', 'venueName', 'city'];
  let majorChanged = false;

  for (const field of EDITABLE_FIELDS) {
    if (req.body[field] !== undefined) {
      if (majorChangeFields.includes(field) && hasSales && req.body[field] !== (event as any)[field]) {
        majorChanged = true;
      }
      (event as any)[field] = req.body[field];
    }
  }
  if (req.body.title !== undefined) {
    event.slug = await ensureUniqueSlugIfChanged(event, req.body.title);
  }

  event.updatedBy = req.user!.id;
  event.updated_at = new Date().toISOString();
  await db.put('events', event);

  auditLog(req.user!.id, 'UPDATE_EVENT', 'EVENT', event.id, {
    actorRole: req.user!.role as 'ADMIN' | 'SUPER_ADMIN',
    eventId: event.id,
    summary: `Updated event "${event.title}"`,
  });

  // Notify existing confirmed bookers of major changes (date/venue/city)
  if (majorChanged) {
    const bookings = (await db.filterBy<BookingEntity>('bookings', 'eventId', event.id)).filter(
      (b) => b.bookingStatus === 'CONFIRMED',
    );
    await Promise.all(
      bookings.map((b) =>
        sendEventUpdated(
          b.buyerEmail,
          b.buyerName,
          { title: event.title, startDateTime: event.startDateTime, venueName: event.venueName, city: event.city, timezone: event.timezone, slug: event.slug },
          b.bookingReference,
          'The date, time, or venue for this event has changed. Please review the updated details below.',
        ).catch((err) => console.error('[Admin] sendEventUpdated failed:', err)),
      ),
    );
  }

  res.json({ success: true, data: event });
});

async function ensureUniqueSlugIfChanged(event: EventEntity, newTitle: string): Promise<string> {
  const newSlugBase = slugify(newTitle);
  if (slugify(event.title) === newSlugBase) return event.slug;
  let slug = newSlugBase || 'event';
  let suffix = 0;
  while (true) {
    const existing = await db.findBy<EventEntity>('events', 'slug', slug);
    if (!existing || existing.id === event.id) return slug;
    suffix += 1;
    slug = `${newSlugBase}-${suffix}`;
  }
}

// DELETE /api/admin/events/:id — only permitted while still a draft with no ticket tiers sold
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const event = await db.get<EventEntity>('events', req.params.id);
  if (!event) {
    res.status(404).json({ success: false, error: 'Event not found' });
    return;
  }
  if (event.status !== 'DRAFT') {
    res.status(409).json({ success: false, error: 'Only draft events can be deleted. Cancel it instead.' });
    return;
  }
  await db.delete('events', event.id);
  auditLog(req.user!.id, 'DELETE_EVENT', 'EVENT', event.id, {
    actorRole: req.user!.role as 'ADMIN' | 'SUPER_ADMIN',
    summary: `Deleted draft event "${event.title}"`,
  });
  res.json({ success: true, message: 'Event deleted' });
});

// ── Lifecycle transitions ──

router.post('/:id/publish', async (req: AuthRequest, res: Response): Promise<void> => {
  const event = await db.get<EventEntity>('events', req.params.id);
  if (!event) {
    res.status(404).json({ success: false, error: 'Event not found' });
    return;
  }
  if (!['DRAFT', 'SALES_PAUSED'].includes(event.status)) {
    res.status(409).json({ success: false, error: `Cannot publish an event with status ${event.status}` });
    return;
  }
  const tiers = await db.filterBy<TicketTierEntity>('ticketTiers', 'eventId', event.id);
  if (tiers.length === 0) {
    res.status(400).json({ success: false, error: 'Add at least one ticket type before publishing' });
    return;
  }
  event.status = 'PUBLISHED';
  event.publishedAt = event.publishedAt || new Date().toISOString();
  event.updated_at = new Date().toISOString();
  await db.put('events', event);
  auditLog(req.user!.id, 'PUBLISH_EVENT', 'EVENT', event.id, { actorRole: req.user!.role as any, summary: `Published "${event.title}"` });
  res.json({ success: true, data: event });
});

router.post('/:id/pause-sales', async (req: AuthRequest, res: Response): Promise<void> => {
  const event = await db.get<EventEntity>('events', req.params.id);
  if (!event || event.status !== 'PUBLISHED') {
    res.status(409).json({ success: false, error: 'Only a published event can have sales paused' });
    return;
  }
  event.status = 'SALES_PAUSED';
  event.updated_at = new Date().toISOString();
  await db.put('events', event);
  auditLog(req.user!.id, 'PAUSE_SALES', 'EVENT', event.id, { actorRole: req.user!.role as any, summary: `Paused sales for "${event.title}"` });
  res.json({ success: true, data: event });
});

router.post('/:id/resume-sales', async (req: AuthRequest, res: Response): Promise<void> => {
  const event = await db.get<EventEntity>('events', req.params.id);
  if (!event || event.status !== 'SALES_PAUSED') {
    res.status(409).json({ success: false, error: 'Only a paused event can have sales resumed' });
    return;
  }
  event.status = 'PUBLISHED';
  event.updated_at = new Date().toISOString();
  await db.put('events', event);
  auditLog(req.user!.id, 'RESUME_SALES', 'EVENT', event.id, { actorRole: req.user!.role as any, summary: `Resumed sales for "${event.title}"` });
  res.json({ success: true, data: event });
});

router.post('/:id/cancel', async (req: AuthRequest, res: Response): Promise<void> => {
  const { reason, message } = req.body;
  const event = await db.get<EventEntity>('events', req.params.id);
  if (!event || ['CANCELLED', 'COMPLETED', 'ARCHIVED'].includes(event.status)) {
    res.status(409).json({ success: false, error: 'This event cannot be cancelled' });
    return;
  }

  event.status = 'CANCELLED';
  event.cancellationReason = reason;
  event.cancellationMessage = message || 'This event has been cancelled by the organizer.';
  event.cancelledAt = new Date().toISOString();
  event.updated_at = event.cancelledAt;
  await db.put('events', event);

  const bookings = (await db.filterBy<BookingEntity>('bookings', 'eventId', event.id)).filter(
    (b) => b.bookingStatus === 'CONFIRMED',
  );
  await Promise.all(
    bookings.map((b) =>
      sendEventCancelled(b.buyerEmail, b.buyerName, event.title, event.cancellationMessage!, b.bookingReference).catch(
        (err) => console.error('[Admin] sendEventCancelled failed:', err),
      ),
    ),
  );

  auditLog(req.user!.id, 'CANCEL_EVENT', 'EVENT', event.id, {
    actorRole: req.user!.role as any,
    reason,
    summary: `Cancelled "${event.title}" — notified ${bookings.length} confirmed booking(s). Refunds must be issued via Admin > Refunds.`,
  });

  res.json({ success: true, data: event, notifiedBookings: bookings.length });
});

router.post('/:id/complete', async (req: AuthRequest, res: Response): Promise<void> => {
  const event = await db.get<EventEntity>('events', req.params.id);
  if (!event || event.status !== 'PUBLISHED') {
    res.status(409).json({ success: false, error: 'Only a published event can be marked complete' });
    return;
  }
  event.status = 'COMPLETED';
  event.updated_at = new Date().toISOString();
  await db.put('events', event);
  auditLog(req.user!.id, 'COMPLETE_EVENT', 'EVENT', event.id, { actorRole: req.user!.role as any, summary: `Marked "${event.title}" complete` });
  res.json({ success: true, data: event });
});

router.post('/:id/duplicate', async (req: AuthRequest, res: Response): Promise<void> => {
  const source = await db.get<EventEntity>('events', req.params.id);
  if (!source) {
    res.status(404).json({ success: false, error: 'Event not found' });
    return;
  }
  const now = new Date().toISOString();
  const copy: EventEntity = {
    ...source,
    id: `event-${uuid()}`,
    slug: await ensureUniqueSlug(slugify(`${source.title}-copy`)),
    title: `${source.title} (Copy)`,
    status: 'DRAFT',
    totalTicketsSold: 0,
    totalTicketsReserved: 0,
    publishedAt: undefined,
    cancelledAt: undefined,
    cancellationReason: undefined,
    cancellationMessage: undefined,
    createdBy: req.user!.id,
    updatedBy: req.user!.id,
    created_at: now,
    updated_at: now,
  };
  await db.put('events', copy);

  const sourceTiers = await db.filterBy<TicketTierEntity>('ticketTiers', 'eventId', source.id);
  for (const tier of sourceTiers) {
    const tierCopy: TicketTierEntity = {
      ...tier,
      id: `tier-${uuid()}`,
      eventId: copy.id,
      quantitySold: 0,
      quantityReserved: 0,
      created_at: now,
      updated_at: now,
    };
    await db.put('ticketTiers', tierCopy);
  }

  auditLog(req.user!.id, 'DUPLICATE_EVENT', 'EVENT', copy.id, { actorRole: req.user!.role as any, summary: `Duplicated "${source.title}"` });
  res.status(201).json({ success: true, data: copy });
});

// ── Nested Ticket Tiers ──

router.get('/:id/ticket-tiers', async (req: AuthRequest, res: Response): Promise<void> => {
  const tiers = (await db.filterBy<TicketTierEntity>('ticketTiers', 'eventId', req.params.id)).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  res.json({ success: true, data: tiers });
});

router.post('/:id/ticket-tiers', async (req: AuthRequest, res: Response): Promise<void> => {
  const event = await db.get<EventEntity>('events', req.params.id);
  if (!event) {
    res.status(404).json({ success: false, error: 'Event not found' });
    return;
  }
  const body = req.body;
  if (!body.name || body.priceAmountMinor === undefined || !body.maxQuantity || !body.salesStartAt || !body.salesEndAt) {
    res.status(400).json({
      success: false,
      error: 'name, priceAmountMinor, maxQuantity, salesStartAt, and salesEndAt are required',
    });
    return;
  }

  const now = new Date().toISOString();
  const existingTiers = await db.filterBy<TicketTierEntity>('ticketTiers', 'eventId', event.id);
  const tier: TicketTierEntity = {
    id: `tier-${uuid()}`,
    eventId: event.id,
    type: body.type || 'STANDARD',
    name: body.name,
    description: body.description,
    priceAmountMinor: Number(body.priceAmountMinor),
    currency: body.currency || 'EUR',
    salesStartAt: body.salesStartAt,
    salesEndAt: body.salesEndAt,
    maxQuantity: Number(body.maxQuantity),
    quantitySold: 0,
    quantityReserved: 0,
    minPerOrder: Number(body.minPerOrder) || 1,
    maxPerOrder: Number(body.maxPerOrder) || 10,
    groupMinSize: body.groupMinSize ? Number(body.groupMinSize) : undefined,
    visible: body.visible ?? true,
    active: body.active ?? true,
    sortOrder: body.sortOrder ?? existingTiers.length,
    created_at: now,
    updated_at: now,
  };
  await db.put('ticketTiers', tier);
  auditLog(req.user!.id, 'CREATE_TICKET_TIER', 'TICKET_TIER', tier.id, {
    actorRole: req.user!.role as any,
    eventId: event.id,
    summary: `Added ticket type "${tier.name}" to "${event.title}"`,
  });
  res.status(201).json({ success: true, data: tier });
});

router.patch('/:id/ticket-tiers/:tierId', async (req: AuthRequest, res: Response): Promise<void> => {
  const tier = await db.get<TicketTierEntity>('ticketTiers', req.params.tierId);
  if (!tier || tier.eventId !== req.params.id) {
    res.status(404).json({ success: false, error: 'Ticket type not found' });
    return;
  }
  const fields = ['name', 'description', 'priceAmountMinor', 'currency', 'salesStartAt', 'salesEndAt',
    'maxQuantity', 'minPerOrder', 'maxPerOrder', 'groupMinSize', 'visible', 'active', 'sortOrder', 'type'] as const;
  for (const field of fields) {
    if (req.body[field] !== undefined) (tier as any)[field] = req.body[field];
  }
  if (tier.maxQuantity < tier.quantitySold + tier.quantityReserved) {
    res.status(400).json({ success: false, error: 'maxQuantity cannot be less than tickets already sold/reserved' });
    return;
  }
  tier.updated_at = new Date().toISOString();
  await db.put('ticketTiers', tier);
  auditLog(req.user!.id, 'UPDATE_TICKET_TIER', 'TICKET_TIER', tier.id, { actorRole: req.user!.role as any, eventId: tier.eventId, summary: `Updated ticket type "${tier.name}"` });
  res.json({ success: true, data: tier });
});

router.delete('/:id/ticket-tiers/:tierId', async (req: AuthRequest, res: Response): Promise<void> => {
  const tier = await db.get<TicketTierEntity>('ticketTiers', req.params.tierId);
  if (!tier || tier.eventId !== req.params.id) {
    res.status(404).json({ success: false, error: 'Ticket type not found' });
    return;
  }
  if (tier.quantitySold > 0 || tier.quantityReserved > 0) {
    res.status(409).json({ success: false, error: 'Cannot delete a ticket type with sales or reservations. Hide it instead.' });
    return;
  }
  await db.delete('ticketTiers', tier.id);
  auditLog(req.user!.id, 'DELETE_TICKET_TIER', 'TICKET_TIER', tier.id, { actorRole: req.user!.role as any, eventId: tier.eventId, summary: `Deleted ticket type "${tier.name}"` });
  res.json({ success: true, message: 'Ticket type deleted' });
});

export default router;
