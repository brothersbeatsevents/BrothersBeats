// ──────────────────────────────────────────
// Customer account routes ("My Bookings / My Tickets")
// GET/PATCH /me, /me/preferences
// GET /me/bookings, /me/bookings/:bookingReference
// POST /me/bookings/:bookingReference/resend
// POST /me/bookings/claim
// GET /me/tickets/:ticketId/download
// Explicit 403s for cancel/refund/transfer — customers cannot self-serve these.
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { db } from '../store';
import { AuthRequest, authenticate } from '../middleware/auth';
import { BookingEntity, EventEntity, TicketEntity, User } from '../types';
import { sendTicketDelivery } from '../services/email';
import { getSignedDownloadUrl } from '../services/s3';

const router = Router();

router.use(authenticate);

function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    role: user.role,
    avatar_url: user.avatar_url,
    phone: user.phone,
    marketing_consent: user.marketing_consent,
    category_preferences: user.category_preferences,
    city_preference: user.city_preference,
  };
}

// GET /api/me
router.get('/', (req: AuthRequest, res: Response): void => {
  res.json({ success: true, data: publicUser(req.user!) });
});

// PATCH /api/me — update basic profile fields
router.patch('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { display_name, phone } = req.body;

  if (display_name !== undefined) {
    if (typeof display_name !== 'string' || !display_name.trim()) {
      res.status(400).json({ success: false, error: 'display_name must be a non-empty string' });
      return;
    }
    user.display_name = display_name.trim().slice(0, 100);
  }
  if (phone !== undefined) {
    if (typeof phone !== 'string') {
      res.status(400).json({ success: false, error: 'phone must be a string' });
      return;
    }
    user.phone = phone.trim().slice(0, 30);
  }

  user.updated_at = new Date().toISOString();
  await db.put('users', user);
  res.json({ success: true, data: publicUser(user) });
});

// GET/PATCH /api/me/preferences — marketing consent, category, city preferences
router.get('/preferences', (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  res.json({
    success: true,
    data: {
      marketing_consent: user.marketing_consent,
      category_preferences: user.category_preferences,
      city_preference: user.city_preference,
    },
  });
});

router.patch('/preferences', async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { marketing_consent, category_preferences, city_preference } = req.body;

  if (marketing_consent !== undefined) {
    if (typeof marketing_consent !== 'boolean') {
      res.status(400).json({ success: false, error: 'marketing_consent must be a boolean' });
      return;
    }
    user.marketing_consent = marketing_consent;
    user.marketing_consent_version = '1.0';
  }
  if (category_preferences !== undefined) {
    if (!Array.isArray(category_preferences)) {
      res.status(400).json({ success: false, error: 'category_preferences must be an array' });
      return;
    }
    user.category_preferences = category_preferences;
  }
  if (city_preference !== undefined) {
    if (typeof city_preference !== 'string') {
      res.status(400).json({ success: false, error: 'city_preference must be a string' });
      return;
    }
    user.city_preference = city_preference.trim().slice(0, 100);
  }

  user.updated_at = new Date().toISOString();
  await db.put('users', user);
  res.json({
    success: true,
    data: {
      marketing_consent: user.marketing_consent,
      category_preferences: user.category_preferences,
      city_preference: user.city_preference,
    },
  });
});

// GET /api/me/bookings — booking history for the logged-in customer
router.get('/bookings', async (req: AuthRequest, res: Response): Promise<void> => {
  const bookings = await db.filterBy<BookingEntity>('bookings', 'customerUserId', req.user!.id);
  bookings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json({
    success: true,
    data: bookings.map((b) => ({
      bookingReference: b.bookingReference,
      eventTitleSnapshot: b.eventTitleSnapshot,
      eventStartDateTimeSnapshot: b.eventStartDateTimeSnapshot,
      quantity: b.quantity,
      totalAmountMinor: b.totalAmountMinor,
      currency: b.currency,
      bookingStatus: b.bookingStatus,
      paymentStatus: b.paymentStatus,
      created_at: b.created_at,
    })),
  });
});

