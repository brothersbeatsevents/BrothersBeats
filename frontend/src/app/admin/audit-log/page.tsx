'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { adminGetAuditLog } from '@/lib/api';

export default function AdminAuditLogPage() {
  const { token } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    adminGetAuditLog(token, { action: action || undefined, entityType: entityType || undefined, limit: 200 })
      .then((res) => setEntries(res.data))
      .finally(() => setLoading(false));
  }, [token, action, entityType]);

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-bb-text mb-6">Audit log</h1>

      <div className="flex flex-wrap gap-3 mb-4">
        <input placeholder="Filter by action…" value={action} onChange={(e) => setAction(e.target.value)} className="rounded-lg border border-bb-border px-4 py-2 text-sm" />
        <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="rounded-lg border border-bb-border px-4 py-2 text-sm">
          <option value="">All entity types</option>
          <option value="EVENT">Event</option>
          <option value="TICKET_TIER">Ticket tier</option>
          <option value="BOOKING">Booking</option>
          <option value="REFUND">Refund</option>
          <option value="CAMPAIGN">Campaign</option>
          <option value="USER">User</option>
          <option value="ORG_SETTINGS">Org settings</option>
        </select>
      </div>

      {loading ? (
        <p className="text-bb-text-secondary">Loading…</p>
      ) : (
        <div className="bg-bb-surface border border-bb-border rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bb-neutral text-bb-text-secondary text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Summary</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e: any) => (
                <tr key={e.id} className="border-t border-bb-border">
                  <td className="px-4 py-2 text-xs text-bb-text-secondary whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-xs font-semibold text-bb-text">{e.action}</td>
                  <td className="px-4 py-2 text-bb-text-secondary">{e.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length === 0 && <p className="text-center text-bb-text-secondary py-10">No audit entries found.</p>}
        </div>
      )}
    </div>
  );
}
