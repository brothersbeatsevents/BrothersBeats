'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { adminCreateCampaign } from '@/lib/api';

export default function NewCampaignPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [heading, setHeading] = useState('');
  const [body, setBody] = useState('');
  const [preheader, setPreheader] = useState('');
  const [audienceType, setAudienceType] = useState('ALL_SUBSCRIBERS');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const res = await adminCreateCampaign(
        { name, content: { subject, heading, body, preheader: preheader || undefined }, audienceType },
        token,
      );
      router.push(`/admin/communications/${res.data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create campaign.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display font-bold text-2xl text-bb-text mb-6">New campaign</h1>

      <form onSubmit={handleSubmit} className="space-y-4 bg-bb-surface border border-bb-border rounded-2xl p-6">
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Campaign name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Audience</label>
          <select value={audienceType} onChange={(e) => setAudienceType(e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm">
            <option value="ALL_SUBSCRIBERS">All subscribers</option>
            <option value="CATEGORY_SUBSCRIBERS">Category subscribers</option>
            <option value="CITY_SUBSCRIBERS">City subscribers</option>
            <option value="EVENT_ATTENDEES">Event attendees</option>
            <option value="PAST_ATTENDEES">Past attendees</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Subject line</label>
          <input required value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Preheader (optional)</label>
          <input value={preheader} onChange={(e) => setPreheader(e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Heading</label>
          <input required value={heading} onChange={(e) => setHeading(e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Body</label>
          <textarea required rows={6} value={body} onChange={(e) => setBody(e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
        </div>
        {error && <p className="text-sm text-bb-red">{error}</p>}
        <button type="submit" disabled={saving} className="bg-bb-orange hover:bg-bb-orange-dark disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-full transition-colors">
          {saving ? 'Creating…' : 'Create draft'}
        </button>
      </form>
    </div>
  );
}
