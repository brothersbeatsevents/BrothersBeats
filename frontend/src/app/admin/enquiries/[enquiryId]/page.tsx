'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { adminGetServiceEnquiry, adminUpdateServiceEnquiry } from '@/lib/api';

const STATUS_OPTIONS = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'SPAM'];

export default function AdminServiceEnquiryDetailPage() {
  const { token } = useAuth();
  const params = useParams<{ enquiryId: string }>();

  const [enquiry, setEnquiry] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !params.enquiryId) return;
    adminGetServiceEnquiry(params.enquiryId, token)
      .then((res) => {
        setEnquiry(res.data);
        setStatus(res.data.status);
        setInternalNotes(res.data.internalNotes || '');
      })
      .finally(() => setLoading(false));
  }, [token, params.enquiryId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const res = await adminUpdateServiceEnquiry(params.enquiryId, { status, internalNotes }, token);
      setEnquiry(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-bb-text-secondary">Loading…</p>;
  if (!enquiry) return <p className="text-bb-text-secondary">Enquiry not found.</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display font-bold text-2xl text-bb-text mb-6">{enquiry.fullName}</h1>

      <div className="bg-bb-surface border border-bb-border rounded-2xl p-6 mb-6 space-y-2 text-sm">
        <p><span className="text-bb-text-secondary">Type:</span> {enquiry.eventServiceType}</p>
        <p><span className="text-bb-text-secondary">Email:</span> {enquiry.email}</p>
        {enquiry.phone && <p><span className="text-bb-text-secondary">Phone:</span> {enquiry.phone}</p>}
        {enquiry.preferredDate && <p><span className="text-bb-text-secondary">Preferred date:</span> {new Date(enquiry.preferredDate).toLocaleDateString()}</p>}
        {enquiry.venueOrCity && <p><span className="text-bb-text-secondary">Venue/city:</span> {enquiry.venueOrCity}</p>}
        {enquiry.estimatedGuestCount && <p><span className="text-bb-text-secondary">Estimated guests:</span> {enquiry.estimatedGuestCount}</p>}
        {enquiry.budgetRange && <p><span className="text-bb-text-secondary">Budget:</span> {enquiry.budgetRange}</p>}
        <p className="pt-2 border-t border-bb-border mt-2 whitespace-pre-wrap text-bb-text">{enquiry.message}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 bg-bb-surface border border-bb-border rounded-2xl p-6">
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm">
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Internal notes</label>
          <textarea rows={5} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
        </div>
        {error && <p className="text-sm text-bb-red">{error}</p>}
        <button type="submit" disabled={saving} className="bg-bb-orange hover:bg-bb-orange-dark disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-full transition-colors">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
