import { formatMoney } from '@/lib/format';

export interface PriceLineData {
  ticketTierName: string;
  quantity: number;
  unitPriceAmountMinor: number;
  earlyBirdQuantity?: number;
  earlyBirdUnitPriceAmountMinor?: number;
  standardQuantity?: number;
  standardUnitPriceAmountMinor?: number;
}

export interface PriceQuoteData extends PriceLineData {
  lineItems?: PriceLineData[];
  subtotalAmountMinor: number;
  discountCode?: string;
  discountAmountMinor?: number;
  feesAmountMinor: number;
  totalAmountMinor: number;
  currency: string;
}

export default function PriceSummary({ quote }: { quote: PriceQuoteData }) {
  const lines = quote.lineItems?.length ? quote.lineItems : [quote];
  const amount = (minor: number) => minor === 0 ? 'Free' : formatMoney(minor, quote.currency);

  return (
    <div className="bg-bb-neutral rounded-2xl p-5 space-y-2 text-sm">
      {lines.map((line, index) => (
        <div key={index} className="space-y-2">
          {!!line.earlyBirdQuantity && (
            <div className="flex justify-between gap-3 text-bb-text-secondary">
              <span>{line.ticketTierName} (Early Bird) × {line.earlyBirdQuantity}</span>
              <span>{amount((line.earlyBirdUnitPriceAmountMinor || 0) * line.earlyBirdQuantity)}</span>
            </div>
          )}
          {(!line.earlyBirdQuantity || !!line.standardQuantity) && (
            <div className="flex justify-between gap-3 text-bb-text-secondary">
              <span>{line.ticketTierName} × {line.earlyBirdQuantity ? line.standardQuantity : line.quantity}</span>
              <span>{amount(line.earlyBirdQuantity
                ? (line.standardUnitPriceAmountMinor || 0) * (line.standardQuantity || 0)
                : line.unitPriceAmountMinor * line.quantity)}</span>
            </div>
          )}
        </div>
      ))}
      {!!quote.discountAmountMinor && (
        <div className="flex justify-between gap-3 text-green-700">
          <span>Discount ({quote.discountCode})</span>
          <span>−{formatMoney(quote.discountAmountMinor, quote.currency)}</span>
        </div>
      )}
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
