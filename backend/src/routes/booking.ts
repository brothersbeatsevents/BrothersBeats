// ──────────────────────────────────────────
// Guest booking lookup & confirmation retrieval
// POST /api/booking/lookup                — request a signed magic link by email
// GET  /api/booking/confirmation?token=... — resolve booking + tickets from a signed link
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { db } from '../store';
import { BookingEntity, EventEntity, TicketEntity } from '../types';
import { signBookingToken, verifyBookingToken } from '../services/booking-links';
import { sendBookingLookupLink } from '../services/email';
import { getSignedDownloadUrl } from '../services/s3';

const router = Router();

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')[0]
  .trim();

// POST /api/booking/lookup — always returns a generic success message (no enumeration)
router.post('/lookup', async (req, res: Response): Promise<void> => {
  const { email, bookingReference } = req.body;
  if (!email) {
    res.status(400).json({ success: false, error: 'Email is required' });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const genericMessage =
    'If a matching booking exists, we\'ve sent a link to the email on file.';

  try {
    let bookings = await db.filterBy<BookingEntity>('bookings', 'normalizedBuyerEmail', normalizedEmail);
    if (bookingReference) {
      bookings = bookings.filter((b) => b.bookingReference === bookingReference);
    }

    for (const booking of bookings) {
      const token = signBookingToken(booking.id);
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

// GET /api/booking/confirmation — resolve a signed token into booking + ticket details
router.get('/confirmation', async (req, res: Response): Promise<void> => {
  const token = req.query.token as string;
  if (!token) {
    res.status(400).json({ success: false, error: 'Token is required' });
    return;
  }

  const verified = verifyBookingToken(token);
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
