'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { adminGetEvents, adminGetEvent, adminGetDiscountCodes, adminCreateDiscountCode,
  adminSetDiscountCodeActive, DiscountCode } from '@/lib/api';
import { formatMoney } from '@/lib/format';

export default function DiscountCodesPage() {
  const { token } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [eventId, setEventId] = useState('');
  const [ticketTierIds, setTicketTierIds] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [value, setValue] = useState('5');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!token) return;
    Promise.all([adminGetEvents(token), adminGetDiscountCodes(token)])
      .then(([eventRes, codeRes]) => { setEvents(eventRes.data); setCodes(codeRes.data); })
      .catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    setTiers([]); setTicketTierIds([]); setLoadingTiers(false);
    if (!eventId || !token) return;
    let cancelled = false;
    setLoadingTiers(true);
    adminGetEvent(eventId, token).then((res) => {
      if (!cancelled) setTiers((res.data.ticketTiers || []).filter((tier: any) => tier.type !== 'EARLY_BIRD'));
    }).catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoadingTiers(false); });
    return () => { cancelled = true; };
  }, [eventId, token]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await adminCreateDiscountCode({ eventId, ticketTierIds, code: code.trim() || undefined,
        discountType, value: discountType === 'FIXED' ? Math.round(Number(value) * 100) : Number(value),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined }, token);
      setCodes((current) => [res.data, ...current]);
      setCode('');
      setNotice(`Created ${res.data.code}. Share this code with your customers.`);
    } catch (err: any) { setError(err.message || 'Unable to create code'); }
    finally { setBusy(false); }
  }

  async function toggle(discount: DiscountCode) {
    if (!token) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await adminSetDiscountCodeActive(discount.code, !discount.active, token);
      setCodes((current) => current.map((item) => item.id === discount.id ? res.data : item));
    } catch (err: any) { setError(err.message || 'Unable to update code'); }
    finally { setBusy(false); }
  }

  const fieldClass = 'w-full rounded-lg border border-bb-border bg-white px-3 py-2 text-sm';
  const currency = tiers.find((tier) => !ticketTierIds.length || ticketTierIds.includes(tier.id))?.currency || 'EUR';

  if (loading) return <p className="text-bb-text-secondary">Loading discount codes…</p>;

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-bb-text">Discount &amp; referral codes</h1>
        <p className="mt-1 text-sm text-bb-text-secondary">Create a code to share with customers. Discounts apply to each eligible ticket, after Early Bird pricing.</p>
      </div>
      {error && <p role="alert" className="text-sm text-bb-red">{error}</p>}
      {notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
      <form onSubmit={create} className="rounded-2xl border border-bb-border bg-white p-5 space-y-4">
        <h2 className="font-semibold text-bb-text">Create code</h2>
        <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2 disabled:opacity-60">
          <label className="space-y-1 text-sm">Event
            <select required value={eventId} onChange={(e) => setEventId(e.target.value)} className={fieldClass}>
              <option value="">Select event</option>
              {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">Code (leave blank to generate)
            <input value={code} onChange={(e) => setCode(e.target.value)} minLength={3} maxLength={40}
              pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,39}" placeholder="e.g. FRIENDS10" className={`${fieldClass} uppercase`} />
          </label>
          <label className="space-y-1 text-sm">Discount type
            <select value={discountType} onChange={(e) => { setDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED'); setValue('5'); }} className={fieldClass}>
              <option value="PERCENTAGE">Percentage per ticket</option>
              <option value="FIXED">Fixed amount per ticket</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">{discountType === 'PERCENTAGE' ? 'Percentage (%)' : `Amount per ticket (${currency})`}
            <input required type="number" min="0.01" max={discountType === 'PERCENTAGE' ? 100 : undefined} step="0.01"
              value={value} onChange={(e) => setValue(e.target.value)} className={fieldClass} />
          </label>
          {discountType === 'PERCENTAGE' && <div className="flex gap-2 sm:col-span-2">
            {[5, 10].map((preset) => <button key={preset} type="button" onClick={() => setValue(String(preset))}
              className={`rounded-full border px-4 py-1 text-sm ${value === String(preset) ? 'border-bb-gold bg-bb-gold/10' : 'border-bb-border'}`}>{preset}%</button>)}
            <span className="self-center text-xs text-bb-text-secondary">Or enter your own percentage above.</span>
          </div>}
          <label className="space-y-1 text-sm">Expiry (optional, your local time)
            <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={fieldClass} />
          </label>
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm">Eligible ticket types</p>
            {loadingTiers ? <p className="text-sm text-bb-text-secondary">Loading ticket types…</p> : <>
              <p className="mb-2 text-xs text-bb-text-secondary">Leave all unchecked to include every ticket type in this event.</p>
              <div className="flex flex-wrap gap-4">{tiers.map((tier) => <label key={tier.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={ticketTierIds.includes(tier.id)} onChange={(e) => setTicketTierIds((ids) => e.target.checked ? [...ids, tier.id] : ids.filter((id) => id !== tier.id))} />
                {tier.name} ({formatMoney(tier.priceAmountMinor, tier.currency)})
              </label>)}</div>
            </>}
          </div>
        </fieldset>
        <button type="submit" disabled={busy || loadingTiers || !eventId || !tiers.length}
          className="rounded-full bg-bb-gold px-5 py-2 text-sm font-semibold text-bb-ink disabled:opacity-60">
          {busy ? 'Saving…' : 'Create discount code'}
        </button>
      </form>
      <div className="overflow-x-auto rounded-2xl border border-bb-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-bb-neutral"><tr>{['Code', 'Event / tickets', 'Discount', 'Status / expiry', 'Action'].map((heading) => <th key={heading} className="p-4 font-semibold">{heading}</th>)}</tr></thead>
          <tbody>{codes.map((discount) => <tr key={discount.id} className="border-t border-bb-border">
            <td className="p-4 font-mono font-semibold select-all">{discount.code}</td>
            <td className="p-4">{events.find((event) => event.id === discount.eventId)?.title || discount.eventId}
              <p className="text-xs text-bb-text-secondary">{discount.ticketTierIds.length ? `${discount.ticketTierIds.length} selected ticket type(s)` : 'All ticket types'}</p>
            </td>
            <td className="p-4 whitespace-nowrap">{discount.discountType === 'PERCENTAGE' ? `${discount.value}%` : formatMoney(discount.value, discount.currency)} per ticket</td>
            <td className="p-4">{!discount.active ? 'Disabled' : discount.expiresAt && Date.parse(discount.expiresAt) <= Date.now() ? 'Expired' : 'Active'}
              <p className="text-xs text-bb-text-secondary">{discount.expiresAt ? new Date(discount.expiresAt).toLocaleString() : 'No expiry'}</p>
            </td>
            <td className="p-4"><button type="button" disabled={busy} onClick={() => void toggle(discount)}
              className="font-semibold text-bb-gold disabled:opacity-60">{discount.active ? 'Disable' : 'Enable'}</button></td>
          </tr>)}</tbody>
        </table>
        {!codes.length && <p className="p-5 text-sm text-bb-text-secondary">No discount codes yet.</p>}
      </div>
    </div>
  );
}
