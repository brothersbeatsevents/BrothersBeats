'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { confirmEmail, resendCode } from '@/lib/api';
import { authPageUrl, getAuthReturnPath } from '@/lib/auth-redirect';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = getAuthReturnPath(searchParams.get('next'));
  const email = searchParams.get('email') || '';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || resending) return;
    setError('');
    setLoading(true);
    try {
      await confirmEmail(email, code.replace(/\s/g, ''));
      router.push(authPageUrl('/auth/sign-in', returnTo, { verified: '1', email }));
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (loading || resending) return;
    setResending(true);
    setError('');
    setResent(false);
    try {
      await resendCode(email);
      setResent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display font-bold text-3xl text-bb-text mb-2">Verify your email</h1>
        <p className="text-sm text-bb-text-secondary mb-2">
          Enter the verification code for <strong>{email}</strong>.
        </p>
        <p className="text-xs text-bb-text-muted mb-8">
          Use the code from the most recent verification email. Guest ticket emails and password reset codes are separate.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">Verification code</label>
            <input
              required
              autoComplete="one-time-code"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
              className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-gold text-center tracking-widest"
            />
          </div>
          {error && <p className="text-sm text-bb-red">{error}</p>}
          {resent && <p className="text-sm text-bb-green">Check your inbox for the latest verification code if your account still needs verification.</p>}
          <button
            type="submit"
            disabled={loading || resending}
            className="w-full bg-bb-gold hover:bg-bb-gold-dark disabled:opacity-60 text-bb-ink font-semibold py-3 rounded-full transition-colors"
          >
            {loading ? 'Verifying…' : 'Verify email'}
          </button>
        </form>

        <button onClick={handleResend} disabled={loading || resending} className="mt-4 text-sm text-bb-gold hover:text-bb-gold-dark disabled:opacity-50">
          {resending ? 'Sending…' : 'Resend code'}
        </button>
        <p className="mt-6 text-sm text-bb-text-secondary">
          Already have an account?{' '}
          <Link href={authPageUrl('/auth/sign-in', returnTo, { email })} className="text-bb-gold font-semibold">Sign in</Link>
          {' or '}
          <Link href={authPageUrl('/auth/forgot-password', returnTo, { email })} className="text-bb-gold font-semibold">reset your password</Link>.
        </p>
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
