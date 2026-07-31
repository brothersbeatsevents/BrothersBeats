// ──────────────────────────────────────────
// Admin: Bookings — list/detail, manual (offline) bookings, cancel, resend, export
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../../store';
import { AuthRequest, authenticate, requireAdmin } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { BookingEntity, EventEntity, TicketTierEntity, TicketEntity, BookingAttendee } from '../../types';
import { reserveInventory, confirmInventory, releaseInventory, restoreInventoryOnRefund, InventoryError } from '../../services/inventory';
import { generateTicketNumber, generateAndStoreQrCode, generateAndStoreTicketPdf } from '../../services/tickets';
import { sendBookingConfirmation, sendTicketDelivery } from '../../services/email';

const router = Router();
router.use(authenticate, requireAdmin);

function generateBookingReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'BBE-';
  for (let i = 0; i < 8; i++) ref += alphabet[Math.floor(Math.random() * alphabet.length)];
  return ref;
}

// GET /api/admin/bookings — list with optional filters
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { eventId, status, q } = req.query as Record<string, string>;
  let bookings = eventId
    ? await db.filterBy<BookingEntity>('bookings', 'eventId', eventId)
    : await db.getAll<BookingEntity>('bookings');

  if (status) bookings = bookings.filter((b) => b.bookingStatus === status);
  if (q) {
    const needle = q.toLowerCase();
    bookings = bookings.filter(
      (b) =>
        b.bookingReference.toLowerCase().includes(needle) ||
        b.buyerEmail.toLowerCase().includes(needle) ||
        b.buyerName.toLowerCase().includes(needle),
    );
  }
  bookings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json({ success: true, data: bookings });
});

