// ──────────────────────────────────────────
// Admin: Refunds — list/detail/create/retry
// Stripe-paid bookings are refunded via Stripe (inventory restored by the
// charge.refunded webhook); manually-created (cash/bank/complimentary)
// bookings are refunded immediately since no webhook will fire for them.
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../../store';
import { AuthRequest, authenticate, requireAdmin } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { BookingEntity, RefundEntity, TicketEntity } from '../../types';
import { createRefund } from '../../services/stripe';
import { restoreInventoryOnRefund } from '../../services/inventory';
import { sendRefundRequested, sendRefundCompleted, sendRefundFailed } from '../../services/email';

const router = Router();
router.use(authenticate, requireAdmin);

// GET /api/admin/refunds
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { eventId, status } = req.query as Record<string, string>;
  let refunds = eventId
    ? await db.filterBy<RefundEntity>('refunds', 'eventId', eventId)
    : await db.getAll<RefundEntity>('refunds');
  if (status) refunds = refunds.filter((r) => r.status === status);
  refunds.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  res.json({ success: true, data: refunds });
});

// GET /api/admin/refunds/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const refund = await db.get<RefundEntity>('refunds', req.params.id);
  if (!refund) {
    res.status(404).json({ success: false, error: 'Refund not found' });
    return;
  }
  res.json({ success: true, data: refund });
});

// POST /api/admin/refunds — request a refund for a booking
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { bookingId, amountMinor, reason } = req.body;
  if (!bookingId || !amountMinor || !reason) {
    res.status(400).json({ success: false, error: 'bookingId, amountMinor, and reason are required' });
    return;
  }

  const booking = await db.get<BookingEntity>('bookings', bookingId);
  if (!booking) {
    res.status(404).json({ success: false, error: 'Booking not found' });
    return;
  }
  if (!['CONFIRMED', 'PARTIALLY_REFUNDED'].includes(booking.bookingStatus)) {
    res.status(409).json({ success: false, error: 'Only confirmed bookings can be refunded' });
    return;
  }
  const remaining = booking.totalAmountMinor - booking.refundedAmountMinor;
  if (amountMinor > remaining) {
    res.status(400).json({ success: false, error: `Refund amount exceeds remaining refundable balance (${remaining})` });
    return;
  }

  const now = new Date().toISOString();
  const refund: RefundEntity = {
    id: `refund-${uuid()}`,
    bookingId: booking.id,
    eventId: booking.eventId,
    amountMinor,
    currency: booking.currency,
    reason,
    status: 'REQUESTED',
    provider: booking.paymentMethod === 'STRIPE' ? 'STRIPE' : 'MANUAL',
    requestedBy: req.user!.id,
    requestedAt: now,
    created_at: now,
    updated_at: now,
  };

  booking.bookingStatus = 'REFUND_PENDING';
  booking.updated_at = now;
  await db.put('bookings', booking);

  await sendRefundRequested(booking.buyerEmail, booking.buyerName, booking.eventTitleSnapshot, amountMinor, booking.currency).catch(
    (err) => console.error('[Admin] sendRefundRequested failed:', err),
  );

  if (refund.provider === 'STRIPE') {
    if (!booking.paymentProviderPaymentIntentId) {
      res.status(400).json({ success: false, error: 'Booking has no associated Stripe payment intent' });
      return;
    }
    try {
      refund.status = 'PROCESSING';
      const result = await createRefund({
        paymentIntentId: booking.paymentProviderPaymentIntentId,
        amountMinor,
        reason,
        idempotencyKey: `refund-${refund.id}`,
      });
      refund.providerRefundId = result.refundId;
      await db.put('refunds', refund);
      // Final status + inventory restore + confirmation email happen via the
      // charge.refunded webhook once Stripe confirms the refund.
    } catch (err: any) {
      refund.status = 'FAILED';
      refund.providerFailureMessage = err.message;
      await db.put('refunds', refund);
      await sendRefundFailed(booking.buyerEmail, booking.buyerName, booking.eventTitleSnapshot).catch(() => {});
      auditLog(req.user!.id, 'REFUND_FAILED', 'REFUND', refund.id, { actorRole: req.user!.role as any, bookingId: booking.id, reason: err.message });
      res.status(502).json({ success: false, error: 'Stripe refund failed', data: refund });
      return;
    }
  } else {
    // Manual booking — no payment gateway involved, complete immediately.
    const isFullRefund = amountMinor >= remaining;
    refund.status = 'SUCCEEDED';
    refund.completedAt = now;
    await db.put('refunds', refund);

    booking.refundedAmountMinor += amountMinor;
    booking.bookingStatus = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    booking.paymentStatus = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    booking.updated_at = new Date().toISOString();
    await db.put('bookings', booking);

    if (isFullRefund) {
      await restoreInventoryOnRefund(booking.eventId, booking.ticketTierId, booking.quantity);
      const tickets = await db.filterBy<TicketEntity>('tickets', 'bookingId', booking.id);
      for (const ticket of tickets) {
        ticket.status = 'REFUNDED';
        ticket.updated_at = new Date().toISOString();
        await db.put('tickets', ticket);
      }
    }

    await sendRefundCompleted(booking.buyerEmail, booking.buyerName, booking.eventTitleSnapshot, amountMinor, booking.currency).catch(() => {});
  }

  auditLog(req.user!.id, 'CREATE_REFUND', 'REFUND', refund.id, {
    actorRole: req.user!.role as any,
    eventId: booking.eventId,
    bookingId: booking.id,
    reason,
    summary: `Requested refund of ${amountMinor} ${booking.currency} for booking ${booking.bookingReference}`,
  });

  res.status(201).json({ success: true, data: refund });
});

// POST /api/admin/refunds/:id/retry — retry a previously failed Stripe refund
router.post('/:id/retry', async (req: AuthRequest, res: Response): Promise<void> => {
  const refund = await db.get<RefundEntity>('refunds', req.params.id);
  if (!refund || refund.status !== 'FAILED' || refund.provider !== 'STRIPE') {
    res.status(409).json({ success: false, error: 'Only a failed Stripe refund can be retried' });
    return;
  }
  const booking = await db.get<BookingEntity>('bookings', refund.bookingId);
  if (!booking || !booking.paymentProviderPaymentIntentId) {
    res.status(404).json({ success: false, error: 'Associated booking/payment not found' });
    return;
  }

  try {
    const result = await createRefund({
      paymentIntentId: booking.paymentProviderPaymentIntentId,
      amountMinor: refund.amountMinor,
      reason: refund.reason,
      idempotencyKey: `refund-${refund.id}-retry-${Date.now()}`,
    });
    refund.status = 'PROCESSING';
    refund.providerRefundId = result.refundId;
    refund.providerFailureCode = undefined;
    refund.providerFailureMessage = undefined;
    refund.updated_at = new Date().toISOString();
    await db.put('refunds', refund);
    auditLog(req.user!.id, 'RETRY_REFUND', 'REFUND', refund.id, { actorRole: req.user!.role as any, bookingId: booking.id, summary: `Retried refund ${refund.id}` });
    res.json({ success: true, data: refund });
  } catch (err: any) {
    refund.providerFailureMessage = err.message;
    refund.updated_at = new Date().toISOString();
    await db.put('refunds', refund);
    res.status(502).json({ success: false, error: 'Stripe refund retry failed', data: refund });
  }
});

export default router;
