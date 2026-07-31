'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { adminGetDashboard } from '@/lib/api';
import { formatMoney } from '@/lib/format';

export default function AdminDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (token) adminGetDashboard(token).then((res) => setData(res.data));
  }, [token]);

  if (!data) return <p className="text-bb-text-secondary">Loading dashboard…</p>;

  const stats = [
    { label: 'Total revenue', value: formatMoney(data.totalRevenueMinor, 'EUR') },
    { label: 'Confirmed bookings', value: data.confirmedBookings },
    { label: 'Tickets sold', value: data.totalTicketsSold },
    { label: 'Upcoming events', value: data.upcomingEventsCount },
    { label: 'Pending reservations', value: data.pendingReservations },
    { label: 'Active subscribers', value: data.activeSubscribers },
  ];

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-bb-text mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-bb-surface border border-bb-border rounded-2xl p-5">
            <p className="text-sm text-bb-text-secondary">{s.label}</p>
            <p className="font-display font-bold text-2xl text-bb-text mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-lg text-bb-text">Recent bookings</h2>
        <Link href="/admin/bookings" className="text-sm font-semibold text-bb-green hover:text-bb-green-dark">
          View all
        </Link>
      </div>

      <div className="bg-bb-surface border border-bb-border rounded-2xl overflow-hidden">
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
            {data.recentBookings.map((b: any) => (
              <tr key={b.bookingReference} className="border-t border-bb-border">
                <td className="px-4 py-2">
                  <Link href={`/admin/bookings/${b.bookingReference}`} className="text-bb-green font-semibold hover:underline">
                    {b.bookingReference}
                  </Link>
                </td>
                <td className="px-4 py-2 text-bb-text">{b.eventTitleSnapshot}</td>
                <td className="px-4 py-2 text-bb-text-secondary">{b.buyerName}</td>
                <td className="px-4 py-2 text-bb-text">{formatMoney(b.totalAmountMinor, b.currency)}</td>
                <td className="px-4 py-2 text-bb-text-secondary">{b.bookingStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
