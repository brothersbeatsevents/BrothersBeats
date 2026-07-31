// ──────────────────────────────────────────
// Admin: Reports — dashboard summary, sales report, attendance report
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { db } from '../../store';
import { AuthRequest, authenticate, requireAdmin } from '../../middleware/auth';
import { EventEntity, BookingEntity, TicketEntity, SubscriberEntity } from '../../types';

const router = Router();
router.use(authenticate, requireAdmin);

// GET /api/admin/reports/dashboard — top-level KPIs
router.get('/dashboard', async (_req: AuthRequest, res: Response): Promise<void> => {
  const [events, bookings, subscribers] = await Promise.all([
    db.getAll<EventEntity>('events'),
    db.getAll<BookingEntity>('bookings'),
    db.getAll<SubscriberEntity>('subscribers'),
  ]);

  const confirmedBookings = bookings.filter((b) => b.bookingStatus === 'CONFIRMED');
  const totalRevenueMinor = confirmedBookings.reduce((sum, b) => sum + b.totalAmountMinor - b.refundedAmountMinor, 0);
  const upcomingEvents = events.filter(
    (e) => e.status === 'PUBLISHED' && new Date(e.startDateTime).getTime() > Date.now(),
  );

  res.json({
    success: true,
    data: {
      totalEvents: events.length,
      publishedEvents: events.filter((e) => e.status === 'PUBLISHED').length,
      upcomingEventsCount: upcomingEvents.length,
      totalBookings: bookings.length,
      confirmedBookings: confirmedBookings.length,
      pendingReservations: bookings.filter((b) => b.bookingStatus === 'RESERVED_PENDING_PAYMENT').length,
      totalRevenueMinor,
      totalTicketsSold: events.reduce((sum, e) => sum + e.totalTicketsSold, 0),
      activeSubscribers: subscribers.filter((s) => s.status === 'SUBSCRIBED').length,
      recentBookings: bookings
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
        .map((b) => ({
          bookingReference: b.bookingReference,
          eventTitleSnapshot: b.eventTitleSnapshot,
          buyerName: b.buyerName,
          totalAmountMinor: b.totalAmountMinor,
          currency: b.currency,
          bookingStatus: b.bookingStatus,
          created_at: b.created_at,
        })),
    },
  });
});

// GET /api/admin/reports/sales?eventId=... — per-event or overall sales breakdown
router.get('/sales', async (req: AuthRequest, res: Response): Promise<void> => {
  const { eventId } = req.query as Record<string, string>;
  const bookings = eventId
    ? await db.filterBy<BookingEntity>('bookings', 'eventId', eventId)
    : await db.getAll<BookingEntity>('bookings');

  const confirmed = bookings.filter((b) => b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'PARTIALLY_REFUNDED' || b.bookingStatus === 'REFUNDED');

  const byTier = new Map<string, { name: string; quantity: number; grossMinor: number }>();
  for (const b of confirmed) {
    const entry = byTier.get(b.ticketTierId) || { name: b.ticketTierNameSnapshot, quantity: 0, grossMinor: 0 };
    entry.quantity += b.quantity;
    entry.grossMinor += b.totalAmountMinor - b.refundedAmountMinor;
    byTier.set(b.ticketTierId, entry);
  }

  res.json({
    success: true,
    data: {
      totalBookings: confirmed.length,
      totalTicketsSold: confirmed.reduce((sum, b) => sum + b.quantity, 0),
      grossRevenueMinor: confirmed.reduce((sum, b) => sum + b.totalAmountMinor, 0),
      netRevenueMinor: confirmed.reduce((sum, b) => sum + b.totalAmountMinor - b.refundedAmountMinor, 0),
      refundedMinor: confirmed.reduce((sum, b) => sum + b.refundedAmountMinor, 0),
      byTicketTier: Array.from(byTier.values()),
    },
  });
});

// GET /api/admin/reports/attendance?eventId=... — checked-in vs. valid tickets
router.get('/attendance', async (req: AuthRequest, res: Response): Promise<void> => {
  const { eventId } = req.query as Record<string, string>;
  if (!eventId) {
    res.status(400).json({ success: false, error: 'eventId is required' });
    return;
  }
  const tickets = await db.filterBy<TicketEntity>('tickets', 'eventId', eventId);
  const valid = tickets.filter((t) => t.status === 'VALID' || t.status === 'CHECKED_IN');
  const checkedIn = tickets.filter((t) => t.status === 'CHECKED_IN');

  res.json({
    success: true,
    data: {
      totalTickets: tickets.length,
      validTickets: valid.length,
      checkedIn: checkedIn.length,
      checkedInPercent: valid.length ? Math.round((checkedIn.length / valid.length) * 100) : 0,
      cancelledOrRefunded: tickets.filter((t) => t.status === 'CANCELLED' || t.status === 'REFUNDED').length,
    },
  });
});

export default router;
