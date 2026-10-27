import { v4 as uuid } from 'uuid';
import { db } from '../store';
import { BookingEntity, BookingLineItem, EventEntity, PriceQuote, TicketSelection, TicketTierEntity } from '../types';
import { computeBlendedPrice } from './ticket-pricing';
import { applyDiscountCode } from './discount-codes';

export class TicketOrderError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/** Accept old single-tier requests as well as a basket. Reject duplicates to prevent limit bypasses. */
export function parseTicketSelections(body: { items?: unknown; ticketTierId?: unknown; quantity?: unknown }): TicketSelection[] {
  const items = body.items === undefined
    ? [{ ticketTierId: body.ticketTierId, quantity: body.quantity }]
    : body.items;
  if (!Array.isArray(items) || !items.length || items.length > 100) {
    throw new TicketOrderError('Select at least one ticket type');
  }
  const seen = new Set<string>();
  return items.map((item) => {
    if (!item || typeof item.ticketTierId !== 'string' || !item.ticketTierId ||
        !['number', 'string'].includes(typeof item.quantity) ||
        !Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) < 1) {
      throw new TicketOrderError('Each ticket type requires a positive integer quantity');
    }
    if (seen.has(item.ticketTierId)) throw new TicketOrderError('Select each ticket type only once');
    seen.add(item.ticketTierId);
    return { ticketTierId: item.ticketTierId, quantity: Number(item.quantity) };
  });
}

export async function quoteTicketOrder(event: EventEntity, items: TicketSelection[], discountCode?: unknown): Promise<PriceQuote> {
  const now = Date.now();
  if (event.status !== 'PUBLISHED' || new Date(event.endDateTime).getTime() < now) {
    throw new TicketOrderError('Tickets are not currently on sale for this event', 409);
  }
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  if (quantity > event.perOrderLimit) {
    throw new TicketOrderError(`A maximum of ${event.perOrderLimit} tickets may be purchased per order`);
  }
  if (quantity > event.capacity - event.totalTicketsSold - event.totalTicketsReserved) {
    throw new TicketOrderError('Not enough tickets available for this event', 409);
  }
  let currency: string | undefined;
  const lineItems: BookingLineItem[] = [];
  for (const item of items) {
    const tier = await db.get<TicketTierEntity>('ticketTiers', item.ticketTierId);
    if (!tier || tier.eventId !== event.id || !tier.visible) throw new TicketOrderError('Ticket type not found', 404);
    if (tier.type === 'EARLY_BIRD') throw new TicketOrderError('Early Bird pricing is applied automatically and cannot be selected directly');
    if (!tier.active || new Date(tier.salesStartAt).getTime() > now || new Date(tier.salesEndAt).getTime() < now) {
      throw new TicketOrderError(`${tier.name} is not currently on sale`, 409);
    }
    const minimum = Math.max(tier.minPerOrder, tier.type === 'GROUP' ? tier.groupMinSize || 1 : 1);
    if (item.quantity < minimum || item.quantity > tier.maxPerOrder) {
      throw new TicketOrderError(`Quantity for ${tier.name} must be between ${minimum} and ${tier.maxPerOrder}`);
    }
    const available = Math.max(0, tier.maxQuantity - tier.quantitySold - tier.quantityReserved);
    if (item.quantity > available) {
      throw new TicketOrderError(`Not enough tickets available for ${tier.name}. Only ${available} left.`, 409);
    }
    if (currency && currency !== tier.currency) throw new TicketOrderError('Ticket types must use the same currency');
    currency = tier.currency;
    const blended = await computeBlendedPrice(tier, item.quantity);
    lineItems.push({ ...item, ticketTierName: tier.name, unitPriceAmountMinor: tier.priceAmountMinor, ...blended });
  }
  const subtotal = lineItems.reduce((sum, item) => sum + item.subtotalAmountMinor, 0);
  const first = lineItems[0];
  return applyDiscountCode({
    quoteId: `quote-${uuid()}`, eventId: event.id,
    ticketTierId: first.ticketTierId,
    ticketTierName: lineItems.length === 1 ? first.ticketTierName : lineItems.map((item) => `${item.ticketTierName} × ${item.quantity}`).join(', '),
    quantity, unitPriceAmountMinor: first.unitPriceAmountMinor,
    subtotalAmountMinor: subtotal, feesAmountMinor: 0, totalAmountMinor: subtotal,
    currency: currency!, expiresAt: new Date(now + 10 * 60 * 1000).toISOString(),
    earlyBirdQuantity: lineItems.reduce((sum, item) => sum + item.earlyBirdQuantity, 0),
    earlyBirdUnitPriceAmountMinor: first.earlyBirdUnitPriceAmountMinor,
    standardQuantity: lineItems.reduce((sum, item) => sum + item.standardQuantity, 0),
    standardUnitPriceAmountMinor: first.standardUnitPriceAmountMinor,
    lineItems,
  }, discountCode);
}

/** Existing bookings remain readable without a data migration. */
export function bookingSelections(booking: BookingEntity): TicketSelection[] {
  return booking.lineItems?.length ? booking.lineItems : [{ ticketTierId: booking.ticketTierId, quantity: booking.quantity }];
}
