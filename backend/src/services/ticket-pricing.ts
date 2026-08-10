// ──────────────────────────────────────────
// Blended Early Bird pricing — Early Bird is never sold as its own selectable
// ticket type. Instead, the first N "General Admission" (STANDARD) tickets
// booked for an event are automatically priced at the Early Bird rate, where
// N is however many Early Bird tickets remain, and the rest are priced at the
// standard rate. Used by both the price-quote preview and checkout so the two
// never disagree.
// ──────────────────────────────────────────

import { db } from '../store';
import { TicketTierEntity } from '../types';

export interface BlendedPrice {
  standardQuantity: number;
  standardUnitPriceAmountMinor: number;
  earlyBirdQuantity: number;
  earlyBirdUnitPriceAmountMinor: number;
  subtotalAmountMinor: number;
}

function flatPrice(tier: TicketTierEntity, qty: number): BlendedPrice {
  return {
    standardQuantity: qty,
    standardUnitPriceAmountMinor: tier.priceAmountMinor,
    earlyBirdQuantity: 0,
    earlyBirdUnitPriceAmountMinor: 0,
    subtotalAmountMinor: tier.priceAmountMinor * qty,
  };
}

/** Blend Early Bird + standard pricing for `qty` tickets of `tier` (the tier the buyer actually selected). */
export async function computeBlendedPrice(
  tier: TicketTierEntity,
  qty: number,
): Promise<BlendedPrice> {
  // Early Bird discount only ever applies to General Admission (STANDARD) tickets.
  if (tier.type !== 'STANDARD') return flatPrice(tier, qty);

  const now = Date.now();
  const siblingTiers = await db.filterBy<TicketTierEntity>('ticketTiers', 'eventId', tier.eventId);
  const earlyBird = siblingTiers.find(
    (t) =>
      t.type === 'EARLY_BIRD' &&
      t.active &&
      new Date(t.salesStartAt).getTime() <= now &&
      new Date(t.salesEndAt).getTime() >= now,
  );
  if (!earlyBird) return flatPrice(tier, qty);

  // Tickets already sold/reserved against the STANDARD tier stand in for how many
  // Early Bird slots have been consumed, since Early Bird can no longer be booked directly.
  const alreadyConsumed = tier.quantitySold + tier.quantityReserved;
  const earlyBirdRemaining = Math.max(0, earlyBird.maxQuantity - alreadyConsumed);
  const earlyBirdQuantity = Math.min(qty, earlyBirdRemaining);
  const standardQuantity = qty - earlyBirdQuantity;

  return {
    standardQuantity,
    standardUnitPriceAmountMinor: tier.priceAmountMinor,
    earlyBirdQuantity,
    earlyBirdUnitPriceAmountMinor: earlyBird.priceAmountMinor,
    subtotalAmountMinor:
      earlyBirdQuantity * earlyBird.priceAmountMinor + standardQuantity * tier.priceAmountMinor,
  };
}
