// ──────────────────────────────────────────
// Inventory helper — abstracts the DynamoDB conditional-update guards vs.
// the in-memory optimistic read-check-write pattern used for local dev.
// ──────────────────────────────────────────

import { db } from '../store';
import { EventEntity, TicketTierEntity } from '../types';

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

/**
 * Lazy reservation-expiry safety net: releases inventory for any booking on
 * this event whose reservation window has elapsed but was never confirmed or
 * explicitly expired (e.g. a missed/duplicate Stripe webhook). Called before
 * new reservations are made so capacity doesn't get stuck as "reserved"
 * forever. A scheduled job (EventBridge) is the more robust long-term
 * solution — see docs/CLAUDE.md follow-ups in the final delivery report.
 */
export async function expireStaleReservations(eventId: string): Promise<void> {
  const bookings = await db.filterBy<import('../types').BookingEntity>(
    'bookings',
    'eventId',
    eventId,
  );
  const now = Date.now();
  for (const booking of bookings) {
    if (
      booking.bookingStatus === 'RESERVED_PENDING_PAYMENT' &&
      booking.reservedUntil &&
      new Date(booking.reservedUntil).getTime() < now
    ) {
      await releaseInventory(booking.eventId, booking.ticketTierId, booking.quantity);
      booking.bookingStatus = 'EXPIRED';
      booking.updated_at = new Date().toISOString();
      await db.put('bookings', booking);
    }
  }
}
