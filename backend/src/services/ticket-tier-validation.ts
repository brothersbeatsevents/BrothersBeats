import { TicketTierEntity } from '../types';

export function validateTicketTier(tier: TicketTierEntity): string | null {
  if (!['EARLY_BIRD', 'STANDARD', 'GROUP', 'CHILD', 'VIP', 'COMPLIMENTARY', 'CUSTOM'].includes(tier.type)) return 'Invalid ticket type';
  if (typeof tier.name !== 'string' || !tier.name.trim()) return 'Ticket name is required';
  if (!Number.isSafeInteger(tier.priceAmountMinor) || tier.priceAmountMinor < 0) return 'Price must be a non-negative amount in minor units';
  if (!Number.isSafeInteger(tier.maxQuantity) || tier.maxQuantity < 1) return 'Capacity must be a positive integer';
  if (tier.maxQuantity < tier.quantitySold + tier.quantityReserved) return 'Capacity cannot be less than tickets already sold/reserved';
  if (!Number.isSafeInteger(tier.minPerOrder) || tier.minPerOrder < 1 ||
      !Number.isSafeInteger(tier.maxPerOrder) || tier.maxPerOrder < tier.minPerOrder) return 'Invalid per-order limits';
  if (tier.groupMinSize !== undefined && (!Number.isSafeInteger(tier.groupMinSize) || tier.groupMinSize < 1 || tier.groupMinSize > tier.maxPerOrder)) return 'Invalid minimum group size';
  if (!Number.isFinite(Date.parse(tier.salesStartAt)) || !Number.isFinite(Date.parse(tier.salesEndAt)) ||
      Date.parse(tier.salesEndAt) <= Date.parse(tier.salesStartAt)) return 'Sales end must be after sales start';
  if (typeof tier.currency !== 'string' || !/^[A-Z]{3}$/.test(tier.currency)) return 'Currency must be a three-letter uppercase code';
  return null;
}
