'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { adminGetEvents } from '@/lib/api';
import { formatEventDate } from '@/lib/format';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-bb-neutral text-bb-text-muted',
  PUBLISHED: 'bg-bb-pale-green text-bb-green',
  SALES_PAUSED: 'bg-[#FFF7DA] text-[#B8860B]',
  SOLD_OUT: 'bg-bb-pale-pink text-bb-pink',
  CANCELLED: 'bg-[#FFF0EF] text-bb-red',
  COMPLETED: 'bg-bb-pale-blue text-bb-blue',
  ARCHIVED: 'bg-bb-neutral text-bb-text-muted',
};

export default function AdminEventsPage() {
  const { token } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    adminGetEvents(token)
      .then((res) => setEvents(res.data))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-bb-text">Events</h1>
        <Link href="/admin/events/new" className="bg-bb-orange hover:bg-bb-orange-dark text-white font-semibold px-5 py-2.5 rounded-full transition-colors text-sm">
          + New event
        </Link>
      </div>

      {loading ? (
        <p className="text-bb-text-secondary">Loading…</p>
      ) : (
        <div className="bg-bb-surface border border-bb-border rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bb-neutral text-bb-text-secondary text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">City</th>
                <th className="px-4 py-2 font-medium">Sold / Capacity</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-t border-bb-border hover:bg-bb-neutral/50">
                  <td className="px-4 py-2">
                    <Link href={`/admin/events/${e.id}`} className="text-bb-green font-semibold hover:underline">
                      {e.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-bb-text-secondary">{formatEventDate(e.startDateTime, e.timezone)}</td>
                  <td className="px-4 py-2 text-bb-text-secondary">{e.city}</td>
                  <td className="px-4 py-2 text-bb-text-secondary">{e.totalTicketsSold} / {e.capacity}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[e.status] || ''}`}>
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.length === 0 && <p className="text-center text-bb-text-secondary py-10">No events yet.</p>}
        </div>
      )}
    </div>
  );
}
