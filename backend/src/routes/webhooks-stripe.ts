// ──────────────────────────────────────────
// POST /api/webhooks/stripe — verified Stripe webhook handler
// Idempotent via WebhookEventEntity keyed on the Stripe event id.
// ──────────────────────────────────────────

import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import Stripe from 'stripe';
import { db } from '../store';
import { verifyWebhookSignature } from '../services/stripe';
import { confirmInventory, releaseInventory, restoreInventoryOnRefund } from '../services/inventory';
import {
  generateTicketNumber,
  generateAndStoreQrCode,
  generateAndStoreTicketPdf,
} from '../services/tickets';
import {
  sendBookingConfirmation,
  sendTicketDelivery,
  sendPaymentFailed,
  sendReservationExpired,
} from '../services/email';
import { BookingEntity, EventEntity, TicketEntity, WebhookEventEntity, RefundEntity } from '../types';

const router = Router();

function eventContext(event: EventEntity) {
  return {
    title: event.title,
    startDateTime: event.startDateTime,
    venueName: event.venueName,
    city: event.city,
    timezone: event.timezone,
    slug: event.slug,
  };
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) return;
  const booking = await db.get<BookingEntity>('bookings', bookingId);
  if (!booking || booking.bookingStatus !== 'RESERVED_PENDING_PAYMENT') return;

  const event = await db.get<EventEntity>('events', booking.eventId);
  if (!event) return;

  await confirmInventory(booking.eventId, booking.ticketTierId, booking.quantity);

  const now = new Date().toISOString();
  booking.bookingStatus = 'CONFIRMED';
  booking.paymentStatus = 'SUCCEEDED';
  booking.paymentProviderPaymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  booking.confirmedAt = now;
  booking.updated_at = now;
  await db.put('bookings', booking);

  // Ensure attendee count matches ticket quantity (pad with buyer info if needed)
  const attendees = booking.attendees.length
    ? booking.attendees
    : Array.from({ length: booking.quantity }, () => ({
        attendeeId: `att-${uuid()}`,
        name: booking.buyerName,
        email: booking.buyerEmail,
      }));

  const tickets: TicketEntity[] = [];
  for (let i = 0; i < booking.quantity; i++) {
    const attendee = attendees[i] || attendees[0];
    const ticketId = `ticket-${uuid()}`;
    const ticket: TicketEntity = {
      id: ticketId,
      bookingId: booking.id,
      eventId: booking.eventId,
      ticketTierId: booking.ticketTierId,
      attendeeId: attendee.attendeeId,
      attendeeName: attendee.name || booking.buyerName,
      ticketNumber: generateTicketNumber(),
      status: 'VALID',
      qrCodeHash: '',
      created_at: now,
      updated_at: now,
    };
    try {
      ticket.qrCodeImageS3Key = await generateAndStoreQrCode(ticketId);
      ticket.ticketPdfS3Key = await generateAndStoreTicketPdf(ticket, event, booking.buyerName);
    } catch (err) {
      console.error('[Webhook] Failed to generate ticket assets:', err);
    }
    await db.put('tickets', ticket);
    tickets.push(ticket);
  }

  await sendBookingConfirmation(
    booking.buyerEmail,
    booking.buyerName,
    booking,
    eventContext(event),
  ).catch((err) => console.error('[Webhook] sendBookingConfirmation failed:', err));

  await sendTicketDelivery(
    booking.buyerEmail,
    booking.buyerName,
    tickets.map((t) => ({ ticketNumber: t.ticketNumber })),
    eventContext(event),
    booking.bookingReference,
  ).catch((err) => console.error('[Webhook] sendTicketDelivery failed:', err));
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) return;
  const booking = await db.get<BookingEntity>('bookings', bookingId);
  if (!booking || booking.bookingStatus !== 'RESERVED_PENDING_PAYMENT') return;

  await releaseInventory(booking.eventId, booking.ticketTierId, booking.quantity);
  booking.bookingStatus = 'EXPIRED';
  booking.updated_at = new Date().toISOString();
  await db.put('bookings', booking);

  const event = await db.get<EventEntity>('events', booking.eventId);
  if (event) {
    await sendReservationExpired(booking.buyerEmail, booking.buyerName, event.title, event.slug).catch(
      (err) => console.error('[Webhook] sendReservationExpired failed:', err),
    );
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata?.bookingId;
  if (!bookingId) return;
  const booking = await db.get<BookingEntity>('bookings', bookingId);
  if (!booking || booking.bookingStatus !== 'RESERVED_PENDING_PAYMENT') return;

  await releaseInventory(booking.eventId, booking.ticketTierId, booking.quantity);
  booking.bookingStatus = 'PAYMENT_FAILED';
  booking.paymentStatus = 'FAILED';
  booking.updated_at = new Date().toISOString();
  await db.put('bookings', booking);

  await sendPaymentFailed(
    booking.buyerEmail,
    booking.buyerName,
    booking.eventTitleSnapshot,
    booking.bookingReference,
  ).catch((err) => console.error('[Webhook] sendPaymentFailed failed:', err));
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return;

  const booking = await db.findBy<BookingEntity>(
    'bookings',
    'paymentProviderPaymentIntentId',
    paymentIntentId,
  );
  if (!booking) return;

  const refund = await db.findBy<RefundEntity>('refunds', 'bookingId', booking.id);
  const refundedAmount = charge.amount_refunded;
  const isFullRefund = refundedAmount >= booking.totalAmountMinor;

  booking.refundedAmountMinor = refundedAmount;
  booking.bookingStatus = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
  booking.paymentStatus = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
  booking.updated_at = new Date().toISOString();
  await db.put('bookings', booking);

  if (refund && refund.status !== 'SUCCEEDED') {
    refund.status = 'SUCCEEDED';
    refund.completedAt = new Date().toISOString();
    refund.updated_at = refund.completedAt;
    await db.put('refunds', refund);
  }

  if (isFullRefund) {
    await restoreInventoryOnRefund(booking.eventId, booking.ticketTierId, booking.quantity);
    // Invalidate tickets so they no longer scan as valid at entry
    const tickets = await db.filterBy<TicketEntity>('tickets', 'bookingId', booking.id);
    for (const ticket of tickets) {
      ticket.status = 'REFUNDED';
      ticket.updated_at = new Date().toISOString();
      await db.put('tickets', ticket);
    }
  }
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['stripe-signature'];
  const rawBody = (req as any).rawBody as Buffer | undefined;

  if (!signature || typeof signature !== 'string' || !rawBody) {
    res.status(400).json({ success: false, error: 'Missing signature or raw body' });
    return;
  }

  let verified;
  try {
    verified = await verifyWebhookSignature(rawBody, signature);
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err);
    res.status(400).json({ success: false, error: 'Invalid signature' });
    return;
  }

  // Idempotency: skip if we've already processed this Stripe event id
  const existing = await db.get<WebhookEventEntity>('webhookEvents', verified.id);
  if (existing) {
    res.json({ success: true, received: true, duplicate: true });
    return;
  }

  try {
    switch (verified.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(verified.data.object as Stripe.Checkout.Session);
        break;
      case 'checkout.session.expired':
        await handleCheckoutExpired(verified.data.object as Stripe.Checkout.Session);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(verified.data.object as Stripe.PaymentIntent);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(verified.data.object as Stripe.Charge);
        break;
      default:
        break; // ignore other event types
    }

    const record: WebhookEventEntity = {
      id: verified.id,
      provider: 'STRIPE',
      eventType: verified.type,
      processedAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    await db.put('webhookEvents', record);

    res.json({ success: true, received: true });
  } catch (err) {
    console.error('[Webhook] Handler error:', err);
    // Return 500 so Stripe retries — do NOT record the idempotency key on failure
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

export default router;
