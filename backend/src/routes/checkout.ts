// ──────────────────────────────────────────
// POST /api/checkout/session — reserve inventory + create a Stripe Checkout Session
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../store';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { EventEntity, TicketTierEntity, BookingEntity, BookingAttendee } from '../types';
import { reserveInventory, releaseInventory, expireStaleReservations, InventoryError } from '../services/inventory';
import { createCheckoutSession } from '../services/stripe';

const router = Router();

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')[0]
  .trim();

function generateBookingReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let ref = 'BBE-';
  for (let i = 0; i < 8; i++) ref += alphabet[Math.floor(Math.random() * alphabet.length)];
  return ref;
}

router.post('/session', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    eventId,
    ticketTierId,
    quantity,
    buyerName,
    buyerEmail,
    buyerPhone,
    attendees,
    marketingConsent,
  } = req.body;
  const qty = Number(quantity);

  if (!eventId || !ticketTierId || !Number.isInteger(qty) || qty < 1 || !buyerName || !buyerEmail) {
    res.status(400).json({
      success: false,
      error: 'eventId, ticketTierId, quantity, buyerName, and buyerEmail are required',
    });
    return;
  }

  const event = await db.get<EventEntity>('events', eventId);
  if (!event || event.visibility === 'PRIVATE') {
    res.status(404).json({ success: false, error: 'Event not found' });
    return;
  }
  if (!req.user && !event.allowGuestCheckout) {
    res.status(401).json({ success: false, error: 'Please sign in to purchase tickets for this event' });
    return;
  }
  if (event.status !== 'PUBLISHED') {
    res.status(409).json({ success: false, error: 'Tickets are not currently on sale for this event' });
    return;
  }

  const tier = await db.get<TicketTierEntity>('ticketTiers', ticketTierId);
  if (!tier || tier.eventId !== eventId || !tier.visible) {
    res.status(404).json({ success: false, error: 'Ticket type not found' });
    return;
  }
  const now = Date.now();
  if (!tier.active || new Date(tier.salesStartAt).getTime() > now || new Date(tier.salesEndAt).getTime() < now) {
    res.status(409).json({ success: false, error: 'This ticket type is not currently on sale' });
    return;
  }
  if (qty < tier.minPerOrder || qty > tier.maxPerOrder || qty > event.perOrderLimit) {
    res.status(400).json({ success: false, error: 'Invalid ticket quantity for this order' });
    return;
  }
  if (tier.type === 'GROUP' && tier.groupMinSize && qty < tier.groupMinSize) {
    res.status(400).json({
      success: false,
      error: `Group tickets require a minimum of ${tier.groupMinSize} tickets`,
    });
    return;
  }

  // Best-effort cleanup of stale reservations before checking capacity.
  await expireStaleReservations(eventId).catch((err) =>
    console.error('[Checkout] expireStaleReservations failed:', err),
  );

  try {
    await reserveInventory(event, tier, qty);
  } catch (err) {
    if (err instanceof InventoryError) {
      res.status(409).json({ success: false, error: err.message });
      return;
    }
    throw err;
  }

  const bookingAttendees: BookingAttendee[] = Array.isArray(attendees) && attendees.length
    ? attendees.slice(0, qty).map((a: { name?: string; email?: string }) => ({
        attendeeId: `att-${uuid()}`,
        name: a.name,
        email: a.email,
      }))
    : [{ attendeeId: `att-${uuid()}`, name: buyerName, email: buyerEmail }];

  const subtotal = tier.priceAmountMinor * qty;
  const nowIso = new Date().toISOString();
  const bookingId = `booking-${uuid()}`;
  const booking: BookingEntity = {
    id: bookingId,
    bookingReference: generateBookingReference(),
    customerUserId: req.user?.id,

    eventId: event.id,
    eventTitleSnapshot: event.title,
    eventStartDateTimeSnapshot: event.startDateTime,
    venueNameSnapshot: event.venueName,

    ticketTierId: tier.id,
    ticketTierNameSnapshot: tier.name,

    quantity: qty,
    unitPriceAmountMinor: tier.priceAmountMinor,
    subtotalAmountMinor: subtotal,
    feesAmountMinor: 0,
    totalAmountMinor: subtotal,
    refundedAmountMinor: 0,
    currency: tier.currency,

    bookingStatus: 'RESERVED_PENDING_PAYMENT',
    paymentStatus: 'PENDING',

    buyerName,
    buyerEmail,
    normalizedBuyerEmail: buyerEmail.trim().toLowerCase(),
    buyerPhone,

    attendees: bookingAttendees,

    source: 'ONLINE',
    paymentMethod: 'STRIPE',
    paymentProvider: 'STRIPE',

    reservedUntil: new Date(now + 30 * 60 * 1000).toISOString(),

    createdBy: req.user?.id,
    created_at: nowIso,
    updated_at: nowIso,
  };

  try {
    const session = await createCheckoutSession({
      bookingId: booking.id,
      eventId: event.id,
      eventTitle: event.title,
      ticketTierName: tier.name,
      quantity: qty,
      unitAmountMinor: tier.priceAmountMinor,
      totalAmountMinor: booking.totalAmountMinor,
      currency: tier.currency,
      buyerEmail,
      successUrl: `${FRONTEND_URL}/booking/confirmation?bookingReference=${booking.bookingReference}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${FRONTEND_URL}/events/${event.slug}?checkout=cancelled`,
    });

    booking.paymentProviderSessionId = session.sessionId;
    await db.put('bookings', booking);

    if (marketingConsent) {
      const existingSub = await db.findBy('subscribers', 'normalizedEmail', booking.normalizedBuyerEmail);
      if (!existingSub) {
        await db.put('subscribers', {
          id: `sub-${uuid()}`,
          email: buyerEmail,
          normalizedEmail: booking.normalizedBuyerEmail,
          fullName: buyerName,
          customerUserId: req.user?.id,
          status: 'SUBSCRIBED',
          categories: [event.category],
          city: event.city,
          source: 'CHECKOUT',
          consentTextVersion: '1.0',
          subscribedAt: nowIso,
          created_at: nowIso,
          updated_at: nowIso,
        });
      }
    }

    res.json({
      success: true,
      data: { checkoutUrl: session.checkoutUrl, bookingReference: booking.bookingReference },
    });
  } catch (err) {
    // Compensate: release the reservation since the Stripe session failed to create.
    await releaseInventory(event.id, tier.id, qty).catch(() => {});
    console.error('[Checkout] Failed to create Stripe session:', err);
    res.status(502).json({ success: false, error: 'Failed to start checkout. Please try again.' });
  }
});

export default router;
