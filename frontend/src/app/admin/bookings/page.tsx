'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { adminGetBookings, adminBookingsExportUrl } from '@/lib/api';
import { formatMoney } from '@/lib/format';

const STATUS_OPTIONS = [
  '', 'RESERVED_PENDING_PAYMENT', 'CONFIRMED', 'PAYMENT_FAILED', 'EXPIRED',
  'PAYMENT_REVIEW_REQUIRED', 'CANCELLED', 'REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED',
];

export default function AdminBookingsPage() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    adminGetBookings(token, { q: q || undefined, status: status || undefined })
      .then((res) => setBookings(res.data))
      .finally(() => setLoading(false));
  }, [token, q, status]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-bb-text">Bookings</h1>
        <div className="flex gap-2">
          <Link href="/admin/bookings/new" className="bg-bb-orange hover:bg-bb-orange-dark text-white font-semibold px-5 py-2.5 rounded-full transition-colors text-sm">
            + Manual booking
          </Link>
          {token && (
            <a href={adminBookingsExportUrl(undefined, token)} className="border border-bb-border font-semibold px-5 py-2.5 rounded-full text-sm hover:border-bb-green transition-colors">
              Export CSV
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          placeholder="Search reference, name, email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="rounded-lg border border-bb-border px-4 py-2 text-sm flex-1 min-w-[200px]"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-bb-border px-4 py-2 text-sm">
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s || 'All statuses'}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-bb-text-secondary">Loading…</p>
      ) : (
        <div className="bg-bb-surface border border-bb-border rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bb-neutral text-bb-text-secondary text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Reference</th>
                <th className="px-4 py-2 font-medium">Event</th>
                <th className="px-4 py-2 font-medium">Buyer</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.bookingReference} className="border-t border-bb-border hover:bg-bb-neutral/50">
                  <td className="px-4 py-2">
                    <Link href={`/admin/bookings/${b.bookingReference}`} className="text-bb-green font-semibold hover:underline">
                      {b.bookingReference}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-bb-text">{b.eventTitleSnapshot}</td>
                  <td className="px-4 py-2 text-bb-text-secondary">{b.buyerName} <br /><span className="text-xs">{b.buyerEmail}</span></td>
                  <td className="px-4 py-2 text-bb-text">{formatMoney(b.totalAmountMinor, b.currency)}</td>
                  <td className="px-4 py-2 text-bb-text-secondary text-xs">{b.bookingStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {bookings.length === 0 && <p className="text-center text-bb-text-secondary py-10">No bookings found.</p>}
        </div>
      )}
    </div>
  );
}
