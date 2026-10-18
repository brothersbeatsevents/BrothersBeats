import { db } from '../store';
import { DiscountCodeEntity, PriceQuote } from '../types';

export class DiscountCodeError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function normalizeDiscountCode(input: unknown): string {
  if (typeof input !== 'string' || !/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(input.trim().toUpperCase())) {
    throw new DiscountCodeError('Use a code of 3–40 letters, numbers, hyphens or underscores');
  }
  return input.trim().toUpperCase();
}

/** Round the saving per ticket so the preview and Stripe unit prices agree exactly. */
export async function applyDiscountCode(quote: PriceQuote, input: unknown): Promise<PriceQuote> {
  if (input === undefined || input === '') return quote;
  const code = normalizeDiscountCode(input);
  const discount = await db.get<DiscountCodeEntity>('discountCodes', code);
  if (!discount || !discount.active || discount.eventId !== quote.eventId ||
      (discount.expiresAt && Date.parse(discount.expiresAt) <= Date.now()) ||
      (discount.discountType === 'FIXED' && discount.currency !== quote.currency)) {
    throw new DiscountCodeError('This discount code is invalid, expired or unavailable for this event');
  }
  const discountedUnit = (price: number) => Math.max(0, price - (discount.discountType === 'PERCENTAGE'
    ? Math.round(price * Math.round(discount.value * 100) / 10000) : discount.value));
  let savings = 0;
  const lineItems = quote.lineItems!.map((line) => {
    if (discount.ticketTierIds.length && !discount.ticketTierIds.includes(line.ticketTierId)) return line;
    const early = discountedUnit(line.earlyBirdUnitPriceAmountMinor);
    const standard = discountedUnit(line.standardUnitPriceAmountMinor);
    const total = early * line.earlyBirdQuantity + standard * line.standardQuantity;
    const saving = line.subtotalAmountMinor - total;
    savings += saving;
    return { ...line, discountAmountMinor: saving, totalAmountMinor: total,
      discountedEarlyBirdUnitPriceAmountMinor: early, discountedStandardUnitPriceAmountMinor: standard };
  });
  if (!savings) throw new DiscountCodeError('This code does not discount any of the selected tickets');
  return { ...quote, lineItems, discountCode: code, discountAmountMinor: savings,
    totalAmountMinor: quote.subtotalAmountMinor + quote.feesAmountMinor - savings };
}
