'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TicketTierData } from '@/components/ui/TicketTierCard';
import TicketQuantitySelector from '@/components/ui/TicketQuantitySelector';
import { formatMoney } from '@/lib/format';
import { getEvent, getPriceQuote } from '@/lib/api';

export default function EventDetailTiers({ event: initialEvent }: { event: any }) {
  const router = useRouter();
  const [event, setEvent] = useState(initialEvent);
  const availabilityRequest = useRef(0);
  const tiers: TicketTierData[] = event.ticketTiers || [];
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [quote, setQuote] = useState<any>(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const availabilityKey = JSON.stringify([event.status, event.isPast, event.availableTickets, event.perOrderLimit, tiers]);

  const refreshAvailability = useCallback(async () => {
    const requestId = ++availabilityRequest.current;
    try {
      const response = await getEvent(initialEvent.slug);
      if (requestId === availabilityRequest.current) setEvent(response.data);
    } catch {
      // Quotes and checkout still validate availability if a refresh fails.
    }
  }, [initialEvent.slug]);

  useEffect(() => {
    setEvent(initialEvent);
    const refresh = () => { if (!document.hidden) void refreshAvailability(); };
    refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      availabilityRequest.current++;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [initialEvent, refreshAvailability]);

  const soldOut = event.status === 'SOLD_OUT' || event.availableTickets <= 0;
  const salesClosed = event.isPast || event.status === 'CANCELLED' || event.status === 'COMPLETED' || event.status === 'SALES_PAUSED';

  const items = useMemo(() => Object.entries(quantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([ticketTierId, quantity]) => ({ ticketTierId, quantity })), [quantities]);
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);

  function setTierQuantity(tier: TicketTierData, next: number) {
    setQuantities((current) => ({ ...current, [tier.id]: next }));
  }

  function handleChange(tier: TicketTierData, next: number) {
    const current = quantities[tier.id] || 0;
    if (next <= 0) {
      setTierQuantity(tier, 0);
    } else if (current === 0) {
      // Jump straight to the tier's minimum (e.g. group deals) instead of 1.
      setTierQuantity(tier, Math.max(next, tier.minPerOrder, tier.groupMinSize || 1));
    } else if (next < Math.max(tier.minPerOrder, tier.groupMinSize || 1)) {
      setTierQuantity(tier, 0);
    } else {
      setTierQuantity(tier, next);
    }
  }

  useEffect(() => {
    setQuoteError('');
    if (quantity < 1) {
      setQuote(null);
      setQuoteLoading(false);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    setQuote(null);
    const timer = setTimeout(() => {
      getPriceQuote({ eventId: event.id, items })
        .then((res) => {
          if (!cancelled) setQuote(res.data);
        })
        .catch((err) => {
          if (!cancelled) {
            setQuote(null);
            setQuoteError(err.message || 'Unable to check ticket availability');
            void refreshAvailability();
          }
        })
        .finally(() => {
          if (!cancelled) setQuoteLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [event.id, items, quantity, availabilityKey, refreshAvailability]);

  function goToCheckout() {
    if (!items.length) return;
    const query = new URLSearchParams({ items: JSON.stringify(items), slug: event.slug });
    router.push(`/checkout/${event.id}?${query}`);
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

  const subtotalAmountMinor = quote?.totalAmountMinor ?? items.reduce((sum, item) => sum + (tiers.find((tier) => tier.id === item.ticketTierId)?.priceAmountMinor || 0) * item.quantity, 0);
  const currency = tiers[0]?.currency || 'EUR';

  return (
    <div className="bg-bb-surface border border-bb-border rounded-2xl p-5 sticky top-24 space-y-1">
      <h2 className="font-display font-bold text-lg text-bb-text mb-3">Select tickets</h2>
      <div className="divide-y divide-bb-border">
        {tiers.map((tier) => {
          const tierQty = quantities[tier.id] || 0;
          const tierSoldOut = tier.available <= 0;
          const disabled = tierSoldOut || !tier.onSale;
          const availableMax = disabled ? 0 : Math.min(tier.maxPerOrder, tier.available, event.perOrderLimit - quantity + tierQty, event.availableTickets - quantity + tierQty);

          const max = tierQty === 0 && availableMax < Math.max(tier.minPerOrder, tier.groupMinSize || 1) ? 0 : availableMax;

          return (
            <div key={tier.id} role="group" aria-label={tier.name} className={`py-4 flex items-center justify-between gap-4 ${disabled ? 'opacity-50' : ''}`}>
              <div className="min-w-0">
                <p className="font-semibold text-bb-text">{tier.name}</p>
                <p className="text-sm text-bb-text-secondary mt-0.5">
                  {tier.priceAmountMinor === 0 ? 'Free' : formatMoney(tier.priceAmountMinor, tier.currency)}
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
                  <p aria-live="polite" className="text-xs font-medium text-bb-gold mt-1">{tier.available} left</p>
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
        {quoteError && <p role="alert" className="text-xs text-bb-red">{quoteError}</p>}
        <button
          onClick={goToCheckout}
          disabled={quantity < 1 || quantity > event.perOrderLimit || quoteLoading || !quote}
          className="w-full bg-bb-gold hover:bg-bb-gold-dark disabled:opacity-40 disabled:cursor-not-allowed text-bb-ink font-semibold py-3 rounded-full transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

