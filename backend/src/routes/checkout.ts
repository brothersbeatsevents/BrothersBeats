// ──────────────────────────────────────────
// POST /api/checkout/session — reserve inventory + create a Stripe Checkout Session
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../store';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { EventEntity, BookingEntity, BookingAttendee } from '../types';
import { reserveOrderInventory, releaseBookingInventory, expireStaleReservations, InventoryError } from '../services/inventory';
import { parseTicketSelections, quoteTicketOrder, TicketOrderError } from '../services/ticket-order';
import { fulfillBooking } from '../services/booking-fulfillment';
import { createBookingTicketUrl } from '../services/booking-links';
import { createCheckoutSession } from '../services/stripe';
import { DiscountCodeError } from '../services/discount-codes';
import { isValidOptionalPhone, PHONE_ERROR } from '../services/phone-validation';

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
    buyerName,
    buyerEmail,
    buyerPhone,
    attendees,
    marketingConsent,
  } = req.body;
  if (typeof eventId !== 'string' || typeof buyerName !== 'string' || !buyerName.trim() ||
      typeof buyerEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
    res.status(400).json({ success: false, error: 'eventId, buyerName, and a valid buyerEmail are required' });
    return;
  }

  if (!isValidOptionalPhone(buyerPhone)) {
    res.status(400).json({ success: false, error: PHONE_ERROR });
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
  if (event.status !== 'PUBLISHED' || new Date(event.endDateTime).getTime() < Date.now()) {
    res.status(409).json({ success: false, error: 'Tickets are not currently on sale for this event' });
    return;
  }

  await expireStaleReservations(eventId).catch((err) =>
    console.error('[Checkout] expireStaleReservations failed:', err),
  );
  // Refresh after cleanup; DynamoDB reads return separate objects.
  const refreshedEvent = (await db.get<EventEntity>('events', eventId))!;
  let quote;
  try {
    const items = parseTicketSelections(req.body);
    // Price before reserving: the current order must not consume its own Early Bird allowance.
    quote = await quoteTicketOrder(refreshedEvent, items, req.body.discountCode);
    await reserveOrderInventory(eventId, items);
  } catch (err) {
    if (err instanceof TicketOrderError || err instanceof DiscountCodeError || err instanceof InventoryError) {
      res.status(err instanceof InventoryError ? 409 : err.status).json({ success: false, error: err.message });
      return;
    }
    throw err;
  }
  const qty = quote.quantity;
  const first = quote.lineItems![0];
  const now = Date.now();

  const bookingAttendees: BookingAttendee[] = Array.isArray(attendees) && attendees.length
    ? attendees.slice(0, qty).map((a: { name?: string; email?: string }) => ({
        attendeeId: `att-${uuid()}`,
        name: a.name,
        email: a.email,
      }))
    : [{ attendeeId: `att-${uuid()}`, name: buyerName, email: buyerEmail }];

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

    ticketTierId: first.ticketTierId,
    ticketTierNameSnapshot: quote.ticketTierName,
    lineItems: quote.lineItems,

    quantity: qty,
    unitPriceAmountMinor: first.unitPriceAmountMinor,
    subtotalAmountMinor: quote.subtotalAmountMinor,
    discountCode: quote.discountCode,
    discountAmountMinor: quote.discountAmountMinor,
    feesAmountMinor: 0,
    totalAmountMinor: quote.totalAmountMinor,
    refundedAmountMinor: 0,
    currency: quote.currency,
    earlyBirdQuantity: quote.earlyBirdQuantity,
    earlyBirdUnitPriceAmountMinor: quote.earlyBirdUnitPriceAmountMinor,
    standardQuantity: quote.standardQuantity,
    standardUnitPriceAmountMinor: quote.standardUnitPriceAmountMinor,

    bookingStatus: 'RESERVED_PENDING_PAYMENT',
    paymentStatus: 'PENDING',

    buyerName,
    buyerEmail,
    normalizedBuyerEmail: buyerEmail.trim().toLowerCase(),
    buyerPhone: buyerPhone?.trim(),

    attendees: bookingAttendees,

    source: 'ONLINE',
    paymentMethod: quote.totalAmountMinor === 0 ? 'COMPLIMENTARY' : 'STRIPE',
    paymentProvider: quote.totalAmountMinor === 0 ? undefined : 'STRIPE',

    reservedUntil: new Date(now + 15 * 60 * 1000).toISOString(),

    createdBy: req.user?.id,
    created_at: nowIso,
    updated_at: nowIso,
  };

  let checkoutUrl: string;
  try {
    await db.put('bookings', booking);
    if (booking.totalAmountMinor === 0) {
      await fulfillBooking(booking, refreshedEvent);
      checkoutUrl = await createBookingTicketUrl(booking.id, event.startDateTime);
    } else {
      const lineItems = quote.lineItems!.flatMap((item) => [
        ...(item.earlyBirdQuantity > 0 ? [{ name: `${item.ticketTierName} (Early Bird)`, unitAmountMinor: item.discountedEarlyBirdUnitPriceAmountMinor ?? item.earlyBirdUnitPriceAmountMinor, quantity: item.earlyBirdQuantity }] : []),
        ...(item.standardQuantity > 0 ? [{ name: item.ticketTierName, unitAmountMinor: item.discountedStandardUnitPriceAmountMinor ?? item.standardUnitPriceAmountMinor, quantity: item.standardQuantity }] : []),
      ]);
      const session = await createCheckoutSession({
        bookingId: booking.id, eventId: event.id, eventTitle: event.title,
        lineItems, currency: quote.currency, buyerEmail,
        successUrl: await createBookingTicketUrl(booking.id, event.startDateTime),
        cancelUrl: `${FRONTEND_URL}/events/${event.slug}?checkout=cancelled`,
      });
      booking.paymentProviderSessionId = session.sessionId;
      await db.put('bookings', booking);
      checkoutUrl = session.checkoutUrl;
    }
  } catch (err) {
    if (booking.bookingStatus === 'RESERVED_PENDING_PAYMENT') {
      await releaseBookingInventory(booking);
      booking.bookingStatus = 'PAYMENT_FAILED';
      booking.paymentStatus = 'FAILED';
      await db.put('bookings', booking);
    }
    console.error('[Checkout] Failed to start checkout:', err);
    res.status(502).json({ success: false, error: 'Failed to start checkout. Please try again.' });
    return;
  }

  try {
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

  } catch (err) {
    console.error('[Checkout] Marketing subscription failed:', err);
  }
  res.json({ success: true, data: { checkoutUrl, bookingReference: booking.bookingReference } });
});

export default router;
