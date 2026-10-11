'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  adminGetEvents,
  adminGetSponsors,
  adminCreateSponsor,
  adminUpdateSponsor,
  adminDeleteSponsor,
  getPresignedUpload,
  uploadToPresignedUrl,
} from '@/lib/api';

type Scope = 'SITE' | 'EVENT';

const EMPTY_FORM = { name: '', websiteUrl: '', description: '', sortOrder: 0 };

export default function AdminSponsorsPage() {
  const { token } = useAuth();
  const [scope, setScope] = useState<Scope>('SITE');
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState('');
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [logo, setLogo] = useState<{ logoUrl: string; logoS3Key?: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    adminGetEvents(token).then((res) => setEvents(res.data));
  }, [token]);

  const load = useCallback(async () => {
    if (!token) return;
    if (scope === 'EVENT' && !eventId) {
      setSponsors([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await adminGetSponsors(token, { scope, eventId: scope === 'EVENT' ? eventId : undefined });
      setSponsors(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load sponsors');
    } finally {
      setLoading(false);
    }
  }, [token, scope, eventId]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setLogo(null);
  }

  function startEdit(s: any) {
    setEditingId(s.id);
    setForm({ name: s.name, websiteUrl: s.websiteUrl || '', description: s.description || '', sortOrder: s.sortOrder });
    setLogo({ logoUrl: s.logoUrl, logoS3Key: s.logoS3Key });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploading(true);
    setError('');
    try {
      const { data } = await getPresignedUpload(file.type, 'sponsors', token);
      await uploadToPresignedUrl(data.uploadUrl, file);
      setLogo({ logoUrl: data.publicUrl, logoS3Key: data.key });
    } catch (err: any) {
      setError(err.message || 'Failed to upload logo.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!logo) {
      setError('Please upload a logo.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        websiteUrl: form.websiteUrl,
        description: form.description,
        sortOrder: Number(form.sortOrder) || 0,
        logoUrl: logo.logoUrl,
        logoS3Key: logo.logoS3Key,
      };
      if (editingId) {
        await adminUpdateSponsor(editingId, payload, token);
      } else {
        await adminCreateSponsor({ ...payload, scope, eventId: scope === 'EVENT' ? eventId : undefined }, token);
      }
      resetForm();
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to save sponsor.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: any) {
    if (!token) return;
    try {
      await adminUpdateSponsor(s.id, { active: !s.active }, token);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to update sponsor.');
    }
  }

  async function handleDelete(s: any) {
    if (!token || !confirm(`Delete sponsor "${s.name}"?`)) return;
    try {
      await adminDeleteSponsor(s.id, token);
      if (editingId === s.id) resetForm();
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to delete sponsor.');
    }
  }

  const canAdd = scope === 'SITE' || !!eventId;

  return (
    <div className="max-w-4xl">
      <h1 className="font-display font-bold text-2xl text-bb-text mb-2">Sponsors</h1>
      <p className="text-sm text-bb-text-secondary mb-6">
        Our Sponsors appear on the landing page. Event sponsors appear only on that event&apos;s page.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {(['SITE', 'EVENT'] as Scope[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setScope(s);
              resetForm();
            }}
            className={`px-4 py-2 rounded-full text-sm font-semibold ${scope === s ? 'bg-bb-gold text-bb-ink' : 'bg-bb-surface border border-bb-border text-bb-text-secondary'}`}
          >
            {s === 'SITE' ? 'Our Sponsors (landing page)' : 'Event sponsors'}
          </button>
        ))}
        {scope === 'EVENT' && (
          <select
            value={eventId}
            onChange={(e) => {
              setEventId(e.target.value);
              resetForm();
            }}
            className="rounded-lg border border-bb-border px-4 py-2 text-sm"
          >
            <option value="">Select an event…</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="text-sm text-bb-red mb-4">{error}</p>}

      {canAdd ? (
        <form onSubmit={handleSubmit} className="space-y-4 bg-bb-surface border border-bb-border rounded-2xl p-6 mb-8">
          <h2 className="font-display font-bold text-lg text-bb-text">{editingId ? 'Edit sponsor' : 'Add sponsor'}</h2>
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">Name</label>
            <input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">Logo</label>
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo.logoUrl} alt="Logo preview" className="h-20 w-auto object-contain mb-2 rounded-lg bg-bb-neutral p-2" />
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              onChange={handleLogoChange}
              disabled={uploading}
              className="w-full text-sm text-bb-text-secondary file:mr-3 file:rounded-full file:border-0 file:bg-bb-gold file:text-bb-ink file:px-4 file:py-2 file:text-sm file:font-semibold hover:file:bg-bb-gold-dark disabled:opacity-60"
            />
            {uploading && <p className="text-xs text-bb-text-secondary mt-1">Uploading…</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">Website (optional)</label>
            <input type="url" placeholder="https://…" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">Text (optional)</label>
            <textarea rows={2} maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">Display order</label>
            <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="w-32 rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving || uploading} className="bg-bb-gold hover:bg-bb-gold-dark disabled:opacity-60 text-bb-ink font-semibold px-6 py-2.5 rounded-full transition-colors">
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add sponsor'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="border border-bb-border font-semibold px-6 py-2.5 rounded-full">
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <p className="text-bb-text-secondary mb-8">Select an event to manage its sponsors.</p>
      )}

      {loading ? (
        <p className="text-bb-text-secondary">Loading…</p>
      ) : (
        <div className="space-y-3">
          {sponsors.map((s) => (
            <div key={s.id} className="flex items-center gap-4 bg-bb-surface border border-bb-border rounded-2xl p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.logoUrl} alt={s.name} className="h-14 w-24 object-contain rounded-lg bg-bb-neutral p-1" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-bb-text truncate">{s.name}</p>
                {s.description && <p className="text-xs text-bb-text-secondary line-clamp-1">{s.description}</p>}
                <p className="text-xs text-bb-text-muted">{s.active ? 'Visible' : 'Hidden'} · order {s.sortOrder}</p>
              </div>
              <div className="flex gap-3 text-xs">
                <button onClick={() => startEdit(s)} className="text-bb-gold hover:underline">Edit</button>
                <button onClick={() => toggleActive(s)} className="text-bb-text-secondary hover:underline">{s.active ? 'Hide' : 'Show'}</button>
                <button onClick={() => handleDelete(s)} className="text-bb-red hover:underline">Delete</button>
              </div>
            </div>
          ))}
          {sponsors.length === 0 && canAdd && (
            <p className="text-center text-bb-text-secondary py-6">No sponsors yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
