'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { adminGetBooking, adminCancelBooking, adminResendConfirmation, adminResendTickets, adminCreateRefund } from '@/lib/api';
import { formatMoney } from '@/lib/format';

export default function AdminBookingDetailPage() {
  const { token } = useAuth();
  const params = useParams<{ bookingReference: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  function load() {
    if (!token) return;
    adminGetBooking(params.bookingReference, token)
      .then((res) => setBooking(res.data))
      .finally(() => setLoading(false));
  }
  useEffect(load, [token, params.bookingReference]);

  async function handleCancel() {
    if (!token) return;
    const reason = prompt('Cancellation reason?');
    if (!reason) return;
    setBusy(true);
    try {
      await adminCancelBooking(params.bookingReference, reason, token);
      setMessage('Booking cancelled.');
      load();
    } finally {
      setBusy(false);
    }
  }

  async function handleResend(type: 'confirmation' | 'tickets') {
    if (!token) return;
    setBusy(true);
    try {
      if (type === 'confirmation') await adminResendConfirmation(params.bookingReference, token);
      else await adminResendTickets(params.bookingReference, token);
      setMessage(`Resent ${type}.`);
    } finally {
      setBusy(false);
    }
  }

  async function handleRefund() {
    if (!token || !booking) return;
    const remaining = booking.totalAmountMinor - booking.refundedAmountMinor;
    const amountStr = prompt(`Refund amount in cents (max ${remaining})?`, String(remaining));
    if (!amountStr) return;
    const reason = prompt('Refund reason?');
    if (!reason) return;
    setBusy(true);
    try {
      await adminCreateRefund({ bookingId: booking.id, amountMinor: Number(amountStr), reason }, token);
      setMessage('Refund requested.');
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-bb-text-secondary">Loading…</p>;
  if (!booking) return <p className="text-bb-text-secondary">Booking not found.</p>;

  return (
    <div className="max-w-2xl">
      <Link href="/admin/bookings" className="text-sm text-bb-green hover:text-bb-green-dark">&larr; Back to bookings</Link>

      <h1 className="font-display font-bold text-2xl text-bb-text mt-3 mb-1">{booking.bookingReference}</h1>
      <p className="text-bb-text-secondary mb-6">{booking.eventTitleSnapshot}</p>

      {message && <p className="text-sm text-bb-green mb-4">{message}</p>}

      <div className="bg-bb-surface border border-bb-border rounded-2xl p-6 mb-6 grid grid-cols-2 gap-4 text-sm">
        <div><p className="text-bb-text-secondary">Buyer</p><p className="font-semibold text-bb-text">{booking.buyerName}</p></div>
        <div><p className="text-bb-text-secondary">Email</p><p className="font-semibold text-bb-text">{booking.buyerEmail}</p></div>
        <div><p className="text-bb-text-secondary">Quantity</p><p className="font-semibold text-bb-text">{booking.quantity}</p></div>
        <div><p className="text-bb-text-secondary">Total</p><p className="font-semibold text-bb-text">{formatMoney(booking.totalAmountMinor, booking.currency)}</p></div>
        <div><p className="text-bb-text-secondary">Status</p><p className="font-semibold text-bb-text">{booking.bookingStatus}</p></div>
        <div><p className="text-bb-text-secondary">Payment</p><p className="font-semibold text-bb-text">{booking.paymentStatus} ({booking.paymentMethod})</p></div>
        {booking.refundedAmountMinor > 0 && (
          <div><p className="text-bb-text-secondary">Refunded</p><p className="font-semibold text-bb-text">{formatMoney(booking.refundedAmountMinor, booking.currency)}</p></div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {booking.bookingStatus === 'CONFIRMED' && (
          <>
            <button onClick={() => handleResend('confirmation')} disabled={busy} className="text-sm font-semibold border border-bb-border rounded-full px-4 py-2 hover:border-bb-green disabled:opacity-60">Resend confirmation</button>
            <button onClick={() => handleResend('tickets')} disabled={busy} className="text-sm font-semibold border border-bb-border rounded-full px-4 py-2 hover:border-bb-green disabled:opacity-60">Resend tickets</button>
            <button onClick={handleRefund} disabled={busy} className="text-sm font-semibold border border-bb-border rounded-full px-4 py-2 hover:border-bb-green disabled:opacity-60">Issue refund</button>
          </>
        )}
        {!['CANCELLED', 'REFUNDED', 'EXPIRED'].includes(booking.bookingStatus) && (
          <button onClick={handleCancel} disabled={busy} className="text-sm font-semibold text-bb-red border border-bb-red/40 rounded-full px-4 py-2 hover:bg-bb-red/5 disabled:opacity-60">Cancel booking</button>
        )}
      </div>

      {booking.tickets && booking.tickets.length > 0 && (
        <div>
          <h2 className="font-display font-bold text-lg text-bb-text mb-3">Tickets</h2>
          <div className="space-y-2">
            {booking.tickets.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between border border-bb-border rounded-xl p-3 text-sm">
                <span>#{t.ticketNumber} — {t.attendeeName}</span>
                <span className="text-xs text-bb-text-secondary">{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
