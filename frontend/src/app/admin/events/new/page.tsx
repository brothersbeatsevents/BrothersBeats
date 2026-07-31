'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { adminCreateEvent } from '@/lib/api';
import { CATEGORY_LABELS } from '@/lib/site-config';

export default function NewEventPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    category: 'COMMUNITY',
    shortDescription: '',
    longDescription: '',
    venueName: '',
    city: '',
    country: 'Ireland',
    startDateTime: '',
    endDateTime: '',
    capacity: 100,
    perOrderLimit: 10,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const res = await adminCreateEvent(
        {
          ...form,
          startDateTime: new Date(form.startDateTime).toISOString(),
          endDateTime: new Date(form.endDateTime).toISOString(),
          capacity: Number(form.capacity),
          perOrderLimit: Number(form.perOrderLimit),
        },
        token,
      );
      router.push(`/admin/events/${res.data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create event.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display font-bold text-2xl text-bb-text mb-6">New event</h1>

      <form onSubmit={handleSubmit} className="space-y-4 bg-bb-surface border border-bb-border rounded-2xl p-6">
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Title</label>
          <input required value={form.title} onChange={(e) => set('title', e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Category</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Short description</label>
          <input value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Full description</label>
          <textarea rows={4} value={form.longDescription} onChange={(e) => set('longDescription', e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">Venue name</label>
            <input required value={form.venueName} onChange={(e) => set('venueName', e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">City</label>
            <input required value={form.city} onChange={(e) => set('city', e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">Start date/time</label>
            <input required type="datetime-local" value={form.startDateTime} onChange={(e) => set('startDateTime', e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">End date/time</label>
            <input required type="datetime-local" value={form.endDateTime} onChange={(e) => set('endDateTime', e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">Capacity</label>
            <input required type="number" min={1} value={form.capacity} onChange={(e) => set('capacity', Number(e.target.value))} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">Per-order limit</label>
            <input required type="number" min={1} value={form.perOrderLimit} onChange={(e) => set('perOrderLimit', Number(e.target.value))} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
          </div>
        </div>
        {error && <p className="text-sm text-bb-red">{error}</p>}
        <button type="submit" disabled={saving} className="bg-bb-orange hover:bg-bb-orange-dark disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-full transition-colors">
          {saving ? 'Creating…' : 'Create draft event'}
        </button>
      </form>
    </div>
  );
}
