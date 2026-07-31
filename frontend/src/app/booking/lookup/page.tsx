'use client';

import { useState } from 'react';
import { lookupBooking } from '@/lib/api';

export default function BookingLookupPage() {
  const [email, setEmail] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      await lookupBooking(email, bookingReference || undefined);
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-display font-bold text-3xl text-bb-text mb-2">Find my booking</h1>
      <p className="text-bb-text-secondary mb-8">
        Enter the email address used at checkout and we&apos;ll send you a secure link to view your booking and tickets.
      </p>

      {status === 'sent' ? (
        <div className="bg-bb-pale-green rounded-2xl p-6 text-center">
          <p className="font-semibold text-bb-green">Check your inbox</p>
          <p className="text-sm text-bb-text-secondary mt-1">
            If a matching booking exists, we&apos;ve sent a link to the email on file.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">Booking reference (optional)</label>
            <input
              value={bookingReference}
              onChange={(e) => setBookingReference(e.target.value)}
              placeholder="BBE-XXXXXXXX"
              className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-green"
            />
          </div>
          {status === 'error' && <p className="text-sm text-bb-red">Something went wrong. Please try again.</p>}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-bb-green hover:bg-bb-green-dark disabled:opacity-60 text-white font-semibold py-3 rounded-full transition-colors"
          >
            {status === 'loading' ? 'Sending…' : 'Send me the link'}
          </button>
        </form>
      )}
    </div>
  );
}
