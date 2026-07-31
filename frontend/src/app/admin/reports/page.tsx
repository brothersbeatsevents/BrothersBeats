'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { adminGetEvents, adminGetSalesReport, adminGetAttendanceReport } from '@/lib/api';
import { formatMoney } from '@/lib/format';

export default function AdminReportsPage() {
  const { token } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState('');
  const [sales, setSales] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);

  useEffect(() => {
    if (token) adminGetEvents(token).then((res) => setEvents(res.data));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    adminGetSalesReport(token, eventId || undefined).then((res) => setSales(res.data));
    if (eventId) adminGetAttendanceReport(token, eventId).then((res) => setAttendance(res.data));
    else setAttendance(null);
  }, [token, eventId]);

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-bb-text mb-6">Reports</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium text-bb-text mb-1">Filter by event</label>
        <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="rounded-lg border border-bb-border px-4 py-2 text-sm w-full max-w-sm">
          <option value="">All events</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>

      {sales && (
        <div className="mb-8">
          <h2 className="font-display font-bold text-lg text-bb-text mb-3">Sales</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-bb-surface border border-bb-border rounded-2xl p-4">
              <p className="text-sm text-bb-text-secondary">Bookings</p>
              <p className="font-display font-bold text-xl text-bb-text">{sales.totalBookings}</p>
            </div>
            <div className="bg-bb-surface border border-bb-border rounded-2xl p-4">
              <p className="text-sm text-bb-text-secondary">Tickets sold</p>
              <p className="font-display font-bold text-xl text-bb-text">{sales.totalTicketsSold}</p>
            </div>
            <div className="bg-bb-surface border border-bb-border rounded-2xl p-4">
              <p className="text-sm text-bb-text-secondary">Gross revenue</p>
              <p className="font-display font-bold text-xl text-bb-text">{formatMoney(sales.grossRevenueMinor, 'EUR')}</p>
            </div>
            <div className="bg-bb-surface border border-bb-border rounded-2xl p-4">
              <p className="text-sm text-bb-text-secondary">Net revenue</p>
              <p className="font-display font-bold text-xl text-bb-text">{formatMoney(sales.netRevenueMinor, 'EUR')}</p>
            </div>
          </div>
          {sales.byTicketTier.length > 0 && (
            <div className="bg-bb-surface border border-bb-border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-bb-neutral text-bb-text-secondary text-left">
                  <tr><th className="px-4 py-2 font-medium">Ticket type</th><th className="px-4 py-2 font-medium">Quantity</th><th className="px-4 py-2 font-medium">Gross</th></tr>
                </thead>
                <tbody>
                  {sales.byTicketTier.map((t: any, i: number) => (
                    <tr key={i} className="border-t border-bb-border">
                      <td className="px-4 py-2 text-bb-text">{t.name}</td>
                      <td className="px-4 py-2 text-bb-text-secondary">{t.quantity}</td>
                      <td className="px-4 py-2 text-bb-text-secondary">{formatMoney(t.grossMinor, 'EUR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {attendance && (
        <div>
          <h2 className="font-display font-bold text-lg text-bb-text mb-3">Attendance</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-bb-surface border border-bb-border rounded-2xl p-4">
              <p className="text-sm text-bb-text-secondary">Valid tickets</p>
              <p className="font-display font-bold text-xl text-bb-text">{attendance.validTickets}</p>
            </div>
            <div className="bg-bb-surface border border-bb-border rounded-2xl p-4">
              <p className="text-sm text-bb-text-secondary">Checked in</p>
              <p className="font-display font-bold text-xl text-bb-text">{attendance.checkedIn} ({attendance.checkedInPercent}%)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
