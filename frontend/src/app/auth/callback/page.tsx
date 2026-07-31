'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleCognitoCallback } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDesc = searchParams.get('error_description');

    if (errorParam) {
      setError(errorDesc || errorParam);
      return;
    }
    if (!code) {
      setError('No authorization code received');
      return;
    }

    handleCognitoCallback(code)
      .then(() => router.replace('/account'))
      .catch((err) => setError(err.message || 'Authentication failed'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-bb-surface border border-bb-border rounded-2xl p-8 text-center">
          <h2 className="font-display text-xl font-bold text-bb-text mb-2">Sign in failed</h2>
          <p className="text-sm text-bb-text-secondary mb-6">{error}</p>
          <Link href="/auth/sign-in" className="inline-block bg-bb-orange text-white font-semibold px-6 py-3 rounded-full">
            Try again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <p className="text-bb-text-secondary">Signing you in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-bb-text-secondary">Loading…</div>}>
      <CallbackHandler />
    </Suspense>
  );
}
