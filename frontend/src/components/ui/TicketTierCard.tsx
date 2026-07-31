import { formatMoney } from '@/lib/format';

export interface TicketTierData {
  id: string;
  type: string;
  name: string;
  description?: string;
  priceAmountMinor: number;
  currency: string;
  available: number;
  minPerOrder: number;
  maxPerOrder: number;
  groupMinSize?: number;
  onSale: boolean;
}

export default function TicketTierCard({
  tier,
  selected,
  onSelect,
}: {
  tier: TicketTierData;
  selected?: boolean;
  onSelect?: (tier: TicketTierData) => void;
}) {
  const soldOut = tier.available <= 0;
  const disabled = soldOut || !tier.onSale;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect?.(tier)}
      className={`w-full text-left rounded-2xl border p-4 transition-colors ${
        selected ? 'border-bb-green bg-bb-pale-green' : 'border-bb-border bg-bb-surface hover:border-bb-green'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="flex justify-between items-start gap-4">
        <div>
          <p className="font-semibold text-bb-text">{tier.name}</p>
          {tier.description && <p className="text-sm text-bb-text-secondary mt-0.5">{tier.description}</p>}
          {tier.groupMinSize && (
            <p className="text-xs text-bb-text-muted mt-1">Minimum {tier.groupMinSize} tickets per order</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-bb-text">{formatMoney(tier.priceAmountMinor, tier.currency)}</p>
          {soldOut ? (
            <p className="text-xs font-medium text-bb-red mt-1">Sold out</p>
          ) : !tier.onSale ? (
            <p className="text-xs font-medium text-bb-text-muted mt-1">Not on sale</p>
          ) : tier.available <= 10 ? (
            <p className="text-xs font-medium text-bb-orange mt-1">{tier.available} left</p>
          ) : null}
        </div>
      </div>
    </button>
  );
}
