'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TicketTierCard, { TicketTierData } from '@/components/ui/TicketTierCard';
import TicketQuantitySelector from '@/components/ui/TicketQuantitySelector';
import { formatMoney } from '@/lib/format';

export default function EventDetailTiers({ event }: { event: any }) {
  const router = useRouter();
  const tiers: TicketTierData[] = event.ticketTiers || [];
  const [selectedId, setSelectedId] = useState<string | undefined>(
    tiers.find((t) => t.onSale && t.available > 0)?.id,
  );
  const [quantity, setQuantity] = useState(1);

  const selected = tiers.find((t) => t.id === selectedId);
  const soldOut = event.status === 'SOLD_OUT' || event.availableTickets <= 0;
  const salesClosed = event.status === 'CANCELLED' || event.status === 'COMPLETED' || event.status === 'SALES_PAUSED';

  function selectTier(tier: TicketTierData) {
    setSelectedId(tier.id);
    setQuantity(Math.min(quantity, tier.maxPerOrder));
  }

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
          {event.status === 'CANCELLED' ? 'This event has been cancelled' : 'Tickets are not currently available'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-bb-surface border border-bb-border rounded-2xl p-5 sticky top-24 space-y-4">
      <h2 className="font-display font-bold text-lg text-bb-text">Tickets</h2>
      <div className="space-y-3">
        {tiers.map((tier) => (
          <TicketTierCard key={tier.id} tier={tier} selected={tier.id === selectedId} onSelect={selectTier} />
        ))}
      </div>

      {selected && (
        <div className="pt-3 border-t border-bb-border space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-bb-text">Quantity</span>
            <TicketQuantitySelector
              quantity={quantity}
              onChange={setQuantity}
              min={selected.minPerOrder}
              max={Math.min(selected.maxPerOrder, selected.available, event.perOrderLimit)}
            />
          </div>
          <div className="flex items-center justify-between font-bold text-bb-text">
            <span>Total</span>
            <span>{formatMoney(selected.priceAmountMinor * quantity, selected.currency)}</span>
          </div>
          <button
            onClick={goToCheckout}
            className="w-full bg-bb-orange hover:bg-bb-orange-dark text-white font-semibold py-3 rounded-full transition-colors"
          >
            Get tickets
          </button>
        </div>
      )}
    </div>
  );
}
