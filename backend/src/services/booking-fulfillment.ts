import { v4 as uuid } from 'uuid';
import { db } from '../store';
import { BookingEntity, EventEntity, TicketEntity } from '../types';
import { confirmBookingInventory } from './inventory';
import { bookingSelections } from './ticket-order';
import { generateTicketNumber, generateAndStoreQrCode, generateAndStoreTicketPdf } from './tickets';
import { sendBookingConfirmation } from './email';

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

/** Fulfill paid and zero-price bookings with one ticket per attendee. */
export async function fulfillBooking(booking: BookingEntity, event: EventEntity): Promise<void> {
  if (booking.bookingStatus !== 'RESERVED_PENDING_PAYMENT') return;
  await confirmBookingInventory(booking);

  const now = new Date().toISOString();
  booking.bookingStatus = 'CONFIRMED';
  booking.paymentStatus = booking.totalAmountMinor === 0 ? 'NOT_REQUIRED' : 'SUCCEEDED';
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

  const ticketTiers = bookingSelections(booking).flatMap((item) => Array(item.quantity).fill(item.ticketTierId));
  const tickets: TicketEntity[] = [];
  for (let i = 0; i < booking.quantity; i++) {
    const attendee = attendees[i] || attendees[0];
    const ticketId = `ticket-${uuid()}`;
    const ticket: TicketEntity = {
      id: ticketId,
      bookingId: booking.id,
      eventId: booking.eventId,
      ticketTierId: ticketTiers[i],
      ticketTierNameSnapshot: booking.lineItems?.find((item) => item.ticketTierId === ticketTiers[i])?.ticketTierName ?? booking.ticketTierNameSnapshot,
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
      console.error('[Booking] Failed to generate ticket assets:', err);
    }
    await db.put('tickets', ticket);
    tickets.push(ticket);
  }

  await sendBookingConfirmation(
    booking.buyerEmail,
    booking.buyerName,
    booking,
    eventContext(event),
    tickets.map((t) => ({ ticketNumber: t.ticketNumber, ticketTierName: t.ticketTierNameSnapshot })),
  ).catch((err) => console.error('[Webhook] sendBookingConfirmation failed:', err));
}
