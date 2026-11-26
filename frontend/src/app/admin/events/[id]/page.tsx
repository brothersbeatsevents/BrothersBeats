'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  adminGetEvent,
  adminUpdateEvent,
  adminDeleteEvent,
  adminEventAction,
  adminCreateTicketTier,
  adminUpdateTicketTier,
  adminDeleteTicketTier,
  getPresignedUpload,
  uploadToPresignedUrl,
} from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { CATEGORY_LABELS } from '@/lib/site-config';

const LIFECYCLE_ACTIONS: Record<string, { action: any; label: string }[]> = {
  DRAFT: [{ action: 'publish', label: 'Publish' }],
  PUBLISHED: [
    { action: 'unpublish', label: 'Unpublish' },
    { action: 'pause-sales', label: 'Pause sales' },
    { action: 'cancel', label: 'Cancel event' },
    { action: 'complete', label: 'Mark complete' },
  ],
  SALES_PAUSED: [
    { action: 'unpublish', label: 'Unpublish' },
    { action: 'resume-sales', label: 'Resume sales' },
    { action: 'cancel', label: 'Cancel event' },
  ],
  CANCELLED: [{ action: 'unpublish', label: 'Unpublish' }],
};

function toLocalInput(value: string): string {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function toDetailsForm(e: any) {
  return {
    title: e.title || '',
    category: e.category || 'OTHER',
    visibility: e.visibility || 'PUBLIC',
    shortDescription: e.shortDescription || '',
    longDescription: e.longDescription || '',
    venueName: e.venueName || '',
    venueAddress: e.venueAddress || '',
    city: e.city || '',
    countyOrRegion: e.countyOrRegion || '',
    country: e.country || '',
    postalCode: e.postalCode || '',
    mapUrl: e.mapUrl || '',
    startDateTime: e.startDateTime ? toLocalInput(e.startDateTime) : '',
    endDateTime: e.endDateTime ? toLocalInput(e.endDateTime) : '',
    doorsOpenAt: e.doorsOpenAt ? toLocalInput(e.doorsOpenAt) : '',
    capacity: e.capacity ?? 1,
    perOrderLimit: e.perOrderLimit ?? 10,
    refundPolicy: e.refundPolicy || '',
    termsAndConditions: e.termsAndConditions || '',
    supportEmail: e.supportEmail || '',
  };
}

const INPUT_CLASS = 'w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm';

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
    name: '', description: '', priceEuros: '0.00', maxQuantity: 50, salesStartAt: '', salesEndAt: '', type: 'STANDARD',
  });
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editTierForm, setEditTierForm] = useState({ name: '', description: '', priceEuros: '0.00', maxQuantity: 0, salesStartAt: '', salesEndAt: '' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState<ReturnType<typeof toDetailsForm> | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState('');

  function setField<K extends keyof ReturnType<typeof toDetailsForm>>(key: K, value: ReturnType<typeof toDetailsForm>[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  function load(resetForm = false) {
    if (!token) return;
    adminGetEvent(params.id, token)
      .then((res) => {
        setEvent(res.data);
        if (resetForm) setForm(toDetailsForm(res.data));
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => load(true), [token, params.id]);

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !form) return;
    setSavingDetails(true);
    setError('');
    setDetailsMessage('');
    try {
      const res = await adminUpdateEvent(
        params.id,
        {
          ...form,
          startDateTime: new Date(form.startDateTime).toISOString(),
          endDateTime: new Date(form.endDateTime).toISOString(),
          doorsOpenAt: form.doorsOpenAt ? new Date(form.doorsOpenAt).toISOString() : null,
          capacity: Number(form.capacity),
          perOrderLimit: Number(form.perOrderLimit),
        },
        token,
      );
      setEvent((prev: any) => ({ ...prev, ...res.data }));
      setForm(toDetailsForm(res.data));
      setDetailsMessage('Event details saved.');
    } catch (err: any) {
      setError(err.message || 'Failed to save event details.');
    } finally {
      setSavingDetails(false);
    }
  }

  async function handleAction(action: string) {
    if (!token) return;
    if (action === 'unpublish' && !confirm('Unpublish this event? It will be hidden until published again.')) return;
    let body: Record<string, any> | undefined;
    if (action === 'cancel') {
      const reason = prompt('Cancellation reason?') || 'Cancelled by organizer';
      body = { reason, message: `This event has been cancelled: ${reason}` };
    }
    setSaving(true);
    setError('');
    try {
      await adminEventAction(params.id, action as any, token, body);
      load(true);
    } catch (err: any) {
      setError(err.message || 'Action failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEvent() {
    if (!token || !confirm('Delete this unpublished event permanently?')) return;
    setSaving(true);
    setError('');
    try {
      await adminDeleteEvent(params.id, token);
      router.push('/admin/events');
    } catch (err: any) {
      setError(err.message || 'Event could not be deleted.');
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
          description: tierForm.description,
          type: tierForm.type,
          priceAmountMinor: Math.round(Number(tierForm.priceEuros) * 100),
          maxQuantity: Number(tierForm.maxQuantity),
          salesStartAt: new Date(tierForm.salesStartAt).toISOString(),
          salesEndAt: new Date(tierForm.salesEndAt).toISOString(),
        },
        token,
      );
      setShowAddTier(false);
      setTierForm({ name: '', description: '', priceEuros: '0.00', maxQuantity: 50, salesStartAt: '', salesEndAt: '', type: 'STANDARD' });
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to add ticket type.');
    }
  }

  function startEditTier(tier: any) {
    setEditingTierId(tier.id);
    setEditTierForm({ name: tier.name, description: tier.description || '', priceEuros: (tier.priceAmountMinor / 100).toFixed(2), maxQuantity: tier.maxQuantity, salesStartAt: toLocalInput(tier.salesStartAt), salesEndAt: toLocalInput(tier.salesEndAt) });
  }

  async function handleSaveTier(tierId: string) {
    if (!token) return;
    try {
      await adminUpdateTicketTier(
        params.id,
        tierId,
        {
          name: editTierForm.name,
          description: editTierForm.description,
          salesStartAt: new Date(editTierForm.salesStartAt).toISOString(),
          salesEndAt: new Date(editTierForm.salesEndAt).toISOString(),
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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
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
            className="text-sm font-semibold border border-bb-border rounded-full px-4 py-2 hover:border-bb-gold transition-colors disabled:opacity-60"
          >
            {a.label}
          </button>
        ))}
        {event.status === 'DRAFT' && (
          <button
            onClick={handleDeleteEvent}
            disabled={saving}
            className="text-sm font-semibold border border-bb-red text-bb-red rounded-full px-4 py-2 hover:bg-bb-red/10 transition-colors disabled:opacity-60"
          >
            Delete event
          </button>
        )}
        <button
          onClick={() => handleAction('duplicate')}
          disabled={saving}
          className="text-sm font-semibold border border-bb-border rounded-full px-4 py-2 hover:border-bb-gold transition-colors disabled:opacity-60"
        >
          Duplicate
        </button>
      </div>

      <div className="bg-bb-surface border border-bb-border rounded-2xl p-4 sm:p-6 mb-8 space-y-4">
        <h2 className="font-display font-bold text-lg text-bb-text">Details</h2>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Hero image</label>
          {event.heroImageUrl && (
            <img src={event.heroImageUrl} alt={event.title} className="w-full aspect-[2/1] object-cover rounded-lg mb-2 bg-bb-neutral" />
          )}
          <p className="text-xs text-bb-text-muted mb-2">Recommended size: 2400 × 1200 px (2:1). Images are cropped to this ratio on mobile and desktop.</p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageUpload}
            disabled={uploadingImage}
            className="w-full text-sm text-bb-text-secondary file:mr-3 file:rounded-full file:border-0 file:bg-bb-gold file:text-bb-ink file:px-4 file:py-2 file:text-sm file:font-semibold hover:file:bg-bb-gold-dark disabled:opacity-60"
          />
          {uploadingImage && <p className="text-xs text-bb-text-secondary mt-1">Uploading…</p>}
        </div>
        <form onSubmit={handleSaveDetails} className="space-y-4">
          {form && (
            <>
              <div>
                <label className="block text-sm font-medium text-bb-text mb-1">Title</label>
                <input required value={form.title} onChange={(e) => setField('title', e.target.value)} className={INPUT_CLASS} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-bb-text mb-1">Category</label>
                  <select value={form.category} onChange={(e) => setField('category', e.target.value)} className={INPUT_CLASS}>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-bb-text mb-1">Visibility</label>
                  <select value={form.visibility} onChange={(e) => setField('visibility', e.target.value)} className={INPUT_CLASS}>
                    <option value="PUBLIC">Public</option>
                    <option value="UNLISTED">Unlisted</option>
                    <option value="PRIVATE">Private</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-bb-text mb-1">Short description</label>
                <input value={form.shortDescription} onChange={(e) => setField('shortDescription', e.target.value)} className={INPUT_CLASS} />
              </div>
              <div>
                <label className="block text-sm font-medium text-bb-text mb-1">Full description</label>
                <textarea rows={4} value={form.longDescription} onChange={(e) => setField('longDescription', e.target.value)} className={INPUT_CLASS} />
              </div>

              <h3 className="font-semibold text-bb-text pt-2">Date &amp; time</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-bb-text mb-1">Start date/time</label>
                  <input required type="datetime-local" value={form.startDateTime} onChange={(e) => setField('startDateTime', e.target.value)} className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bb-text mb-1">End date/time</label>
                  <input required type="datetime-local" value={form.endDateTime} onChange={(e) => setField('endDateTime', e.target.value)} className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bb-text mb-1">Doors open</label>
                  <input type="datetime-local" value={form.doorsOpenAt} onChange={(e) => setField('doorsOpenAt', e.target.value)} className={INPUT_CLASS} />
                </div>
              </div>

              <h3 className="font-semibold text-bb-text pt-2">Location</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-bb-text mb-1">Venue name</label>
                  <input required value={form.venueName} onChange={(e) => setField('venueName', e.target.value)} className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bb-text mb-1">Venue address</label>
                  <input value={form.venueAddress} onChange={(e) => setField('venueAddress', e.target.value)} className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bb-text mb-1">City</label>
                  <input required value={form.city} onChange={(e) => setField('city', e.target.value)} className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bb-text mb-1">County / region</label>
                  <input value={form.countyOrRegion} onChange={(e) => setField('countyOrRegion', e.target.value)} className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bb-text mb-1">Postal code</label>
                  <input value={form.postalCode} onChange={(e) => setField('postalCode', e.target.value)} className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bb-text mb-1">Country</label>
                  <input value={form.country} onChange={(e) => setField('country', e.target.value)} className={INPUT_CLASS} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-bb-text mb-1">Map URL</label>
                <input type="url" value={form.mapUrl} onChange={(e) => setField('mapUrl', e.target.value)} className={INPUT_CLASS} />
              </div>

              <h3 className="font-semibold text-bb-text pt-2">Capacity &amp; policies</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-bb-text mb-1">Capacity</label>
                  <input required type="number" min={Math.max(1, (event.totalTicketsSold || 0) + (event.totalTicketsReserved || 0))} value={form.capacity} onChange={(e) => setField('capacity', Number(e.target.value))} className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bb-text mb-1">Per-order limit</label>
                  <input required type="number" min={1} value={form.perOrderLimit} onChange={(e) => setField('perOrderLimit', Number(e.target.value))} className={INPUT_CLASS} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-bb-text mb-1">Support email</label>
                <input type="email" value={form.supportEmail} onChange={(e) => setField('supportEmail', e.target.value)} className={INPUT_CLASS} />
              </div>
              <div>
                <label className="block text-sm font-medium text-bb-text mb-1">Refund policy</label>
                <textarea rows={2} value={form.refundPolicy} onChange={(e) => setField('refundPolicy', e.target.value)} className={INPUT_CLASS} />
              </div>
              <div>
                <label className="block text-sm font-medium text-bb-text mb-1">Terms and conditions</label>
                <textarea rows={3} value={form.termsAndConditions} onChange={(e) => setField('termsAndConditions', e.target.value)} className={INPUT_CLASS} />
              </div>

              {event.status !== 'DRAFT' && (event.totalTicketsSold > 0 || event.totalTicketsReserved > 0) && (
                <p className="text-xs text-bb-text-muted">
                  Changing the date, time, venue or city will email everyone with a confirmed booking.
                </p>
              )}
              {detailsMessage && <p className="text-sm text-bb-green">{detailsMessage}</p>}
              <button type="submit" disabled={savingDetails} className="bg-bb-gold hover:bg-bb-gold-dark disabled:opacity-60 text-bb-ink font-semibold px-6 py-2.5 rounded-full transition-colors">
                {savingDetails ? 'Saving…' : 'Save changes'}
              </button>
            </>
          )}
        </form>
      </div>

      <div className="bg-bb-surface border border-bb-border rounded-2xl p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-display font-bold text-lg text-bb-text">Ticket types</h2>
          <button
            onClick={() => setShowAddTier((v) => !v)}
            className="text-sm font-semibold text-bb-gold hover:text-bb-gold-dark"
          >
            {showAddTier ? 'Cancel' : '+ Add ticket type'}
          </button>
        </div>

        {showAddTier && (
          <form onSubmit={handleAddTier} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 bg-bb-neutral rounded-xl p-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-bb-text-secondary mb-1">Ticket name</label>
              <input required placeholder="e.g. General Admission" value={tierForm.name} onChange={(e) => setTierForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-bb-border px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-bb-text-secondary mb-1">Type</label>
              <select value={tierForm.type} onChange={(e) => setTierForm((f) => ({ ...f, type: e.target.value, ...(e.target.value === 'CHILD' ? { name: 'Child 0–12 yrs', priceEuros: '0.00' } : {}) }))} className="w-full rounded-lg border border-bb-border px-3 py-2 text-sm">
                <option value="STANDARD">Standard</option>
                <option value="EARLY_BIRD">Early Bird</option>
                <option value="GROUP">Group</option>
                <option value="CHILD">Child</option>
                <option value="VIP">VIP</option>
                <option value="COMPLIMENTARY">Complimentary</option>
                <option value="CUSTOM">Custom</option>
              </select>
              {tierForm.type === 'CHILD' && <p className="text-xs text-bb-text-muted mt-1">Set the age range in the ticket name. Free child tickets still count toward event capacity and attendance.</p>}
              {tierForm.type === 'EARLY_BIRD' && (
                <p className="text-xs text-bb-text-muted mt-1">
                  Early Bird isn&apos;t shown as a selectable option — its price is applied automatically to the
                  first Standard tickets sold, up to this capacity.
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-bb-text-secondary mb-1">Description / age guidance</label>
              <input value={tierForm.description} onChange={(e) => setTierForm((f) => ({ ...f, description: e.target.value }))} className="w-full rounded-lg border border-bb-border px-3 py-2 text-sm" />
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
            <button type="submit" className="sm:col-span-2 bg-bb-gold hover:bg-bb-gold-dark text-bb-ink font-semibold py-2 rounded-full text-sm transition-colors">
              Add ticket type
            </button>
          </form>
        )}

        <div className="space-y-2">
          {(event.ticketTiers || []).map((tier: any) => (
            <div key={tier.id} className="border border-bb-border rounded-xl p-3">
              {editingTierId === tier.id ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-bb-text-secondary mb-1">Ticket name</label>
                    <input value={editTierForm.name} onChange={(e) => setEditTierForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-bb-border px-3 py-2 text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-bb-text-secondary mb-1">Description / age guidance</label>
                    <input value={editTierForm.description} onChange={(e) => setEditTierForm((f) => ({ ...f, description: e.target.value }))} className="w-full rounded-lg border border-bb-border px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-bb-text-secondary mb-1">Sales start</label>
                    <input type="datetime-local" value={editTierForm.salesStartAt} onChange={(e) => setEditTierForm((f) => ({ ...f, salesStartAt: e.target.value }))} className="w-full rounded-lg border border-bb-border px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-bb-text-secondary mb-1">Sales end</label>
                    <input type="datetime-local" value={editTierForm.salesEndAt} onChange={(e) => setEditTierForm((f) => ({ ...f, salesEndAt: e.target.value }))} className="w-full rounded-lg border border-bb-border px-3 py-2 text-sm" />
                  </div>
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
                      min={Math.max(1, tier.quantitySold + tier.quantityReserved)}
                      value={editTierForm.maxQuantity}
                      onChange={(e) => setEditTierForm((f) => ({ ...f, maxQuantity: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-bb-border px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap gap-2">
                    <button onClick={() => handleSaveTier(tier.id)} className="text-xs font-semibold text-bb-ink bg-bb-gold rounded-full px-4 py-2 hover:bg-bb-gold-dark">
                      Save
                    </button>
                    <button onClick={() => setEditingTierId(null)} className="text-xs font-semibold text-bb-text-secondary hover:text-bb-text px-4 py-2">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-bb-text text-sm">{tier.name}</p>
                    <p className="text-xs text-bb-text-secondary">
                      {tier.priceAmountMinor === 0 ? 'Free' : formatMoney(tier.priceAmountMinor, tier.currency)} · {tier.quantitySold}/{tier.maxQuantity} booked · {tier.quantityReserved} reserved
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
