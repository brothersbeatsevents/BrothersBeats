'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPassword } from '@/lib/api';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim().toLowerCase(), code.trim(), newPassword);
      router.push('/auth/sign-in?reset=1');
    } catch (err: any) {
      setError(err.message || 'The reset code is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-display font-bold text-3xl text-bb-text text-center mb-8">Set a new password</h1>

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
            <label className="block text-sm font-medium text-bb-text mb-1">Reset code</label>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">New password</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-green"
            />
          </div>
          {error && <p className="text-sm text-bb-red">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-bb-orange hover:bg-bb-orange-dark disabled:opacity-60 text-white font-semibold py-3 rounded-full transition-colors"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center text-bb-text-secondary">Loading…</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
