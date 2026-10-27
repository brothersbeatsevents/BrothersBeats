'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getBookingConfirmation } from '@/lib/api';
import ErrorState from '@/components/ui/ErrorState';
import TicketCard, { TicketCardData } from '@/components/ui/TicketCard';
import { formatMoney } from '@/lib/format';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const bookingReference = searchParams.get('bookingReference');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    setLoading(true);
    setError(null);
    async function loadBooking() {
      try {
        const result = await getBookingConfirmation(token!);
        if (cancelled) return;
        setData(result.data);
        const waitingForTickets = result.data.bookingStatus === 'RESERVED_PENDING_PAYMENT' ||
          (result.data.bookingStatus === 'CONFIRMED' && result.data.tickets.length < result.data.quantity);
        if (waitingForTickets && ++attempts < 15) {
          timer = setTimeout(loadBooking, 2000);
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load your booking.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadBooking();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [token]);

  // Older checkout redirects carry only a reference; recover through guest lookup.
  if (!token && bookingReference) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-bb-pale-green flex items-center justify-center mb-5">
          <svg className="w-8 h-8 text-bb-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="font-display font-bold text-3xl text-bb-text">Thank you for your booking!</h1>
        <p className="mt-3 text-bb-text-secondary">
          Your booking reference is <span className="font-semibold text-bb-text">{bookingReference}</span>.
          We&apos;re confirming your payment and your tickets will be emailed to you shortly.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/booking/lookup" className="bg-bb-gold hover:bg-bb-gold-dark text-bb-ink font-semibold px-6 py-3 rounded-full transition-colors">
            Find my booking
          </Link>
          <Link href="/events" className="border border-bb-border text-bb-text font-semibold px-6 py-3 rounded-full hover:border-bb-gold transition-colors">
            Browse more events
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-bb-text-secondary">Loading your booking…</div>;
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20">
        <ErrorState title="We couldn't find this booking" message={error || 'This link may be invalid or expired.'} />
        <div className="text-center mt-4">
          <Link href="/booking/lookup" className="text-bb-gold font-semibold hover:text-bb-gold-dark">
            Try booking lookup instead
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="font-display font-bold text-3xl text-bb-text mb-1">
        {data.bookingStatus === 'CONFIRMED' ? 'Your booking and tickets' : data.bookingStatus === 'RESERVED_PENDING_PAYMENT' ? 'Confirming your booking' : 'Your booking'}
      </h1>
      <p className="text-bb-text-secondary mb-8">Reference: {data.bookingReference}</p>
      {data.bookingStatus === 'RESERVED_PENDING_PAYMENT' && (
        <p role="status" className="text-sm text-bb-text-secondary mb-6">We&apos;re confirming your payment. Your tickets will appear here when they&apos;re ready. You can also use the link in your confirmation email.</p>
      )}
      {data.bookingStatus === 'CONFIRMED' && data.tickets.length < data.quantity && (
        <p role="status" className="text-sm text-bb-text-secondary mb-6">We&apos;re preparing your tickets. They&apos;ll appear here shortly. You can also use the link in your confirmation email.</p>
      )}

      <div className="bg-bb-surface border border-bb-border rounded-2xl p-6 space-y-4">
        <div>
          <p className="font-semibold text-bb-text text-lg">{data.event?.title}</p>
          <p className="text-sm text-bb-text-secondary">
            {data.event?.venueName}, {data.event?.city}
          </p>
        </div>
        <div className="flex justify-between text-sm border-t border-bb-border pt-4">
          <span className="text-bb-text-secondary">Tickets</span>
          <span className="font-semibold text-bb-text">{data.quantity}</span>
        </div>
        {!!data.discountAmountMinor && <div className="flex justify-between gap-3 text-sm text-green-700">
          <span>Discount ({data.discountCode})</span>
          <span>−{formatMoney(data.discountAmountMinor, data.currency)}</span>
        </div>}
        <div className="flex justify-between text-sm">
          <span className="text-bb-text-secondary">{data.bookingStatus === 'CONFIRMED' ? 'Total paid' : 'Total'}</span>
          <span className="font-semibold text-bb-text">{formatMoney(data.totalAmountMinor, data.currency)}</span>
        </div>
      </div>

      {data.tickets && data.tickets.length > 0 && (
        <div className="mt-8 space-y-3">
          <h2 className="font-display font-bold text-lg text-bb-text">Your tickets</h2>
          {data.tickets.map((ticket: TicketCardData) => (
            <TicketCard key={ticket.id} ticket={ticket} eventTitle={data.event?.title} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-20 text-center text-bb-text-secondary">Loading…</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
