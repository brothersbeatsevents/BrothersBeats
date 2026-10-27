'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { lookupBooking } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { authPageUrl } from '@/lib/auth-redirect';

function BookingLookupContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [guest, setGuest] = useState(searchParams.get('method') === 'guest' || !!searchParams.get('bookingReference'));
  const [email, setEmail] = useState('');
  const [bookingReference, setBookingReference] = useState(searchParams.get('bookingReference') || '');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      await lookupBooking(email.trim(), bookingReference.trim() || undefined);
      setStatus('sent');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <h1 className="font-display font-bold text-3xl text-bb-text mb-2">Find my ticket</h1>
      {!guest ? (
        <>
          <p className="text-bb-text-secondary mb-8">How did you book your tickets?</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href={user?.role === 'CUSTOMER' ? '/account/tickets' : authPageUrl('/auth/sign-in', '/account/tickets')}
              className="rounded-2xl border border-bb-border bg-bb-surface p-6 transition-colors hover:border-bb-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-gold">
              <h2 className="font-display font-bold text-lg text-bb-text">Booked with an account</h2>
              <p className="mt-2 text-sm text-bb-text-secondary">Sign in with the email used to book and open My tickets.</p>
              <span className="mt-4 inline-block text-sm font-semibold text-bb-gold">{user?.role === 'CUSTOMER' ? 'Open My tickets' : 'Sign in to find tickets'} &rarr;</span>
            </Link>
            <button type="button" onClick={() => setGuest(true)}
              className="rounded-2xl border border-bb-border bg-bb-surface p-6 text-left transition-colors hover:border-bb-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-gold">
              <h2 className="font-display font-bold text-lg text-bb-text">Booked as a guest</h2>
              <p className="mt-2 text-sm text-bb-text-secondary">Enter your booking email to receive your ticket PDFs and a secure access link.</p>
              <span className="mt-4 inline-block text-sm font-semibold text-bb-gold">Find guest tickets &rarr;</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <button type="button" disabled={status === 'loading'} onClick={() => { setGuest(false); setStatus('idle'); setError(''); }} className="mb-6 mt-2 text-sm font-semibold text-bb-gold disabled:opacity-60">&larr; Choose a different booking method</button>
          <h2 className="font-display font-bold text-xl text-bb-text mb-2">Booked as a guest</h2>
          <p className="text-bb-text-secondary mb-8">Enter the email address used at checkout. We&apos;ll email your ticket PDFs and a secure link to access your tickets. No account or sign-in needed.</p>

          {status === 'sent' ? (
            <div role="status" className="bg-bb-pale-green rounded-2xl p-6 text-center">
              <p className="font-semibold text-bb-green">Check your inbox</p>
              <p className="text-sm text-bb-text-secondary mt-1">
                If a matching booking exists, we&apos;ve emailed your tickets or booking details to the address used at checkout. Check your junk folder too.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="guest-ticket-email" className="block text-sm font-medium text-bb-text mb-1">Booking email</label>
                <input
                  id="guest-ticket-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-gold"
                />
              </div>
              <div>
                <label htmlFor="guest-ticket-reference" className="block text-sm font-medium text-bb-text mb-1">Booking reference (optional)</label>
                <input
                  id="guest-ticket-reference"
                  value={bookingReference}
                  onChange={(e) => setBookingReference(e.target.value)}
                  placeholder="BBE-XXXXXXXX"
                  className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-gold"
                />
              </div>
              {status === 'error' && <p role="alert" className="text-sm text-bb-red">{error}</p>}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-bb-gold hover:bg-bb-gold-dark disabled:opacity-60 text-bb-ink font-semibold py-3 rounded-full transition-colors"
              >
                {status === 'loading' ? 'Sending…' : 'Email my tickets'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export default function BookingLookupPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-bb-text-secondary">Loading booking lookup…</div>}>
      <BookingLookupContent />
    </Suspense>
  );
}
