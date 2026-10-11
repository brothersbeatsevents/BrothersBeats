// ──────────────────────────────────────────
// Admin: door check-in. POST /api/admin/checkin validates a scanned QR (or typed
// ticket number) and marks the ticket CHECKED_IN. Every outcome is HTTP 200 with
// a `result` so the scanner UI can show it; only a missing code is a 400.
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { db } from '../../store';
import { AuthRequest, authenticate, requireAdmin } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { TicketEntity, EventEntity, TicketTierEntity } from '../../types';
import { parseScannedCode } from '../../services/checkin';

const router = Router();
router.use(authenticate, requireAdmin);

type CheckInResult =
  | 'CHECKED_IN'
  | 'ALREADY_CHECKED_IN'
  | 'INVALID'
  | 'WRONG_EVENT'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'EVENT_CANCELLED';

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, eventId } = req.body;
  if (typeof code !== 'string' || !code.trim()) {
    res.status(400).json({ success: false, error: 'code is required' });
    return;
  }

  const respond = async (result: CheckInResult, ticket?: TicketEntity, message?: string) => {
    const event = ticket ? await db.get<EventEntity>('events', ticket.eventId) : null;
    const tier = ticket ? await db.get<TicketTierEntity>('ticketTiers', ticket.ticketTierId) : null;
    res.json({
      success: true,
      data: {
        result,
        message,
        ticket: ticket && {
          ticketNumber: ticket.ticketNumber,
          attendeeName: ticket.attendeeName,
          status: ticket.status,
          checkedInAt: ticket.checkedInAt,
          eventTitle: event?.title,
          tierName: tier?.name,
        },
      },
    });
  };

  const lookup = parseScannedCode(code);
  if (!lookup) {
    await respond('INVALID', undefined, 'Not a valid Brothers Beats ticket code.');
    return;
  }

  const ticket =
    lookup.kind === 'qr'
      ? await db.get<TicketEntity>('tickets', lookup.ticketId)
      : await db.findBy<TicketEntity>('tickets', 'ticketNumber', lookup.ticketNumber);
  if (!ticket) {
    await respond('INVALID', undefined, 'Ticket not found.');
    return;
  }

  if (eventId && ticket.eventId !== eventId) {
    await respond('WRONG_EVENT', ticket, 'This ticket is for a different event.');
    return;
  }
  if (ticket.status === 'CANCELLED') {
    await respond('CANCELLED', ticket, 'This ticket has been cancelled.');
    return;
  }
  if (ticket.status === 'REFUNDED') {
    await respond('REFUNDED', ticket, 'This ticket has been refunded.');
    return;
  }
  if (ticket.status === 'CHECKED_IN') {
    await respond('ALREADY_CHECKED_IN', ticket, 'This ticket was already scanned.');
    return;
  }

  const event = await db.get<EventEntity>('events', ticket.eventId);
  if (event?.status === 'CANCELLED') {
    await respond('EVENT_CANCELLED', ticket, 'This event has been cancelled.');
    return;
  }

  ticket.status = 'CHECKED_IN';
  ticket.checkedInAt = new Date().toISOString();
  ticket.checkedInBy = req.user!.id;
  ticket.updated_at = ticket.checkedInAt;
  await db.put('tickets', ticket);

  auditLog(req.user!.id, 'CHECK_IN_TICKET', 'TICKET', ticket.id, {
    actorRole: req.user!.role as any,
    eventId: ticket.eventId,
    bookingId: ticket.bookingId,
    summary: `Checked in ticket ${ticket.ticketNumber}`,
  });

  await respond('CHECKED_IN', ticket);
});

export default router;
