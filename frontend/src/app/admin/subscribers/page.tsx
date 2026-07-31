'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { adminGetSubscribers } from '@/lib/api';

export default function AdminSubscribersPage() {
  const { token } = useAuth();
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    adminGetSubscribers(token, { q: q || undefined, status: status || undefined })
      .then((res) => {
        setSubscribers(res.data);
        setMeta(res.meta);
      })
      .finally(() => setLoading(false));
  }, [token, q, status]);

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-bb-text mb-2">Subscribers</h1>
      {meta && (
        <p className="text-sm text-bb-text-secondary mb-6">
          {meta.total} total · {meta.subscribed} subscribed · {meta.unsubscribed} unsubscribed · {meta.bounced} bounced
        </p>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-lg border border-bb-border px-4 py-2 text-sm flex-1 min-w-[200px]" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-bb-border px-4 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="SUBSCRIBED">Subscribed</option>
          <option value="UNSUBSCRIBED">Unsubscribed</option>
          <option value="BOUNCED">Bounced</option>
        </select>
      </div>

      {loading ? (
        <p className="text-bb-text-secondary">Loading…</p>
      ) : (
        <div className="bg-bb-surface border border-bb-border rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bb-neutral text-bb-text-secondary text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s.id} className="border-t border-bb-border">
                  <td className="px-4 py-2 text-bb-text">{s.email}</td>
                  <td className="px-4 py-2 text-bb-text-secondary">{s.fullName || '—'}</td>
                  <td className="px-4 py-2 text-xs text-bb-text-secondary">{s.status}</td>
                  <td className="px-4 py-2 text-xs text-bb-text-secondary">{new Date(s.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {subscribers.length === 0 && <p className="text-center text-bb-text-secondary py-10">No subscribers found.</p>}
        </div>
      )}
    </div>
  );
}
