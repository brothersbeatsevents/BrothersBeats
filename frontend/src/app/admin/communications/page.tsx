'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { adminGetCampaigns } from '@/lib/api';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-bb-neutral text-bb-text-muted',
  SCHEDULED: 'bg-bb-pale-blue text-bb-blue',
  SENDING: 'bg-[#FFF7DA] text-[#B8860B]',
  SENT: 'bg-bb-pale-green text-bb-green',
  CANCELLED: 'bg-[#FFF0EF] text-bb-red',
};

export default function AdminCommunicationsPage() {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) adminGetCampaigns(token).then((res) => setCampaigns(res.data)).finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-bb-text">Communications</h1>
        <Link href="/admin/communications/new" className="bg-bb-orange hover:bg-bb-orange-dark text-white font-semibold px-5 py-2.5 rounded-full transition-colors text-sm">
          + New campaign
        </Link>
      </div>

      {loading ? (
        <p className="text-bb-text-secondary">Loading…</p>
      ) : (
        <div className="bg-bb-surface border border-bb-border rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bb-neutral text-bb-text-secondary text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Audience</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Recipients</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-t border-bb-border hover:bg-bb-neutral/50">
                  <td className="px-4 py-2">
                    <Link href={`/admin/communications/${c.id}`} className="text-bb-green font-semibold hover:underline">{c.name}</Link>
                  </td>
                  <td className="px-4 py-2 text-bb-text-secondary text-xs">{c.audienceType}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[c.status] || ''}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-2 text-bb-text-secondary text-xs">{c.deliveredCount ?? '—'}/{c.recipientCount ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {campaigns.length === 0 && <p className="text-center text-bb-text-secondary py-10">No campaigns yet.</p>}
        </div>
      )}
    </div>
  );
}
