'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  adminGetEvent,
  adminUpdateEvent,
  adminEventAction,
  adminCreateTicketTier,
  adminUpdateTicketTier,
  adminDeleteTicketTier,
  getPresignedUpload,
  uploadToPresignedUrl,
} from '@/lib/api';
import { formatMoney } from '@/lib/format';

const LIFECYCLE_ACTIONS: Record<string, { action: any; label: string }[]> = {
  DRAFT: [{ action: 'publish', label: 'Publish' }],
  PUBLISHED: [
    { action: 'pause-sales', label: 'Pause sales' },
    { action: 'cancel', label: 'Cancel event' },
    { action: 'complete', label: 'Mark complete' },
  ],
  SALES_PAUSED: [
    { action: 'resume-sales', label: 'Resume sales' },
    { action: 'cancel', label: 'Cancel event' },
  ],
};

export default function AdminEventDetailPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAddTier, setShowAddTier] = useState(false);
  const [tierForm, setTierForm] = useState({
    name: '', priceEuros: '0.00', maxQuantity: 50, salesStartAt: '', salesEndAt: '', type: 'STANDARD',
  });
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editTierForm, setEditTierForm] = useState({ priceEuros: '0.00', maxQuantity: 0 });
  const [uploadingImage, setUploadingImage] = useState(false);

  function load() {
    if (!token) return;
    adminGetEvent(params.id, token)
      .then((res) => setEvent(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token, params.id]);

  async function handleAction(action: string) {
    if (!token) return;
    let body: Record<string, any> | undefined;
    if (action === 'cancel') {
      const reason = prompt('Cancellation reason?') || 'Cancelled by organizer';
      body = { reason, message: `This event has been cancelled: ${reason}` };
    }
    setSaving(true);
    setError('');
    try {
      await adminEventAction(params.id, action as any, token, body);
      load();
    } catch (err: any) {
      setError(err.message || 'Action failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveField(field: string, value: any) {
    if (!token) return;
    await adminUpdateEvent(params.id, { [field]: value }, token);
    load();
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploadingImage(true);
    setError('');
    try {
      const { data } = await getPresignedUpload(file.type, 'events', token);
      await uploadToPresignedUrl(data.uploadUrl, file);
      await handleSaveField('heroImageUrl', data.publicUrl);
    } catch (err: any) {
      setError(err.message || 'Image upload failed.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  }

  async function handleAddTier(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    try {
      await adminCreateTicketTier(
        params.id,
        {
          name: tierForm.name,
          type: tierForm.type,
          priceAmountMinor: Math.round(Number(tierForm.priceEuros) * 100),
          maxQuantity: Number(tierForm.maxQuantity),
          salesStartAt: new Date(tierForm.salesStartAt).toISOString(),
          salesEndAt: new Date(tierForm.salesEndAt).toISOString(),
        },
        token,
      );
      setShowAddTier(false);
      setTierForm({ name: '', priceEuros: '0.00', maxQuantity: 50, salesStartAt: '', salesEndAt: '', type: 'STANDARD' });
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to add ticket type.');
    }
  }

  function startEditTier(tier: any) {
    setEditingTierId(tier.id);
    setEditTierForm({ priceEuros: (tier.priceAmountMinor / 100).toFixed(2), maxQuantity: tier.maxQuantity });
  }

  async function handleSaveTier(tierId: string) {
    if (!token) return;
    try {
      await adminUpdateTicketTier(
        params.id,
        tierId,
        {
          priceAmountMinor: Math.round(Number(editTierForm.priceEuros) * 100),
          maxQuantity: Number(editTierForm.maxQuantity),
        },
        token,
      );
      setEditingTierId(null);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to update ticket type.');
    }
  }

  async function handleDeleteTier(tierId: string) {
    if (!token || !confirm('Delete this ticket type?')) return;
    try {
      await adminDeleteTicketTier(params.id, tierId, token);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function toggleTierVisibility(tier: any) {
    if (!token) return;
    await adminUpdateTicketTier(params.id, tier.id, { visible: !tier.visible }, token);
    load();
  }

  if (loading) return <p className="text-bb-text-secondary">Loading…</p>;
  if (!event) return <p className="text-bb-text-secondary">Event not found.</p>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display font-bold text-2xl text-bb-text">{event.title}</h1>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-bb-pale-green text-bb-green">{event.status}</span>
      </div>
      <p className="text-bb-text-secondary mb-6">{event.venueName}, {event.city}</p>

      {error && <p className="text-sm text-bb-red mb-4">{error}</p>}

      <div className="flex flex-wrap gap-2 mb-8">
        {(LIFECYCLE_ACTIONS[event.status] || []).map((a) => (
          <button
            key={a.action}
            onClick={() => handleAction(a.action)}
            disabled={saving}
            className="text-sm font-semibold border border-bb-border rounded-full px-4 py-2 hover:border-bb-green transition-colors disabled:opacity-60"
          >
            {a.label}
          </button>
        ))}
        <button
          onClick={() => handleAction('duplicate')}
          disabled={saving}
          className="text-sm font-semibold border border-bb-border rounded-full px-4 py-2 hover:border-bb-green transition-colors disabled:opacity-60"
        >
          Duplicate
        </button>
      </div>

      <div className="bg-bb-surface border border-bb-border rounded-2xl p-6 mb-8 space-y-4">
        <h2 className="font-display font-bold text-lg text-bb-text">Details</h2>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Hero image</label>
          {event.heroImageUrl && (
            <img src={event.heroImageUrl} alt={event.title} className="w-full max-h-56 object-cover rounded-lg mb-2 bg-bb-neutral" />
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageUpload}
            disabled={uploadingImage}
            className="w-full text-sm text-bb-text-secondary file:mr-3 file:rounded-full file:border-0 file:bg-bb-orange file:text-white file:px-4 file:py-2 file:text-sm file:font-semibold hover:file:bg-bb-orange-dark disabled:opacity-60"
          />
          {uploadingImage && <p className="text-xs text-bb-text-secondary mt-1">Uploading…</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Title</label>
          <input
            defaultValue={event.title}
            onBlur={(e) => e.target.value !== event.title && handleSaveField('title', e.target.value)}
            className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Short description</label>
          <input
            defaultValue={event.shortDescription}
            onBlur={(e) => e.target.value !== event.shortDescription && handleSaveField('shortDescription', e.target.value)}
            className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Full description</label>
          <textarea
            rows={4}
            defaultValue={event.longDescription}
            onBlur={(e) => e.target.value !== event.longDescription && handleSaveField('longDescription', e.target.value)}
            className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Refund policy</label>
          <textarea
            rows={2}
            defaultValue={event.refundPolicy}
            onBlur={(e) => e.target.value !== event.refundPolicy && handleSaveField('refundPolicy', e.target.value)}
            className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm"
          />
        </div>
      </div>

      <div className="bg-bb-surface border border-bb-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-bb-text">Ticket types</h2>
          <button
            onClick={() => setShowAddTier((v) => !v)}
            className="text-sm font-semibold text-bb-green hover:text-bb-green-dark"
          >
            {showAddTier ? 'Cancel' : '+ Add ticket type'}
          </button>
        </div>

        {showAddTier && (
          <form onSubmit={handleAddTier} className="grid grid-cols-2 gap-3 mb-6 bg-bb-neutral rounded-xl p-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-bb-text-secondary mb-1">Ticket name</label>
              <input required placeholder="e.g. Early Bird" value={tierForm.name} onChange={(e) => setTierForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-bb-border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-bb-text-secondary mb-1">Price (€ per ticket)</label>
              <input required type="number" min={0} step="0.01" placeholder="10.00" value={tierForm.priceEuros} onChange={(e) => setTierForm((f) => ({ ...f, priceEuros: e.target.value }))} className="w-full rounded-lg border border-bb-border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-bb-text-secondary mb-1">Capacity (tickets available)</label>
              <input required type="number" min={1} placeholder="50" value={tierForm.maxQuantity} onChange={(e) => setTierForm((f) => ({ ...f, maxQuantity: Number(e.target.value) }))} className="w-full rounded-lg border border-bb-border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-bb-text-secondary mb-1">Sales start</label>
              <input required type="datetime-local" value={tierForm.salesStartAt} onChange={(e) => setTierForm((f) => ({ ...f, salesStartAt: e.target.value }))} className="w-full rounded-lg border border-bb-border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-bb-text-secondary mb-1">Sales end</label>
              <input required type="datetime-local" value={tierForm.salesEndAt} onChange={(e) => setTierForm((f) => ({ ...f, salesEndAt: e.target.value }))} className="w-full rounded-lg border border-bb-border px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="col-span-2 bg-bb-orange hover:bg-bb-orange-dark text-white font-semibold py-2 rounded-full text-sm transition-colors">
              Add ticket type
            </button>
          </form>
        )}

        <div className="space-y-2">
          {(event.ticketTiers || []).map((tier: any) => (
            <div key={tier.id} className="border border-bb-border rounded-xl p-3">
              {editingTierId === tier.id ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-bb-text-secondary mb-1">Price (€ per ticket)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={editTierForm.priceEuros}
                      onChange={(e) => setEditTierForm((f) => ({ ...f, priceEuros: e.target.value }))}
                      className="w-full rounded-lg border border-bb-border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-bb-text-secondary mb-1">Capacity (tickets available)</label>
                    <input
                      type="number"
                      min={tier.quantitySold}
                      value={editTierForm.maxQuantity}
                      onChange={(e) => setEditTierForm((f) => ({ ...f, maxQuantity: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-bb-border px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <button onClick={() => handleSaveTier(tier.id)} className="text-xs font-semibold text-white bg-bb-green rounded-full px-4 py-2 hover:bg-bb-green-dark">
                      Save
                    </button>
                    <button onClick={() => setEditingTierId(null)} className="text-xs font-semibold text-bb-text-secondary hover:text-bb-text px-4 py-2">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-bb-text text-sm">{tier.name}</p>
                    <p className="text-xs text-bb-text-secondary">
                      {formatMoney(tier.priceAmountMinor, tier.currency)} · {tier.quantitySold}/{tier.maxQuantity} sold
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEditTier(tier)} className="text-xs font-semibold text-bb-text-secondary hover:text-bb-text">
                      Edit
                    </button>
                    <button onClick={() => toggleTierVisibility(tier)} className="text-xs font-semibold text-bb-text-secondary hover:text-bb-text">
                      {tier.visible ? 'Hide' : 'Show'}
                    </button>
                    <button onClick={() => handleDeleteTier(tier.id)} className="text-xs font-semibold text-bb-red hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {(!event.ticketTiers || event.ticketTiers.length === 0) && (
            <p className="text-sm text-bb-text-secondary">No ticket types yet — add one before publishing.</p>
          )}
        </div>
      </div>
    </div>
  );
}
