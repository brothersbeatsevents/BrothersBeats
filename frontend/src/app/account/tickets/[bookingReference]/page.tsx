'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getMyBooking, resendMyTickets } from '@/lib/api';
import TicketCard, { TicketCardData } from '@/components/ui/TicketCard';
import ErrorState from '@/components/ui/ErrorState';
import { formatMoney, formatEventDate } from '@/lib/format';

export default function BookingDetailPage() {
  const { token } = useAuth();
  const params = useParams<{ bookingReference: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!token) return;
    getMyBooking(params.bookingReference, token)
      .then((res) => setBooking(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, params.bookingReference]);

  async function handleResend() {
    if (!token) return;
    setResending(true);
    try {
      await resendMyTickets(params.bookingReference, token);
      setResent(true);
    } finally {
      setResending(false);
    }
  }

  if (loading) return <p className="text-bb-text-secondary">Loading…</p>;
  if (error || !booking) return <ErrorState title="Booking not found" message={error} />;

  const tickets: TicketCardData[] = booking.tickets || [];

  return (
    <div>
      <Link href="/account/tickets" className="text-sm text-bb-green hover:text-bb-green-dark">
        &larr; Back to my tickets
      </Link>

      <h1 className="font-display font-bold text-3xl text-bb-text mt-3 mb-1">{booking.event?.title}</h1>
      <p className="text-bb-text-secondary mb-1">
        {booking.event?.venueName}, {booking.event?.city}
      </p>
      <p className="text-sm text-bb-text-muted mb-6">
        {formatEventDate(booking.eventStartDateTimeSnapshot, booking.event?.timezone)} · Ref: {booking.bookingReference}
      </p>

      <div className="bg-bb-surface border border-bb-border rounded-2xl p-6 mb-8 flex flex-wrap gap-6 justify-between">
        <div>
          <p className="text-sm text-bb-text-secondary">Status</p>
          <p className="font-semibold text-bb-text">{booking.bookingStatus}</p>
        </div>
        <div>
          <p className="text-sm text-bb-text-secondary">Tickets</p>
          <p className="font-semibold text-bb-text">{booking.quantity}</p>
        </div>
        <div>
          <p className="text-sm text-bb-text-secondary">Total paid</p>
          <p className="font-semibold text-bb-text">{formatMoney(booking.totalAmountMinor, booking.currency)}</p>
        </div>
      </div>

      {booking.bookingStatus === 'CONFIRMED' && (
        <div className="mb-8">
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-sm font-semibold text-bb-green hover:text-bb-green-dark border border-bb-green rounded-full px-5 py-2 transition-colors disabled:opacity-60"
          >
            {resending ? 'Sending…' : resent ? 'Tickets resent!' : 'Resend tickets by email'}
          </button>
        </div>
      )}

      {tickets.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display font-bold text-xl text-bb-text mb-2">Your tickets</h2>
          {tickets.map((t) => (
            <TicketCard key={t.id} ticket={t} eventTitle={booking.event?.title} />
          ))}
        </div>
      )}
    </div>
  );
}
