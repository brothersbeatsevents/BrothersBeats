'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function SignInPage() {
  const router = useRouter();
  const { signIn, loginWithCognito } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      router.push('/account');
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-display font-bold text-3xl text-bb-text text-center mb-8">Sign in</h1>

        <button
          onClick={() => loginWithCognito()}
          className="w-full border border-bb-border rounded-full py-3 font-semibold text-bb-text hover:border-bb-green transition-colors mb-6"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-bb-border" />
          <span className="text-xs text-bb-text-muted">or</span>
          <div className="flex-1 h-px bg-bb-border" />
        </div>

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
            <label className="block text-sm font-medium text-bb-text mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-green"
            />
          </div>
          {error && <p className="text-sm text-bb-red">{error}</p>}
          <div className="text-right">
            <Link href="/auth/forgot-password" className="text-sm text-bb-green hover:text-bb-green-dark">
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-bb-orange hover:bg-bb-orange-dark disabled:opacity-60 text-white font-semibold py-3 rounded-full transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-bb-text-secondary mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/sign-up" className="text-bb-green font-semibold hover:text-bb-green-dark">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