// GET /api/admin/bookings/export — CSV export (optionally filtered by eventId)
router.get('/export', async (req: AuthRequest, res: Response): Promise<void> => {
  const { eventId } = req.query as Record<string, string>;
  let bookings = eventId
    ? await db.filterBy<BookingEntity>('bookings', 'eventId', eventId)
    : await db.getAll<BookingEntity>('bookings');
  bookings.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const header = [
    'bookingReference', 'eventTitle', 'buyerName', 'buyerEmail', 'quantity',
    'totalAmountMinor', 'currency', 'bookingStatus', 'paymentStatus', 'created_at',
  ];
  const rows = bookings.map((b) => [
    b.bookingReference, b.eventTitleSnapshot, b.buyerName, b.buyerEmail, b.quantity,
    b.totalAmountMinor, b.currency, b.bookingStatus, b.paymentStatus, b.created_at,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  auditLog(req.user!.id, 'EXPORT_BOOKINGS', 'BOOKING', eventId || '*', {
    actorRole: req.user!.role as any,
    summary: `Exported ${bookings.length} booking(s) to CSV`,
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="bookings-export.csv"');
  res.send(csv);
});

// GET /api/admin/bookings/:bookingReference — detail + tickets
router.get('/:bookingReference', async (req: AuthRequest, res: Response): Promise<void> => {
  const booking = await db.findBy<BookingEntity>('bookings', 'bookingReference', req.params.bookingReference);
  if (!booking) {
    res.status(404).json({ success: false, error: 'Booking not found' });
    return;
  }
  const tickets = await db.filterBy<TicketEntity>('tickets', 'bookingId', booking.id);
  res.json({ success: true, data: { ...booking, tickets } });
});

// POST /api/admin/bookings — create a manual (offline) booking: cash / bank transfer / complimentary
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    eventId, ticketTierId, quantity, buyerName, buyerEmail, buyerPhone,
    attendees, paymentMethod, internalNote,
  } = req.body;
  const qty = Number(quantity);

  if (!eventId || !ticketTierId || !Number.isInteger(qty) || qty < 1 || !buyerName || !buyerEmail) {
    res.status(400).json({
      success: false,
      error: 'eventId, ticketTierId, quantity, buyerName, and buyerEmail are required',
    });
    return;
  }
  if (!['CASH', 'BANK_TRANSFER', 'COMPLIMENTARY', 'EXTERNAL'].includes(paymentMethod)) {
    res.status(400).json({ success: false, error: 'paymentMethod must be CASH, BANK_TRANSFER, COMPLIMENTARY, or EXTERNAL' });
    return;
  }

  const event = await db.get<EventEntity>('events', eventId);
  if (!event) {
    res.status(404).json({ success: false, error: 'Event not found' });
    return;
  }
  const tier = await db.get<TicketTierEntity>('ticketTiers', ticketTierId);
  if (!tier || tier.eventId !== eventId) {
    res.status(404).json({ success: false, error: 'Ticket type not found' });
    return;
  }

  try {
    await reserveInventory(event, tier, qty);
    await confirmInventory(eventId, ticketTierId, qty);
  } catch (err) {
    if (err instanceof InventoryError) {
      res.status(409).json({ success: false, error: err.message });
      return;
    }
    throw err;
  }

  const bookingAttendees: BookingAttendee[] = Array.isArray(attendees) && attendees.length
    ? attendees.slice(0, qty).map((a: { name?: string; email?: string }) => ({
        attendeeId: `att-${uuid()}`, name: a.name, email: a.email,
      }))
    : [{ attendeeId: `att-${uuid()}`, name: buyerName, email: buyerEmail }];

  const now = new Date().toISOString();
  const subtotal = tier.priceAmountMinor * qty;
  const booking: BookingEntity = {
    id: `booking-${uuid()}`,
    bookingReference: generateBookingReference(),
    eventId: event.id,
    eventTitleSnapshot: event.title,
    eventStartDateTimeSnapshot: event.startDateTime,
    venueNameSnapshot: event.venueName,
    ticketTierId: tier.id,
    ticketTierNameSnapshot: tier.name,
    quantity: qty,
    unitPriceAmountMinor: paymentMethod === 'COMPLIMENTARY' ? 0 : tier.priceAmountMinor,
    subtotalAmountMinor: paymentMethod === 'COMPLIMENTARY' ? 0 : subtotal,
    feesAmountMinor: 0,
    totalAmountMinor: paymentMethod === 'COMPLIMENTARY' ? 0 : subtotal,
    refundedAmountMinor: 0,
    currency: tier.currency,
    bookingStatus: 'CONFIRMED',
    paymentStatus: paymentMethod === 'COMPLIMENTARY' ? 'NOT_REQUIRED' : 'SUCCEEDED',
    buyerName,
    buyerEmail,
    normalizedBuyerEmail: buyerEmail.trim().toLowerCase(),
    buyerPhone,
    attendees: bookingAttendees,
    source: 'ADMIN_MANUAL',
    paymentMethod,
    confirmedAt: now,
    internalNotes: internalNote ? [{ note: internalNote, author: req.user!.email, created_at: now }] : undefined,
    createdBy: req.user!.id,
    created_at: now,
    updated_at: now,
  };
  await db.put('bookings', booking);

  const tickets: TicketEntity[] = [];
  for (let i = 0; i < qty; i++) {
    const attendee = bookingAttendees[i] || bookingAttendees[0];
    const ticketId = `ticket-${uuid()}`;
    const ticket: TicketEntity = {
      id: ticketId, bookingId: booking.id, eventId: event.id, ticketTierId: tier.id,
      attendeeId: attendee.attendeeId, attendeeName: attendee.name || buyerName,
      ticketNumber: generateTicketNumber(), status: 'VALID', qrCodeHash: '',
      created_at: now, updated_at: now,
    };
    try {
      ticket.qrCodeImageS3Key = await generateAndStoreQrCode(ticketId);
      ticket.ticketPdfS3Key = await generateAndStoreTicketPdf(ticket, event, buyerName);
    } catch (err) {
      console.error('[Admin] Failed to generate ticket assets:', err);
    }
    await db.put('tickets', ticket);
    tickets.push(ticket);
  }

  await sendBookingConfirmation(buyerEmail, buyerName, booking, {
    title: event.title, startDateTime: event.startDateTime, venueName: event.venueName, city: event.city, timezone: event.timezone, slug: event.slug,
  }).catch((err) => console.error('[Admin] sendBookingConfirmation failed:', err));
  await sendTicketDelivery(
    buyerEmail, buyerName, tickets.map((t) => ({ ticketNumber: t.ticketNumber })),
    { title: event.title, startDateTime: event.startDateTime, venueName: event.venueName, city: event.city, timezone: event.timezone, slug: event.slug },
    booking.bookingReference,
  ).catch((err) => console.error('[Admin] sendTicketDelivery failed:', err));

  auditLog(req.user!.id, 'CREATE_MANUAL_BOOKING', 'BOOKING', booking.id, {
    actorRole: req.user!.role as any,
    eventId: event.id,
    bookingId: booking.id,
    summary: `Created manual booking ${booking.bookingReference} (${paymentMethod}) for ${buyerEmail}`,
  });

  res.status(201).json({ success: true, data: booking });
});

// POST /api/admin/bookings/:bookingReference/cancel — admin-initiated cancellation (before/without refund)
router.post('/:bookingReference/cancel', async (req: AuthRequest, res: Response): Promise<void> => {
  const { reason } = req.body;
  const booking = await db.findBy<BookingEntity>('bookings', 'bookingReference', req.params.bookingReference);
  if (!booking) {
    res.status(404).json({ success: false, error: 'Booking not found' });
    return;
  }
  if (['CANCELLED', 'REFUNDED', 'EXPIRED'].includes(booking.bookingStatus)) {
    res.status(409).json({ success: false, error: `Booking is already ${booking.bookingStatus}` });
    return;
  }

  if (booking.bookingStatus === 'RESERVED_PENDING_PAYMENT') {
    await releaseInventory(booking.eventId, booking.ticketTierId, booking.quantity);
  } else if (booking.bookingStatus === 'CONFIRMED') {
    await restoreInventoryOnRefund(booking.eventId, booking.ticketTierId, booking.quantity);
    const tickets = await db.filterBy<TicketEntity>('tickets', 'bookingId', booking.id);
    for (const ticket of tickets) {
      ticket.status = 'CANCELLED';
      ticket.updated_at = new Date().toISOString();
      await db.put('tickets', ticket);
    }
  }

  booking.bookingStatus = 'CANCELLED';
  booking.cancellationReason = reason;
  booking.cancelledAt = new Date().toISOString();
  booking.updated_at = booking.cancelledAt;
  await db.put('bookings', booking);

  auditLog(req.user!.id, 'CANCEL_BOOKING', 'BOOKING', booking.id, {
    actorRole: req.user!.role as any,
    eventId: booking.eventId,
    bookingId: booking.id,
    reason,
    summary: `Cancelled booking ${booking.bookingReference}. Issue a refund separately via Admin > Refunds if payment was collected.`,
  });

  res.json({ success: true, data: booking });
});

// POST /api/admin/bookings/:bookingReference/resend-confirmation
router.post('/:bookingReference/resend-confirmation', async (req: AuthRequest, res: Response): Promise<void> => {
  const booking = await db.findBy<BookingEntity>('bookings', 'bookingReference', req.params.bookingReference);
  if (!booking) {
    res.status(404).json({ success: false, error: 'Booking not found' });
    return;
  }
  const event = await db.get<EventEntity>('events', booking.eventId);
  if (!event) {
    res.status(404).json({ success: false, error: 'Event not found' });
    return;
  }
  await sendBookingConfirmation(booking.buyerEmail, booking.buyerName, booking, {
    title: event.title, startDateTime: event.startDateTime, venueName: event.venueName, city: event.city, timezone: event.timezone, slug: event.slug,
  });
  auditLog(req.user!.id, 'RESEND_CONFIRMATION', 'BOOKING', booking.id, { actorRole: req.user!.role as any, bookingId: booking.id, summary: `Resent confirmation for ${booking.bookingReference}` });
  res.json({ success: true, message: 'Confirmation email resent' });
});

// POST /api/admin/bookings/:bookingReference/resend-tickets
router.post('/:bookingReference/resend-tickets', async (req: AuthRequest, res: Response): Promise<void> => {
  const booking = await db.findBy<BookingEntity>('bookings', 'bookingReference', req.params.bookingReference);
  if (!booking || booking.bookingStatus !== 'CONFIRMED') {
    res.status(404).json({ success: false, error: 'Confirmed booking not found' });
    return;
  }
  const event = await db.get<EventEntity>('events', booking.eventId);
  const tickets = await db.filterBy<TicketEntity>('tickets', 'bookingId', booking.id);
  if (!event || tickets.length === 0) {
    res.status(404).json({ success: false, error: 'No tickets found' });
    return;
  }
  await sendTicketDelivery(
    booking.buyerEmail, booking.buyerName, tickets.map((t) => ({ ticketNumber: t.ticketNumber })),
    { title: event.title, startDateTime: event.startDateTime, venueName: event.venueName, city: event.city, timezone: event.timezone, slug: event.slug },
    booking.bookingReference, true,
  );
  auditLog(req.user!.id, 'RESEND_TICKETS', 'BOOKING', booking.id, { actorRole: req.user!.role as any, bookingId: booking.id, summary: `Resent tickets for ${booking.bookingReference}` });
  res.json({ success: true, message: 'Tickets resent' });
});

export default router;
