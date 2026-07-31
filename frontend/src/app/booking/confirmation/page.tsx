'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getBookingConfirmation } from '@/lib/api';
import ErrorState from '@/components/ui/ErrorState';
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
    getBookingConfirmation(token)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  // Fresh redirect straight from Stripe checkout — no signed token yet.
  // Confirmation + ticket emails are sent asynchronously by the Stripe webhook.
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
          <Link href="/booking/lookup" className="bg-bb-green hover:bg-bb-green-dark text-white font-semibold px-6 py-3 rounded-full transition-colors">
            Find my booking
          </Link>
          <Link href="/events" className="border border-bb-border text-bb-text font-semibold px-6 py-3 rounded-full hover:border-bb-green transition-colors">
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
          <Link href="/booking/lookup" className="text-bb-green font-semibold hover:text-bb-green-dark">
            Try booking lookup instead
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="font-display font-bold text-3xl text-bb-text mb-1">Booking confirmed</h1>
      <p className="text-bb-text-secondary mb-8">Reference: {data.bookingReference}</p>

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
        <div className="flex justify-between text-sm">
          <span className="text-bb-text-secondary">Total paid</span>
          <span className="font-semibold text-bb-text">{formatMoney(data.totalAmountMinor, data.currency)}</span>
        </div>
      </div>

      {data.tickets && data.tickets.length > 0 && (
        <div className="mt-8 space-y-3">
          <h2 className="font-display font-bold text-lg text-bb-text">Your tickets</h2>
          {data.tickets.map((t: any) => (
            <div key={t.id} className="bg-bb-surface border border-bb-border rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-bb-text">Ticket #{t.ticketNumber}</p>
                <p className="text-xs text-bb-text-secondary">{t.attendeeName}</p>
              </div>
              {t.pdfDownloadUrl && (
                <a href={t.pdfDownloadUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-bb-green hover:text-bb-green-dark">
                  Download
                </a>
              )}
            </div>
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
