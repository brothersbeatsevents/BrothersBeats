// ──────────────────────────────────────────
// Public Event Routes
// GET /api/events            — list published events (search/filter)
// GET /api/events/:slug      — event detail + visible ticket tiers
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { db } from '../store';
import { EventEntity, TicketTierEntity } from '../types';

const router = Router();

function availability(event: EventEntity) {
  const available = Math.max(
    0,
    event.capacity - event.totalTicketsSold - event.totalTicketsReserved,
  );
  const percentSold = event.capacity > 0 ? event.totalTicketsSold / event.capacity : 0;
  let badge: string | null = null;
  if (event.status === 'CANCELLED') badge = 'CANCELLED';
  else if (available <= 0) badge = 'SOLD_OUT';
  else if (percentSold >= 0.85) badge = 'SELLING_FAST';
  return { available, badge };
}

function publicEventSummary(event: EventEntity) {
  const { available, badge } = availability(event);
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    category: event.category,
    shortDescription: event.shortDescription,
    status: event.status,
    city: event.city,
    venueName: event.venueName,
    startDateTime: event.startDateTime,
    endDateTime: event.endDateTime,
    timezone: event.timezone,
    heroImageUrl: event.heroImageUrl,
    availableTickets: available,
    badge,
  };
}

// GET /api/events — list published + publicly visible events
router.get('/', async (req, res: Response): Promise<void> => {
  const { category, city, q, sort } = req.query as Record<string, string>;

  let events = (await db.getAll<EventEntity>('events')).filter(
    (e) =>
      e.visibility === 'PUBLIC' &&
      ['PUBLISHED', 'SALES_PAUSED', 'SOLD_OUT', 'CANCELLED', 'COMPLETED'].includes(
        e.status,
      ),
  );

  if (category) events = events.filter((e) => e.category === category);
  if (city) events = events.filter((e) => e.city.toLowerCase() === city.toLowerCase());
  if (q) {
    const needle = q.toLowerCase();
    events = events.filter(
      (e) =>
        e.title.toLowerCase().includes(needle) ||
        e.venueName.toLowerCase().includes(needle) ||
        e.city.toLowerCase().includes(needle),
    );
  }

  if (sort === 'recent') {
    events.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  } else {
    events.sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
    );
  }

  res.json({ success: true, data: events.map(publicEventSummary) });
});

// GET /api/events/:slug — event detail (public) + visible active ticket tiers
router.get('/:slug', async (req, res: Response): Promise<void> => {
  const event = await db.findBy<EventEntity>('events', 'slug', req.params.slug);
  if (
    !event ||
    event.visibility === 'PRIVATE' ||
    event.status === 'DRAFT' ||
    event.status === 'ARCHIVED'
  ) {
    res.status(404).json({ success: false, error: 'Event not found' });
    return;
  }

  const tiers = (
    await db.filterBy<TicketTierEntity>('ticketTiers', 'eventId', event.id)
  )
    .filter((t) => t.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((t) => {
      const now = Date.now();
      const onSale =
        t.active &&
        new Date(t.salesStartAt).getTime() <= now &&
        new Date(t.salesEndAt).getTime() >= now;
      return {
        id: t.id,
        type: t.type,
        name: t.name,
        description: t.description,
        priceAmountMinor: t.priceAmountMinor,
        currency: t.currency,
        available: Math.max(0, t.maxQuantity - t.quantitySold - t.quantityReserved),
        minPerOrder: t.minPerOrder,
        maxPerOrder: t.maxPerOrder,
        groupMinSize: t.groupMinSize,
        onSale,
        salesStartAt: t.salesStartAt,
        salesEndAt: t.salesEndAt,
      };
    });

  const { available, badge } = availability(event);

  res.json({
    success: true,
    data: {
      id: event.id,
      slug: event.slug,
      title: event.title,
      category: event.category,
      shortDescription: event.shortDescription,
      longDescription: event.longDescription,
      status: event.status,
      venueName: event.venueName,
      venueAddress: event.venueAddress,
      city: event.city,
      countyOrRegion: event.countyOrRegion,
      country: event.country,
      mapUrl: event.mapUrl,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      doorsOpenAt: event.doorsOpenAt,
      timezone: event.timezone,
      heroImageUrl: event.heroImageUrl,
      galleryImageUrls: event.galleryImageUrls,
      socialImageUrl: event.socialImageUrl,
      seoTitle: event.seoTitle,
      seoDescription: event.seoDescription,
      refundPolicy: event.refundPolicy,
      termsAndConditions: event.termsAndConditions,
      supportEmail: event.supportEmail,
      collectAttendeeNames: event.collectAttendeeNames,
      collectAttendeeEmails: event.collectAttendeeEmails,
      collectBuyerPhone: event.collectBuyerPhone,
      allowGuestCheckout: event.allowGuestCheckout,
      perOrderLimit: event.perOrderLimit,
      availableTickets: available,
      badge,
      cancellationMessage:
        event.status === 'CANCELLED' ? event.cancellationMessage : undefined,
      ticketTiers: tiers,
    },
  });
});

export default router;
