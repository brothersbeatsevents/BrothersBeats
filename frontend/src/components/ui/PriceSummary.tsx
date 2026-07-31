import { formatMoney } from '@/lib/format';

export interface PriceQuoteData {
  ticketTierName: string;
  quantity: number;
  unitPriceAmountMinor: number;
  subtotalAmountMinor: number;
  feesAmountMinor: number;
  totalAmountMinor: number;
  currency: string;
}

export default function PriceSummary({ quote }: { quote: PriceQuoteData }) {
  return (
    <div className="bg-bb-neutral rounded-2xl p-5 space-y-2 text-sm">
      <div className="flex justify-between text-bb-text-secondary">
        <span>
          {quote.ticketTierName} × {quote.quantity}
        </span>
        <span>{formatMoney(quote.unitPriceAmountMinor * quote.quantity, quote.currency)}</span>
      </div>
      {quote.feesAmountMinor > 0 && (
        <div className="flex justify-between text-bb-text-secondary">
          <span>Fees</span>
          <span>{formatMoney(quote.feesAmountMinor, quote.currency)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-bb-text text-base pt-2 border-t border-bb-border">
        <span>Total</span>
        <span>{formatMoney(quote.totalAmountMinor, quote.currency)}</span>
      </div>
    </div>
  );
}
