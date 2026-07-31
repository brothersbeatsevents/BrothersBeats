'use client';

import { useState } from 'react';
import Link from 'next/link';
import { sendContactMessage } from '@/lib/api';
import { SITE_CONFIG } from '@/lib/site-config';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      await sendContactMessage({ name, email, message });
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-display font-bold text-4xl text-bb-text mb-2">Contact us</h1>
      <p className="text-bb-text-secondary mb-4">
        Questions about an event or booking? Reach us directly at{' '}
        <a href={`mailto:${SITE_CONFIG.supportEmail}`} className="text-bb-green underline">
          {SITE_CONFIG.supportEmail}
        </a>{' '}
        or send a message below.
      </p>
      <p className="text-sm text-bb-text-secondary mb-8 bg-bb-neutral rounded-xl px-4 py-3">
        Planning a wedding, birthday, or corporate event and want Brothers Beats to manage it for you? Visit{' '}
        <Link href="/services" className="text-bb-green underline">
          our services page
        </Link>{' '}
        to send a private-event enquiry.
      </p>

      {status === 'sent' ? (
        <div className="bg-bb-pale-green rounded-2xl p-6 text-center">
          <p className="font-semibold text-bb-green">Message sent!</p>
          <p className="text-sm text-bb-text-secondary mt-1">We&apos;ll be in touch soon.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            <label className="block text-sm font-medium text-bb-text mb-1">Message</label>
            <textarea
              required
              rows={5}
              maxLength={5000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-green"
            />
          </div>
          {status === 'error' && <p className="text-sm text-bb-red">Something went wrong. Please try again.</p>}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="bg-bb-orange hover:bg-bb-orange-dark disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-full transition-colors"
          >
            {status === 'loading' ? 'Sending…' : 'Send message'}
          </button>
        </form>
      )}
    </div>
  );
}
