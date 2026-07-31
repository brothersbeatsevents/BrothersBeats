'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { unsubscribe } from '@/lib/api';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');

  useEffect(() => {
    if (!email) {
      setStatus('error');
      return;
    }
    unsubscribe(email)
      .then(() => setStatus('done'))
      .catch(() => setStatus('error'));
  }, [email]);

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      {status === 'loading' && <p className="text-bb-text-secondary">Processing your request…</p>}
      {status === 'done' && (
        <>
          <h1 className="font-display font-bold text-2xl text-bb-text mb-2">You&apos;ve been unsubscribed</h1>
          <p className="text-bb-text-secondary">{email} will no longer receive marketing emails from us.</p>
        </>
      )}
      {status === 'error' && (
        <>
          <h1 className="font-display font-bold text-2xl text-bb-text mb-2">Something went wrong</h1>
          <p className="text-bb-text-secondary">
            We couldn&apos;t process this request. Please contact us if you keep receiving unwanted emails.
          </p>
        </>
      )}
      <Link href="/" className="inline-block mt-6 text-bb-green font-semibold hover:text-bb-green-dark">
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
