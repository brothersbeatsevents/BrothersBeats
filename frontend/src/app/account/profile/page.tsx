'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { updateMe } from '@/lib/api';
import { phoneInputProps } from '@/lib/phone';

export default function ProfilePage() {
  const { user, token, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await updateMe({ display_name: displayName, phone }, token);
      await refreshUser();
      setSaved(true);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display font-bold text-3xl text-bb-text mb-8">Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Full name</label>
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-gold"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Email</label>
          <input
            disabled
            value={user?.email || ''}
            className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm bg-bb-neutral text-bb-text-muted"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Phone (optional)</label>
          <input
            {...phoneInputProps}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-gold"
          />
        </div>
        {error && <p className="text-sm text-bb-red">{error}</p>}
        {saved && <p className="text-sm text-bb-green">Profile updated.</p>}
        <button
          type="submit"
          disabled={saving}
          className="bg-bb-gold hover:bg-bb-gold-dark disabled:opacity-60 text-bb-ink font-semibold px-6 py-2.5 rounded-full transition-colors"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
