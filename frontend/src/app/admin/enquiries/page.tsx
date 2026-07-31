'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { adminGetServiceEnquiries, adminExportServiceEnquiries } from '@/lib/api';

const STATUS_OPTIONS = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'SPAM'];

export default function AdminServiceEnquiriesPage() {
  const { token } = useAuth();
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await adminGetServiceEnquiries(token, { status: status || undefined, q: q || undefined });
      setEnquiries(res.data);
    } finally {
      setLoading(false);
    }
  }, [token, status, q]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleExport() {
    if (!token) return;
    setExporting(true);
    try {
      const blob = await adminExportServiceEnquiries({ status: status || undefined, q: q || undefined }, token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'service-enquiries-export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-bb-text">Event-service enquiries</h1>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="border border-bb-border font-semibold px-5 py-2.5 rounded-full text-sm hover:border-bb-green transition-colors disabled:opacity-60"
        >
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input placeholder="Search name, email, phone…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-lg border border-bb-border px-4 py-2 text-sm flex-1 min-w-[200px]" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-bb-border px-4 py-2 text-sm">
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-bb-text-secondary">Loading…</p>
      ) : (
        <div className="bg-bb-surface border border-bb-border rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bb-neutral text-bb-text-secondary text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Received</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.map((e) => (
                <tr key={e.id} className="border-t border-bb-border hover:bg-bb-neutral/50">
                  <td className="px-4 py-2">
                    <Link href={`/admin/enquiries/${e.id}`} className="text-bb-text font-medium hover:underline">{e.fullName}</Link>
                    <p className="text-xs text-bb-text-secondary">{e.email}</p>
                  </td>
                  <td className="px-4 py-2 text-bb-text-secondary">{e.eventServiceType}</td>
                  <td className="px-4 py-2 text-xs text-bb-text-secondary">{e.status}</td>
                  <td className="px-4 py-2 text-xs text-bb-text-secondary">{new Date(e.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {enquiries.length === 0 && <p className="text-center text-bb-text-secondary py-10">No enquiries found.</p>}
        </div>
      )}
    </div>
  );
}
