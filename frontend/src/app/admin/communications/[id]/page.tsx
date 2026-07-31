'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  adminGetCampaign,
  adminUpdateCampaign,
  adminDeleteCampaign,
  adminTestCampaign,
  adminScheduleCampaign,
  adminSendCampaign,
  adminCancelCampaign,
} from '@/lib/api';

export default function CampaignDetailPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  function load() {
    if (!token) return;
    adminGetCampaign(params.id, token).then((res) => setCampaign(res.data)).finally(() => setLoading(false));
  }
  useEffect(load, [token, params.id]);

  async function handleTest() {
    if (!token) return;
    const email = prompt('Send test to which email? (blank = your own)') || undefined;
    setBusy(true);
    try {
      await adminTestCampaign(params.id, email, token);
      setMessage('Test email sent.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSchedule() {
    if (!token) return;
    const when = prompt('Schedule for when? (e.g. 2026-06-01T10:00)');
    if (!when) return;
    setBusy(true);
    try {
      await adminScheduleCampaign(params.id, new Date(when).toISOString(), token);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function handleSend() {
    if (!token || !confirm('Send this campaign now?')) return;
    setBusy(true);
    try {
      await adminSendCampaign(params.id, token);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!token) return;
    setBusy(true);
    try {
      await adminCancelCampaign(params.id, token);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!token || !confirm('Delete this draft campaign?')) return;
    await adminDeleteCampaign(params.id, token);
    router.push('/admin/communications');
  }

  if (loading) return <p className="text-bb-text-secondary">Loading…</p>;
  if (!campaign) return <p className="text-bb-text-secondary">Campaign not found.</p>;

  return (
    <div className="max-w-2xl">
      <Link href="/admin/communications" className="text-sm text-bb-green hover:text-bb-green-dark">&larr; Back to communications</Link>

      <div className="flex items-center justify-between mt-3 mb-1">
        <h1 className="font-display font-bold text-2xl text-bb-text">{campaign.name}</h1>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-bb-pale-green text-bb-green">{campaign.status}</span>
      </div>
      <p className="text-bb-text-secondary mb-6">{campaign.audienceType}</p>

      {message && <p className="text-sm text-bb-green mb-4">{message}</p>}

      <div className="bg-bb-surface border border-bb-border rounded-2xl p-6 mb-6 space-y-2">
        <p className="text-sm text-bb-text-secondary">Subject</p>
        <p className="font-semibold text-bb-text mb-2">{campaign.subject}</p>
        <p className="text-sm text-bb-text-secondary">Heading</p>
        <p className="font-semibold text-bb-text mb-2">{campaign.content?.heading}</p>
        <p className="text-sm text-bb-text-secondary">Body</p>
        <p className="text-bb-text whitespace-pre-wrap">{campaign.content?.body}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={handleTest} disabled={busy} className="text-sm font-semibold border border-bb-border rounded-full px-4 py-2 hover:border-bb-green disabled:opacity-60">Send test</button>
        {campaign.status === 'DRAFT' && (
          <>
            <button onClick={handleSchedule} disabled={busy} className="text-sm font-semibold border border-bb-border rounded-full px-4 py-2 hover:border-bb-green disabled:opacity-60">Schedule</button>
            <button onClick={handleSend} disabled={busy} className="text-sm font-semibold bg-bb-orange text-white rounded-full px-4 py-2 hover:bg-bb-orange-dark disabled:opacity-60">Send now</button>
            <button onClick={handleDelete} disabled={busy} className="text-sm font-semibold text-bb-red border border-bb-red/40 rounded-full px-4 py-2 hover:bg-bb-red/5 disabled:opacity-60">Delete</button>
          </>
        )}
        {campaign.status === 'SCHEDULED' && (
          <>
            <button onClick={handleSend} disabled={busy} className="text-sm font-semibold bg-bb-orange text-white rounded-full px-4 py-2 hover:bg-bb-orange-dark disabled:opacity-60">Send now</button>
            <button onClick={handleCancel} disabled={busy} className="text-sm font-semibold text-bb-red border border-bb-red/40 rounded-full px-4 py-2 hover:bg-bb-red/5 disabled:opacity-60">Cancel</button>
          </>
        )}
      </div>
    </div>
  );
}
