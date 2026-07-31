'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { adminGetCustomers } from '@/lib/api';

export default function AdminCustomersPage() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    adminGetCustomers(token, q || undefined).then((res) => setCustomers(res.data)).finally(() => setLoading(false));
  }, [token, q]);

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-bb-text mb-6">Customers</h1>

      <input
        placeholder="Search by name or email…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="rounded-lg border border-bb-border px-4 py-2 text-sm mb-4 w-full max-w-sm"
      />

      {loading ? (
        <p className="text-bb-text-secondary">Loading…</p>
      ) : (
        <div className="bg-bb-surface border border-bb-border rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bb-neutral text-bb-text-secondary text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Joined</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-t border-bb-border hover:bg-bb-neutral/50">
                  <td className="px-4 py-2">
                    <Link href={`/admin/customers/${c.id}`} className="text-bb-green font-semibold hover:underline">{c.display_name}</Link>
                  </td>
                  <td className="px-4 py-2 text-bb-text-secondary">{c.email}</td>
                  <td className="px-4 py-2 text-bb-text-secondary text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-xs">{c.disabled ? 'Disabled' : 'Active'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 && <p className="text-center text-bb-text-secondary py-10">No customers found.</p>}
        </div>
      )}
    </div>
  );
}
