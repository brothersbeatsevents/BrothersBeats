'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { adminGetEvents, adminGetTicketTiers, adminCreateManualBooking } from '@/lib/api';
import { formatMoney } from '@/lib/format';

export default function NewManualBookingPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [eventId, setEventId] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const items = Object.entries(quantities).filter(([, quantity]) => quantity > 0).map(([ticketTierId, quantity]) => ({ ticketTierId, quantity }));
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (token) adminGetEvents(token).then((res) => setEvents(res.data.filter((e: any) => e.status !== 'CANCELLED')));
  }, [token]);

  useEffect(() => {
    if (token && eventId) adminGetTicketTiers(eventId, token).then((res) => setTiers(res.data));
    else setTiers([]);
    setQuantities({});
  }, [token, eventId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const res = await adminCreateManualBooking(
        { eventId, items, buyerName, buyerEmail, paymentMethod },
        token,
      );
      router.push(`/admin/bookings/${res.data.bookingReference}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create booking.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display font-bold text-2xl text-bb-text mb-6">New manual booking</h1>

      <form onSubmit={handleSubmit} className="space-y-4 bg-bb-surface border border-bb-border rounded-2xl p-6">
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Event</label>
          <select required value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm">
            <option value="">Select an event</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-bb-text mb-1">Ticket types</legend>
          {tiers.map((tier) => (
            <label key={tier.id} className="flex items-center justify-between gap-3 text-sm text-bb-text">
              <span>{tier.name} — {tier.priceAmountMinor === 0 ? 'Free' : formatMoney(tier.priceAmountMinor, tier.currency)}</span>
              <input aria-label={`${tier.name} quantity`} type="number" min={0} max={tier.maxQuantity - tier.quantitySold - tier.quantityReserved} value={quantities[tier.id] || 0} onChange={(e) => setQuantities((current) => ({ ...current, [tier.id]: Number(e.target.value) }))} className="w-20 rounded-lg border border-bb-border px-3 py-2 text-sm" />
            </label>
          ))}
        </fieldset>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Buyer name</label>
          <input required value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Buyer email</label>
          <input required type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Payment method</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm">
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="COMPLIMENTARY">Complimentary</option>
            <option value="EXTERNAL">External</option>
          </select>
        </div>
        {error && <p className="text-sm text-bb-red">{error}</p>}
        <button type="submit" disabled={saving || !items.length} className="bg-bb-gold hover:bg-bb-gold-dark disabled:opacity-60 text-bb-ink font-semibold px-6 py-2.5 rounded-full transition-colors">
          {saving ? 'Creating…' : 'Create booking'}
        </button>
      </form>
    </div>
  );
}
