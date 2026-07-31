'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { adminGetCustomer } from '@/lib/api';
import { formatMoney } from '@/lib/format';

export default function AdminCustomerDetailPage() {
  const { token } = useAuth();
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    adminGetCustomer(params.id, token).then((res) => setCustomer(res.data)).finally(() => setLoading(false));
  }, [token, params.id]);

  if (loading) return <p className="text-bb-text-secondary">Loading…</p>;
  if (!customer) return <p className="text-bb-text-secondary">Customer not found.</p>;

  return (
    <div className="max-w-2xl">
      <Link href="/admin/customers" className="text-sm text-bb-green hover:text-bb-green-dark">&larr; Back to customers</Link>

      <h1 className="font-display font-bold text-2xl text-bb-text mt-3 mb-1">{customer.display_name}</h1>
      <p className="text-bb-text-secondary mb-6">{customer.email}{customer.phone ? ` · ${customer.phone}` : ''}</p>

      <h2 className="font-display font-bold text-lg text-bb-text mb-3">Booking history</h2>
      <div className="space-y-2">
        {customer.bookings.map((b: any) => (
          <div key={b.bookingReference} className="bg-bb-surface border border-bb-border rounded-xl p-4 flex items-center justify-between text-sm">
            <div>
              <p className="font-semibold text-bb-text">{b.eventTitleSnapshot}</p>
              <p className="text-xs text-bb-text-secondary">Ref: {b.bookingReference} · {b.quantity} ticket(s)</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-bb-text">{formatMoney(b.totalAmountMinor, b.currency)}</p>
              <p className="text-xs text-bb-text-secondary">{b.bookingStatus}</p>
            </div>
          </div>
        ))}
        {customer.bookings.length === 0 && <p className="text-sm text-bb-text-secondary">No bookings yet.</p>}
      </div>
    </div>
  );
}
