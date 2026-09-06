'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TicketTierData } from '@/components/ui/TicketTierCard';
import TicketQuantitySelector from '@/components/ui/TicketQuantitySelector';
import { formatMoney } from '@/lib/format';
import { getPriceQuote } from '@/lib/api';

export default function EventDetailTiers({ event }: { event: any }) {
  const router = useRouter();
  const tiers: TicketTierData[] = event.ticketTiers || [];
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [quote, setQuote] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const soldOut = event.status === 'SOLD_OUT' || event.availableTickets <= 0;
  const salesClosed = event.isPast || event.status === 'CANCELLED' || event.status === 'COMPLETED' || event.status === 'SALES_PAUSED';

  const selectedId = Object.keys(quantities).find((id) => quantities[id] > 0);
  const selected = tiers.find((t) => t.id === selectedId);
  const quantity = selected ? quantities[selected.id] : 0;

  // Only one ticket type can be purchased per order — picking a quantity for
  // one tier clears any quantity set on the others.
  function setTierQuantity(tier: TicketTierData, next: number) {
    setQuantities(next > 0 ? { [tier.id]: next } : {});
  }

  function handleChange(tier: TicketTierData, next: number) {
    const current = quantities[tier.id] || 0;
    if (next <= 0) {
      setTierQuantity(tier, 0);
    } else if (current === 0) {
      // Jump straight to the tier's minimum (e.g. group deals) instead of 1.
      setTierQuantity(tier, Math.max(next, tier.minPerOrder));
    } else if (next < tier.minPerOrder) {
      setTierQuantity(tier, 0);
    } else {
      setTierQuantity(tier, next);
    }
  }

  useEffect(() => {
    if (!selected || quantity < 1) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    const timer = setTimeout(() => {
      getPriceQuote({ eventId: event.id, ticketTierId: selected.id, quantity })
        .then((res) => {
          if (!cancelled) setQuote(res.data);
        })
        .catch(() => {
          if (!cancelled) setQuote(null);
        })
        .finally(() => {
          if (!cancelled) setQuoteLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [event.id, selected, quantity]);

  function goToCheckout() {
    if (!selected) return;
    router.push(`/checkout/${event.id}?tier=${selected.id}&qty=${quantity}&slug=${event.slug}`);
  }

  if (soldOut) {
    return (
      <div className="bg-bb-surface border border-bb-border rounded-2xl p-6 text-center sticky top-24">
        <p className="font-semibold text-bb-text">Sold out</p>
        <p className="text-sm text-bb-text-secondary mt-1">
          Check back later in case tickets become available.
        </p>
      </div>
    );
  }

  if (salesClosed) {
    return (
      <div className="bg-bb-surface border border-bb-border rounded-2xl p-6 text-center sticky top-24">
        <p className="font-semibold text-bb-text">
          {event.status === 'CANCELLED'
            ? 'This event has been cancelled'
            : event.isPast
              ? 'This event has ended'
              : 'Tickets are not currently available'}
        </p>
      </div>
    );
  }

  const subtotalAmountMinor = quote?.totalAmountMinor ?? (selected ? selected.priceAmountMinor * quantity : 0);
  const currency = selected?.currency || tiers[0]?.currency || 'EUR';

  return (
    <div className="bg-bb-surface border border-bb-border rounded-2xl p-5 sticky top-24 space-y-1">
      <h2 className="font-display font-bold text-lg text-bb-text mb-3">Select tickets</h2>
      <div className="divide-y divide-bb-border">
        {tiers.map((tier) => {
          const tierQty = quantities[tier.id] || 0;
          const tierSoldOut = tier.available <= 0;
          const disabled = tierSoldOut || !tier.onSale;
          const max = disabled ? 0 : Math.min(tier.maxPerOrder, tier.available, event.perOrderLimit);

          return (
            <div key={tier.id} className={`py-4 flex items-center justify-between gap-4 ${disabled ? 'opacity-50' : ''}`}>
              <div className="min-w-0">
                <p className="font-semibold text-bb-text">{tier.name}</p>
                <p className="text-sm text-bb-text-secondary mt-0.5">
                  {formatMoney(tier.priceAmountMinor, tier.currency)}
                </p>
                {tier.description && (
                  <p className="text-xs text-bb-text-muted mt-1">{tier.description}</p>
                )}
                {tier.groupMinSize && (
                  <p className="text-xs text-bb-text-muted mt-1">
                    Buy {tier.groupMinSize} tickets for {formatMoney(tier.priceAmountMinor * tier.groupMinSize, tier.currency)}
                  </p>
                )}
                {tierSoldOut ? (
                  <p className="text-xs font-medium text-bb-red mt-1">Sold out</p>
                ) : !tier.onSale ? (
                  <p className="text-xs font-medium text-bb-text-muted mt-1">Not on sale</p>
                ) : tier.available <= 10 ? (
                  <p className="text-xs font-medium text-bb-gold mt-1">{tier.available} left</p>
                ) : null}
              </div>
              <TicketQuantitySelector
                quantity={tierQty}
                onChange={(next) => handleChange(tier, next)}
                min={0}
                max={max}
              />
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-bb-border space-y-3">
        <div className="flex items-center justify-between font-bold text-bb-text">
          <span>Subtotal</span>
          <span>{quoteLoading ? '…' : formatMoney(subtotalAmountMinor, currency)}</span>
        </div>
        {!quoteLoading && quote?.earlyBirdQuantity > 0 && (
          <p className="text-xs text-bb-gold">
            Early Bird price automatically applied to {quote.earlyBirdQuantity} of your tickets
          </p>
        )}
        <button
          onClick={goToCheckout}
          disabled={!selected || quantity < 1}
          className="w-full bg-bb-gold hover:bg-bb-gold-dark disabled:opacity-40 disabled:cursor-not-allowed text-bb-ink font-semibold py-3 rounded-full transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

