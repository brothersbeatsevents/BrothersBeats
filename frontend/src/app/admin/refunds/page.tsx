'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { adminGetRefunds, adminRetryRefund } from '@/lib/api';
import { formatMoney } from '@/lib/format';

const STATUS_STYLES: Record<string, string> = {
  REQUESTED: 'bg-[#FFF7DA] text-[#B8860B]',
  PROCESSING: 'bg-bb-pale-blue text-bb-blue',
  SUCCEEDED: 'bg-bb-pale-green text-bb-green',
  FAILED: 'bg-[#FFF0EF] text-bb-red',
};

export default function AdminRefundsPage() {
  const { token } = useAuth();
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    if (!token) return;
    adminGetRefunds(token).then((res) => setRefunds(res.data)).finally(() => setLoading(false));
  }
  useEffect(load, [token]);

  async function handleRetry(id: string) {
    if (!token) return;
    try {
      await adminRetryRefund(id, token);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-bb-text mb-6">Refunds</h1>
      <p className="text-sm text-bb-text-secondary mb-6">
        Refunds are requested from a booking&apos;s detail page. This page tracks their status.
      </p>

      {loading ? (
        <p className="text-bb-text-secondary">Loading…</p>
      ) : (
        <div className="bg-bb-surface border border-bb-border rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bb-neutral text-bb-text-secondary text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Reason</th>
                <th className="px-4 py-2 font-medium">Provider</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Requested</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((r) => (
                <tr key={r.id} className="border-t border-bb-border">
                  <td className="px-4 py-2 text-bb-text">{formatMoney(r.amountMinor, r.currency)}</td>
                  <td className="px-4 py-2 text-bb-text-secondary">{r.reason}</td>
                  <td className="px-4 py-2 text-bb-text-secondary">{r.provider}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[r.status] || ''}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-2 text-bb-text-secondary text-xs">{new Date(r.requestedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    {r.status === 'FAILED' && (
                      <button onClick={() => handleRetry(r.id)} className="text-xs font-semibold text-bb-green hover:underline">Retry</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {refunds.length === 0 && <p className="text-center text-bb-text-secondary py-10">No refunds yet.</p>}
        </div>
      )}
    </div>
  );
}
