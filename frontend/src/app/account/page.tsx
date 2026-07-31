'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getMyBookings } from '@/lib/api';
import BookingStatusCard, { BookingSummary } from '@/components/ui/BookingStatusCard';

export default function AccountOverviewPage() {
  const { user, token, logout } = useAuth();
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    getMyBookings(token)
      .then((res) => setBookings(res.data))
      .finally(() => setLoading(false));
  }, [token]);

  const upcoming = bookings.filter(
    (b) => b.bookingStatus === 'CONFIRMED' && new Date(b.eventStartDateTimeSnapshot) > new Date(),
  );

  return (
    <div>
      <h1 className="font-display font-bold text-3xl text-bb-text mb-1">Welcome back, {user?.display_name}</h1>
      <p className="text-bb-text-secondary mb-8">{user?.email}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <div className="bg-bb-surface border border-bb-border rounded-2xl p-6">
          <p className="text-sm text-bb-text-secondary">Upcoming bookings</p>
          <p className="font-display font-bold text-3xl text-bb-text mt-1">{upcoming.length}</p>
        </div>
        <div className="bg-bb-surface border border-bb-border rounded-2xl p-6">
          <p className="text-sm text-bb-text-secondary">Total bookings</p>
          <p className="font-display font-bold text-3xl text-bb-text mt-1">{bookings.length}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-xl text-bb-text">Recent bookings</h2>
        <Link href="/account/tickets" className="text-sm font-semibold text-bb-green hover:text-bb-green-dark">
          View all
        </Link>
      </div>

      {loading ? (
        <p className="text-bb-text-secondary">Loading…</p>
      ) : bookings.length === 0 ? (
        <div className="bg-bb-neutral rounded-2xl p-8 text-center">
          <p className="text-bb-text-secondary mb-4">You haven&apos;t booked any events yet.</p>
          <Link href="/events" className="inline-block bg-bb-orange hover:bg-bb-orange-dark text-white font-semibold px-6 py-2.5 rounded-full transition-colors">
            Browse events
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.slice(0, 3).map((b) => (
            <Link key={b.bookingReference} href={`/account/tickets/${b.bookingReference}`}>
              <BookingStatusCard booking={b} />
            </Link>
          ))}
        </div>
      )}

      <button onClick={logout} className="mt-10 text-sm font-semibold text-bb-red hover:underline">
        Sign out
      </button>
    </div>
  );
}
