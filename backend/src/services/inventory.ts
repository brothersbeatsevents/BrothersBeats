// ──────────────────────────────────────────
// Inventory helper — abstracts the DynamoDB conditional-update guards vs.
// the in-memory optimistic read-check-write pattern used for local dev.
// ──────────────────────────────────────────

import { db } from '../store';
import { BookingEntity, EventEntity, TicketSelection, TicketTierEntity } from '../types';
import { bookingSelections } from './ticket-order';
import { expireCheckoutSession, retrieveCheckoutSession } from './stripe';

const USE_DYNAMO = !!process.env.USE_DYNAMODB;

export class InventoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InventoryError';
  }
}

/** Reserve `qty` tickets against both the event capacity and the tier's own cap. */
export async function reserveInventory(
  event: EventEntity,
  tier: TicketTierEntity,
  qty: number,
): Promise<void> {
  if (USE_DYNAMO) {
    try {
      await db.reserveEventInventory(event.id, qty, event.capacity);
    } catch {
      throw new InventoryError('Not enough tickets available for this event');
    }
    try {
      await db.reserveTierInventory(tier.id, qty, tier.maxQuantity);
    } catch {
      await db.releaseEventInventory(event.id, qty);
      throw new InventoryError('Not enough tickets available for this ticket type');
    }
    return;
  }

  const eventAvailable = event.capacity - event.totalTicketsSold - event.totalTicketsReserved;
  const tierAvailable = tier.maxQuantity - tier.quantitySold - tier.quantityReserved;
  if (qty > eventAvailable) {
    throw new InventoryError('Not enough tickets available for this event');
  }
  if (qty > tierAvailable) {
    throw new InventoryError('Not enough tickets available for this ticket type');
  }
  event.totalTicketsReserved += qty;
  tier.quantityReserved += qty;
  event.updated_at = new Date().toISOString();
  tier.updated_at = event.updated_at;
  await db.put('events', event);
  await db.put('ticketTiers', tier);
}

/** Release a reservation (payment failed, session expired, admin cancel before payment). */
export async function releaseInventory(
  eventId: string,
  ticketTierId: string,
  qty: number,
): Promise<void> {
  if (USE_DYNAMO) {
    await db.releaseEventInventory(eventId, qty);
    await db.releaseTierInventory(ticketTierId, qty);
    return;
  }
  const event = await db.get<EventEntity>('events', eventId);
  const tier = await db.get<TicketTierEntity>('ticketTiers', ticketTierId);
  if (event) {
    event.totalTicketsReserved = Math.max(0, event.totalTicketsReserved - qty);
    await db.put('events', event);
  }
  if (tier) {
    tier.quantityReserved = Math.max(0, tier.quantityReserved - qty);
    await db.put('ticketTiers', tier);
  }
}

/** Convert a reservation into a confirmed sale (payment succeeded). */
export async function confirmInventory(
  eventId: string,
  ticketTierId: string,
  qty: number,
): Promise<void> {
  if (USE_DYNAMO) {
    await db.confirmEventInventory(eventId, qty);
    await db.confirmTierInventory(ticketTierId, qty);
    return;
  }
  const event = await db.get<EventEntity>('events', eventId);
  const tier = await db.get<TicketTierEntity>('ticketTiers', ticketTierId);
  if (event) {
    event.totalTicketsReserved = Math.max(0, event.totalTicketsReserved - qty);
    event.totalTicketsSold += qty;
    await db.put('events', event);
  }
  if (tier) {
    tier.quantityReserved = Math.max(0, tier.quantityReserved - qty);
    tier.quantitySold += qty;
    await db.put('ticketTiers', tier);
  }
}

