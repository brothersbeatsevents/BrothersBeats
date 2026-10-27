'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { adminGetSettings, adminUpdateSettings } from '@/lib/api';
import HeroImagesEditor from '@/components/ui/HeroImagesEditor';
import { getHeroImages, HeroImage } from '@/lib/hero-images';

export default function AdminSettingsPage() {
  const { token } = useAuth();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) adminGetSettings(token)
      .then((res) => setForm({ ...res.data, heroImages: getHeroImages(res.data) }))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load settings.'));
  }, [token]);

  function set(key: string, value: any) {
    setForm((f: any) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || uploadingImage) return;
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const res = await adminUpdateSettings(form, token);
      setForm(res.data);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (!form) return <p role={error ? 'alert' : 'status'} className="text-bb-text-secondary">{error || 'Loading…'}</p>;

  return (
    <div className="max-w-xl">
      <h1 className="font-display font-bold text-2xl text-bb-text mb-6">Organization settings</h1>

      <form onSubmit={handleSubmit} className="space-y-4 bg-bb-surface border border-bb-border rounded-2xl p-4 sm:p-6">
        <HeroImagesEditor
          images={form.heroImages || []}
          onChange={(images: HeroImage[]) => set('heroImages', images)}
          token={token || ''}
          disabled={saving || !token}
          onUploadingChange={setUploadingImage}
        />
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Organization name</label>
          <input value={form.organizationName || ''} onChange={(e) => set('organizationName', e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Support email</label>
          <input type="email" value={form.supportEmail || ''} onChange={(e) => set('supportEmail', e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">Default currency</label>
            <input value={form.defaultCurrency || ''} onChange={(e) => set('defaultCurrency', e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">Default timezone</label>
            <input value={form.defaultTimezone || ''} onChange={(e) => set('defaultTimezone', e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">WhatsApp group link</label>
          <input type="url" placeholder="https://whatsapp.com/channel/…" value={form.whatsappGroupUrl || ''} onChange={(e) => set('whatsappGroupUrl', e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
          <p className="text-xs text-bb-text-muted mt-1">Target of the "Join Now" button on the homepage. Leave empty to hide the section.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Default refund policy</label>
          <textarea rows={3} value={form.defaultRefundPolicy || ''} onChange={(e) => set('defaultRefundPolicy', e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {saved && <p className="text-sm text-bb-green">Settings saved.</p>}
        <button type="submit" disabled={saving || uploadingImage} className="bg-bb-gold hover:bg-bb-gold-dark disabled:opacity-60 text-bb-ink font-semibold px-6 py-2.5 rounded-full transition-colors">
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </div>
  );
}
