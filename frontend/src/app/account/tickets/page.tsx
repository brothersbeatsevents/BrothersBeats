'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getMyBookings } from '@/lib/api';
import BookingStatusCard, { BookingSummary } from '@/components/ui/BookingStatusCard';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';

export default function MyTicketsPage() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    getMyBookings(token)
      .then((res) => setBookings(res.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load your bookings.'))
      .finally(() => setLoading(false));
  }, [token, attempt]);

  return (
    <div>
      <h1 className="font-display font-bold text-3xl text-bb-text mb-8">My tickets</h1>

      {loading ? (
        <p className="text-bb-text-secondary">Loading…</p>
      ) : error ? (
        <ErrorState title="Could not load your bookings" message={error} onRetry={() => setAttempt((value) => value + 1)} />
      ) : bookings.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          message="Use the same email you used at checkout. If you booked with another email, you can recover your tickets by email."
          action={<Link href="/booking/lookup?method=guest" className="inline-block bg-bb-gold hover:bg-bb-gold-dark text-bb-ink font-semibold px-6 py-2.5 rounded-full transition-colors">Find my ticket</Link>}
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
