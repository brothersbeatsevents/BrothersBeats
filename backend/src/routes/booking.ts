// ──────────────────────────────────────────
// Guest booking lookup & confirmation retrieval
// POST /api/booking/lookup                — request a secure magic link by email
// GET  /api/booking/confirmation?token=... — resolve booking + tickets from a secure link
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { db } from '../store';
import { BookingEntity, EventEntity, TicketEntity } from '../types';
import { createBookingToken, verifyBookingToken } from '../services/booking-links';
import { sendBookingLookupLink, sendTicketDelivery } from '../services/email';
import { getSignedDownloadUrl } from '../services/s3';

const router = Router();

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')[0]
  .trim();

// POST /api/booking/lookup — always returns a generic success message (no enumeration)
router.post('/lookup', async (req, res: Response): Promise<void> => {
  const { email, bookingReference } = req.body;
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    res.status(400).json({ success: false, error: 'Email is required' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const genericMessage =
    'If a matching booking exists, we\'ve emailed your tickets or booking details to the address used at checkout.';

  try {
    let bookings = await db.filterBy<BookingEntity>('bookings', 'normalizedBuyerEmail', normalizedEmail);
    if (bookingReference) {
      bookings = bookings.filter((b) => b.bookingReference === String(bookingReference).trim().toUpperCase());
    }

    for (const booking of bookings) {
      if (booking.bookingStatus === 'CONFIRMED') {
        const event = await db.get<EventEntity>('events', booking.eventId);
        const tickets = await db.filterBy<TicketEntity>('tickets', 'bookingId', booking.id);
        if (event && tickets.length) {
          const sent = await sendTicketDelivery(booking.buyerEmail, booking.buyerName,
            tickets.map((ticket) => ({ ticketNumber: ticket.ticketNumber, ticketTierName: ticket.ticketTierNameSnapshot, ticketPdfS3Key: ticket.ticketPdfS3Key })),
            { title: event.title, startDateTime: event.startDateTime, venueName: event.venueName, city: event.city, timezone: event.timezone, slug: event.slug }, booking, true);
          if (!sent) console.error('[Booking] Ticket recovery email failed:', { bookingId: booking.id });
          continue;
        }
      }
      const token = await createBookingToken(booking.id);
      const link = `${FRONTEND_URL}/booking/confirmation?token=${token}`;
      await sendBookingLookupLink(booking.buyerEmail, booking.buyerName, link).catch((err) =>
        console.error('[Booking] sendBookingLookupLink failed:', err),
      );
    }
  } catch (err) {
    console.error('[Booking] lookup failed:', err);
  }

  res.json({ success: true, message: genericMessage });
});

// GET /api/booking/confirmation — resolve a secure token into booking + ticket details
router.get('/confirmation', async (req, res: Response): Promise<void> => {
  res.set('Cache-Control', 'private, no-store');
  const token = req.query.token;
  if (typeof token !== 'string' || !token) {
    res.status(400).json({ success: false, error: 'Token is required' });
    return;
  }

  const verified = await verifyBookingToken(token);
  if (!verified) {
    res.status(401).json({ success: false, error: 'This link is invalid or has expired' });
    return;
  }

  const booking = await db.get<BookingEntity>('bookings', verified.bookingId);
  if (!booking) {
    res.status(404).json({ success: false, error: 'Booking not found' });
    return;
  }

  const event = await db.get<EventEntity>('events', booking.eventId);
  const tickets = await db.filterBy<TicketEntity>('tickets', 'bookingId', booking.id);

  const ticketData = await Promise.all(
    tickets.map(async (t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      status: t.status,
      attendeeName: t.attendeeName,
      ticketTierName: t.ticketTierNameSnapshot,
      pdfDownloadUrl: t.ticketPdfS3Key ? await getSignedDownloadUrl(t.ticketPdfS3Key) : undefined,
    })),
  );

  res.json({
    success: true,
    data: {
      bookingReference: booking.bookingReference,
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      quantity: booking.quantity,
      totalAmountMinor: booking.totalAmountMinor,
      discountCode: booking.discountCode,
      discountAmountMinor: booking.discountAmountMinor,
      currency: booking.currency,
      buyerName: booking.buyerName,
      buyerEmail: booking.buyerEmail,
      event: event
        ? {
            title: event.title,
            slug: event.slug,
            startDateTime: event.startDateTime,
            venueName: event.venueName,
            city: event.city,
            timezone: event.timezone,
          }
        : undefined,
      tickets: ticketData,
    },
  });
});

export default router;
