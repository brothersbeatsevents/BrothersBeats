'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { confirmEmail, resendCode } from '@/lib/api';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmEmail(email, code);
      router.push('/auth/sign-in?verified=1');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResent(false);
    try {
      await resendCode(email);
      setResent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display font-bold text-3xl text-bb-text mb-2">Verify your email</h1>
        <p className="text-sm text-bb-text-secondary mb-8">
          We sent a verification code to <strong>{email}</strong>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">Verification code</label>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-green text-center tracking-widest"
            />
          </div>
          {error && <p className="text-sm text-bb-red">{error}</p>}
          {resent && <p className="text-sm text-bb-green">A new code has been sent.</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-bb-orange hover:bg-bb-orange-dark disabled:opacity-60 text-white font-semibold py-3 rounded-full transition-colors"
          >
            {loading ? 'Verifying…' : 'Verify email'}
          </button>
        </form>

        <button onClick={handleResend} className="mt-4 text-sm text-bb-green hover:text-bb-green-dark">
          Resend code
        </button>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center text-bb-text-secondary">Loading…</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