/** Return confirmed sold tickets back to availability after a refund/cancellation. */
export async function restoreInventoryOnRefund(
  eventId: string,
  ticketTierId: string,
  qty: number,
): Promise<void> {
  if (USE_DYNAMO) {
    await db.restoreEventInventoryOnRefund(eventId, qty);
    await db.restoreTierInventoryOnRefund(ticketTierId, qty);
    return;
  }
  const event = await db.get<EventEntity>('events', eventId);
  const tier = await db.get<TicketTierEntity>('ticketTiers', ticketTierId);
  if (event) {
    event.totalTicketsSold = Math.max(0, event.totalTicketsSold - qty);
    await db.put('events', event);
  }
  if (tier) {
    tier.quantitySold = Math.max(0, tier.quantitySold - qty);
    await db.put('ticketTiers', tier);
  }
}

/** Atomically expire a pending booking and return all of its inventory once. */
export async function expireBookingReservation(booking: BookingEntity): Promise<boolean> {
  return db.expireBookingReservation(booking, bookingSelections(booking));
}

async function expireStaleBooking(booking: BookingEntity): Promise<void> {
  if (booking.bookingStatus !== 'RESERVED_PENDING_PAYMENT' || !booking.reservedUntil ||
      new Date(booking.reservedUntil).getTime() > Date.now() ||
      !Number.isFinite(Date.parse(booking.reservedUntil))) return;

  if (booking.paymentProviderSessionId) {
    // Stripe's timed expiry has a 30-minute minimum; close the session ourselves.
    // Never release tickets while that session can still accept payment.
    let session;
    try {
      session = await expireCheckoutSession(booking.paymentProviderSessionId);
    } catch {
      // A payment or the expiry webhook may have won the race.
      session = await retrieveCheckoutSession(booking.paymentProviderSessionId);
    }
    if (session.status === 'complete') return;
    if (session.status !== 'expired') throw new Error('Checkout session is still open; reservation retained');
  }
  await expireBookingReservation(booking);
}

/** Safety net before new checkout requests, in addition to the scheduled job. */
export async function expireStaleReservations(eventId: string): Promise<void> {
  const bookings = await db.filterBy<import('../types').BookingEntity>(
    'bookings',
    'eventId',
    eventId,
  );
  for (const booking of bookings) await expireStaleBooking(booking);
}

/** Run every minute even when no one is browsing or starting another checkout. */
export async function expirePendingReservations(): Promise<void> {
  const bookings = await db.filterBy<BookingEntity>('bookings', 'bookingStatus', 'RESERVED_PENDING_PAYMENT');
  let failures = 0;
  for (const booking of bookings) {
    try {
      await expireStaleBooking(booking);
    } catch (error) {
      failures++;
      console.error('[Reservations] Expiry failed:', { bookingId: booking.id, error });
    }
  }
  if (failures) throw new Error(`Could not expire ${failures} reservation(s); retry required`);
}

/** Reserve every selected type, releasing earlier reservations if a later type fails. */
export async function reserveOrderInventory(eventId: string, items: TicketSelection[]): Promise<void> {
  const reserved: TicketSelection[] = [];
  try {
    for (const item of items) {
      const event = await db.get<EventEntity>('events', eventId);
      const tier = await db.get<TicketTierEntity>('ticketTiers', item.ticketTierId);
      if (!event || !tier || tier.eventId !== eventId) throw new InventoryError('Ticket type not found');
      await reserveInventory(event, tier, item.quantity);
      reserved.push(item);
    }
  } catch (err) {
    for (const item of reserved) await releaseInventory(eventId, item.ticketTierId, item.quantity);
    throw err;
  }
}

export async function releaseBookingInventory(booking: BookingEntity): Promise<void> {
  for (const item of bookingSelections(booking)) await releaseInventory(booking.eventId, item.ticketTierId, item.quantity);
}

export async function confirmBookingInventory(booking: BookingEntity): Promise<void> {
  for (const item of bookingSelections(booking)) await confirmInventory(booking.eventId, item.ticketTierId, item.quantity);
}

export async function restoreBookingInventory(booking: BookingEntity): Promise<void> {
  for (const item of bookingSelections(booking)) await restoreInventoryOnRefund(booking.eventId, item.ticketTierId, item.quantity);
}
