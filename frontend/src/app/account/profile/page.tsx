'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { updateMe, getPresignedAvatarUpload, uploadToPresignedUrl } from '@/lib/api';

export default function ProfilePage() {
  const { user, token, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploading(true);
    setError('');
    try {
      const { data } = await getPresignedAvatarUpload(file.type, token);
      await uploadToPresignedUrl(data.uploadUrl, file);
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to upload avatar.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display font-bold text-3xl text-bb-text mb-8">Profile</h1>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 rounded-full bg-bb-neutral overflow-hidden flex items-center justify-center">
          {user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
          ) : (
            <span className="font-display font-bold text-2xl text-bb-text-muted">
              {user?.display_name?.[0]?.toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-sm font-semibold text-bb-green hover:text-bb-green-dark border border-bb-green rounded-full px-4 py-2 transition-colors disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : 'Change photo'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Full name</label>
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-green"
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
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-green"
          />
        </div>
        {error && <p className="text-sm text-bb-red">{error}</p>}
        {saved && <p className="text-sm text-bb-green">Profile updated.</p>}
        <button
          type="submit"
          disabled={saving}
          className="bg-bb-orange hover:bg-bb-orange-dark disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-full transition-colors"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
