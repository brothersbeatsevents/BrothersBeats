'use client';

import { useState } from 'react';
import { subscribe } from '@/lib/api';
import { EVENT_CATEGORIES, CATEGORY_LABELS } from '@/lib/site-config';

export default function SubscriptionForm({ defaultCategory }: { defaultCategory?: string }) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [categories, setCategories] = useState<string[]>(defaultCategory ? [defaultCategory] : []);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  function toggleCategory(cat: string) {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      await subscribe({ email, fullName: fullName || undefined, categories, source: 'WEBSITE' });
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-bb-pale-green rounded-2xl p-6 text-center">
        <p className="font-semibold text-bb-green">You&apos;re subscribed!</p>
        <p className="text-sm text-bb-text-secondary mt-1">We&apos;ll email you when new events go live.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-bb-neutral rounded-2xl p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-bb-text mb-1">Name (optional)</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm bg-bb-surface focus:outline-none focus:ring-2 focus:ring-bb-green"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-bb-text mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm bg-bb-surface focus:outline-none focus:ring-2 focus:ring-bb-green"
        />
      </div>
      <div>
        <p className="text-sm font-medium text-bb-text mb-2">Interested in</p>
        <div className="flex flex-wrap gap-2">
          {EVENT_CATEGORIES.map((cat) => (
            <button
              type="button"
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                categories.includes(cat)
                  ? 'bg-bb-green text-white border-bb-green'
                  : 'bg-bb-surface text-bb-text-secondary border-bb-border hover:border-bb-green'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>
      {status === 'error' && <p className="text-sm text-bb-red">Something went wrong. Please try again.</p>}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-bb-green hover:bg-bb-green-dark disabled:opacity-60 text-white font-semibold py-3 rounded-full transition-colors"
      >
        {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
      </button>
    </form>
  );
}
