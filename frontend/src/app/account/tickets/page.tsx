'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getMyBookings } from '@/lib/api';
import BookingStatusCard, { BookingSummary } from '@/components/ui/BookingStatusCard';
import EmptyState from '@/components/ui/EmptyState';

export default function MyTicketsPage() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    getMyBookings(token)
      .then((res) => setBookings(res.data))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <h1 className="font-display font-bold text-3xl text-bb-text mb-8">My tickets</h1>

      {loading ? (
        <p className="text-bb-text-secondary">Loading…</p>
      ) : bookings.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          message="When you book an event, it will show up here."
          action={<Link href="/events" className="inline-block bg-bb-orange hover:bg-bb-orange-dark text-white font-semibold px-6 py-2.5 rounded-full transition-colors">Browse events</Link>}
        />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Link key={b.bookingReference} href={`/account/tickets/${b.bookingReference}`}>
              <BookingStatusCard booking={b} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
