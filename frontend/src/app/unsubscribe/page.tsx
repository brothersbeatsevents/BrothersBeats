'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { unsubscribe } from '@/lib/api';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const emailFromLink = searchParams.get('email')?.trim() || '';
  const [email, setEmail] = useState(emailFromLink);
  const [unsubscribedEmail, setUnsubscribedEmail] = useState('');
  const [status, setStatus] = useState<'form' | 'loading' | 'done' | 'error'>(
    emailFromLink ? 'loading' : 'form',
  );

  useEffect(() => {
    if (!emailFromLink) return;

    unsubscribe(emailFromLink)
      .then(() => {
        setUnsubscribedEmail(emailFromLink);
        setStatus('done');
      })
      .catch(() => setStatus('error'));
  }, [emailFromLink]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail) return;

    setStatus('loading');
    try {
      await unsubscribe(normalizedEmail);
      setUnsubscribedEmail(normalizedEmail);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      {status === 'form' && (
        <>
          <h1 className="font-display font-bold text-2xl text-bb-text mb-2">Unsubscribe from emails</h1>
          <p className="text-bb-text-secondary">
            Enter the email address you would like us to remove from marketing emails.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
            <div>
              <label htmlFor="unsubscribe-email" className="block text-sm font-medium text-bb-text mb-1">
                Email address
              </label>
              <input
                id="unsubscribe-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-bb-border bg-white px-4 py-3 text-bb-text focus:outline-none focus:ring-2 focus:ring-bb-gold"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-bb-gold px-5 py-3 font-semibold text-bb-ink transition-colors hover:bg-bb-gold-dark"
            >
              Unsubscribe
            </button>
          </form>
        </>
      )}
      {status === 'loading' && <p className="text-bb-text-secondary">Processing your request…</p>}
      {status === 'done' && (
        <>
          <h1 className="font-display font-bold text-2xl text-bb-text mb-2">You&apos;ve been unsubscribed</h1>
          <p className="text-bb-text-secondary">
            {unsubscribedEmail} will no longer receive marketing emails from us.
          </p>
        </>
      )}
      {status === 'error' && (
        <>
          <h1 className="font-display font-bold text-2xl text-bb-text mb-2">Something went wrong</h1>
          <p className="text-bb-text-secondary">
            We couldn&apos;t process this request. Please contact us if you keep receiving unwanted emails.
          </p>
          {!emailFromLink && (
            <button
              type="button"
              onClick={() => setStatus('form')}
              className="mt-4 font-semibold text-bb-gold hover:text-bb-gold-dark"
            >
              Try again
            </button>
          )}
        </>
      )}
      <Link href="/" className="inline-block mt-6 text-bb-gold font-semibold hover:text-bb-gold-dark">
        Back to home
      </Link>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-4 py-20 text-center text-bb-text-secondary">Loading…</div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}