// GET /api/me/bookings/:bookingReference — booking detail + tickets (owned only)
router.get('/bookings/:bookingReference', async (req: AuthRequest, res: Response): Promise<void> => {
  const booking = await db.findBy<BookingEntity>('bookings', 'bookingReference', req.params.bookingReference);
  if (!booking || booking.customerUserId !== req.user!.id) {
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
      ...booking,
      event: event
        ? { title: event.title, slug: event.slug, venueName: event.venueName, city: event.city, timezone: event.timezone }
        : undefined,
      tickets: ticketData,
    },
  });
});

// POST /api/me/bookings/:bookingReference/resend — re-send the ticket delivery email
router.post('/bookings/:bookingReference/resend', async (req: AuthRequest, res: Response): Promise<void> => {
  const booking = await db.findBy<BookingEntity>('bookings', 'bookingReference', req.params.bookingReference);
  if (!booking || booking.customerUserId !== req.user!.id) {
    res.status(404).json({ success: false, error: 'Booking not found' });
    return;
  }
  if (booking.bookingStatus !== 'CONFIRMED') {
    res.status(409).json({ success: false, error: 'Only confirmed bookings have tickets to resend' });
    return;
  }

  const event = await db.get<EventEntity>('events', booking.eventId);
  const tickets = await db.filterBy<TicketEntity>('tickets', 'bookingId', booking.id);
  if (!event || tickets.length === 0) {
    res.status(404).json({ success: false, error: 'No tickets found for this booking' });
    return;
  }

  await sendTicketDelivery(
    booking.buyerEmail,
    booking.buyerName,
    tickets.map((t) => ({ ticketNumber: t.ticketNumber })),
    { title: event.title, startDateTime: event.startDateTime, venueName: event.venueName, city: event.city, timezone: event.timezone, slug: event.slug },
    booking.bookingReference,
    true,
  );

  res.json({ success: true, message: 'Tickets resent to your email' });
});

// POST /api/me/bookings/claim — attach a guest booking (matching email) to this account
router.post('/bookings/claim', async (req: AuthRequest, res: Response): Promise<void> => {
  const { bookingReference } = req.body;
  if (!bookingReference) {
    res.status(400).json({ success: false, error: 'bookingReference is required' });
    return;
  }

  const booking = await db.findBy<BookingEntity>('bookings', 'bookingReference', bookingReference);
  if (!booking || booking.normalizedBuyerEmail !== req.user!.email.trim().toLowerCase()) {
    res.status(404).json({ success: false, error: 'Booking not found for your account email' });
    return;
  }

  booking.customerUserId = req.user!.id;
  booking.updated_at = new Date().toISOString();
  await db.put('bookings', booking);
  res.json({ success: true, message: 'Booking added to your account' });
});

// GET /api/me/tickets/:ticketId/download — signed PDF download URL (owned only)
router.get('/tickets/:ticketId/download', async (req: AuthRequest, res: Response): Promise<void> => {
  const ticket = await db.get<TicketEntity>('tickets', req.params.ticketId);
  if (!ticket) {
    res.status(404).json({ success: false, error: 'Ticket not found' });
    return;
  }
  const booking = await db.get<BookingEntity>('bookings', ticket.bookingId);
  if (!booking || booking.customerUserId !== req.user!.id) {
    res.status(404).json({ success: false, error: 'Ticket not found' });
    return;
  }
  if (!ticket.ticketPdfS3Key) {
    res.status(404).json({ success: false, error: 'Ticket PDF not yet available' });
    return;
  }
  const url = await getSignedDownloadUrl(ticket.ticketPdfS3Key);
  res.json({ success: true, data: { downloadUrl: url } });
});

// ── Explicit blocks: customers cannot cancel, refund, or transfer bookings themselves.
//    All such requests must go through support / the admin team. ──
function forbidSelfServiceMutation(req: AuthRequest, res: Response): void {
  res.status(403).json({
    success: false,
    error:
      'Customers cannot cancel, refund, or transfer bookings directly. Please contact support.',
  });
}
router.post('/bookings/:bookingReference/cancel', forbidSelfServiceMutation);
router.post('/bookings/:bookingReference/refund', forbidSelfServiceMutation);
router.post('/bookings/:bookingReference/transfer', forbidSelfServiceMutation);
router.delete('/bookings/:bookingReference', forbidSelfServiceMutation);

export default router;
