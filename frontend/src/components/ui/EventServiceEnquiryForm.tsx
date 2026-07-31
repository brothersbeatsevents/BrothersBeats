'use client';

import { useState } from 'react';
import { submitServiceEnquiry } from '@/lib/api';
import { EVENT_SERVICE_TYPES, EVENT_SERVICE_TYPE_LABELS } from '@/lib/site-config';

export default function EventServiceEnquiryForm({
  source = 'SERVICES_PAGE',
}: {
  source?: 'SERVICES_PAGE' | 'CONTACT_PAGE';
}) {
  const [eventServiceType, setEventServiceType] = useState('WEDDING');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [venueOrCity, setVenueOrCity] = useState('');
  const [estimatedGuestCount, setEstimatedGuestCount] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [message, setMessage] = useState('');
  const [consentToContact, setConsentToContact] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consentToContact) {
      setError('Please confirm we can contact you about this enquiry.');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      await submitServiceEnquiry({
        eventServiceType,
        fullName,
        email,
        phone: phone || undefined,
        preferredDate: preferredDate || undefined,
        venueOrCity: venueOrCity || undefined,
        estimatedGuestCount: estimatedGuestCount ? Number(estimatedGuestCount) : undefined,
        budgetRange: budgetRange || undefined,
        message,
        consentToContact: true,
        source,
      });
      setStatus('sent');
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Something went wrong. Please try again.');
    }
  }

  if (status === 'sent') {
    return (
      <div className="bg-bb-pale-green rounded-2xl p-6 text-center">
        <p className="font-semibold text-bb-green">Thanks — we&apos;ve received your enquiry!</p>
        <p className="text-sm text-bb-text-secondary mt-1">
          A member of the Brothers Beats team will be in touch soon to discuss your event.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-bb-text mb-1">What are we planning?</label>
        <select
          value={eventServiceType}
          onChange={(e) => setEventServiceType(e.target.value)}
          className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-green"
        >
          {EVENT_SERVICE_TYPES.map((type) => (
            <option key={type} value={type}>
              {EVENT_SERVICE_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Full name</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-green"
          />
        </div>
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
          <label className="block text-sm font-medium text-bb-text mb-1">Phone (optional)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-green"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Preferred date (optional)</label>
          <input
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-green"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Venue / city (optional)</label>
          <input
            value={venueOrCity}
            onChange={(e) => setVenueOrCity(e.target.value)}
            className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-green"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Estimated guests (optional)</label>
          <input
            type="number"
            min={1}
            max={100000}
            value={estimatedGuestCount}
            onChange={(e) => setEstimatedGuestCount(e.target.value)}
            className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-green"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-bb-text mb-1">Budget range (optional)</label>
        <input
          placeholder="e.g. €2,000–€5,000"
          value={budgetRange}
          onChange={(e) => setBudgetRange(e.target.value)}
          className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-green"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-bb-text mb-1">Tell us about your event</label>
        <textarea
          required
          rows={5}
          maxLength={5000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-green"
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-bb-text-secondary">
        <input
          type="checkbox"
          checked={consentToContact}
          onChange={(e) => setConsentToContact(e.target.checked)}
          className="mt-0.5"
        />
        I agree to be contacted by Brothers Beats about this enquiry.
      </label>

      {error && <p className="text-sm text-bb-red">{error}</p>}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="bg-bb-orange hover:bg-bb-orange-dark disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-full transition-colors"
      >
        {status === 'loading' ? 'Sending…' : 'Send enquiry'}
      </button>
    </form>
  );
}
