'use client';

import { useState } from 'react';
import Link from 'next/link';
import { forgotPassword } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      await forgotPassword(email.trim().toLowerCase());
      setStatus('sent');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code.');
      setStatus('error');
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-display font-bold text-3xl text-bb-text text-center mb-2">Reset your password</h1>
        <p className="text-sm text-bb-text-secondary text-center mb-8">
          Enter your email and we&apos;ll send you a reset code.
        </p>

        {status === 'sent' ? (
          <div className="bg-bb-pale-green rounded-2xl p-6 text-center">
            <p className="font-semibold text-bb-green">Check your inbox</p>
            <p className="text-sm text-bb-text-secondary mt-1">
              We&apos;ve sent a reset code to {email}.
            </p>
            <Link
              href={`/auth/reset-password?email=${encodeURIComponent(email)}`}
              className="inline-block mt-4 text-bb-green font-semibold hover:text-bb-green-dark"
            >
              Enter code &rarr;
            </Link>
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
            {error && <p className="text-sm text-bb-red">{error}</p>}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-bb-orange hover:bg-bb-orange-dark disabled:opacity-60 text-white font-semibold py-3 rounded-full transition-colors"
            >
              {status === 'loading' ? 'Sending…' : 'Send reset code'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-bb-text-secondary mt-6">
          <Link href="/auth/sign-in" className="text-bb-green font-semibold hover:text-bb-green-dark">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
