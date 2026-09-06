'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { adminGetSettings, adminUpdateSettings, getPresignedUpload, uploadToPresignedUrl } from '@/lib/api';

export default function AdminSettingsPage() {
  const { token } = useAuth();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [draggingCrop, setDraggingCrop] = useState(false);

  useEffect(() => {
    if (token) adminGetSettings(token).then((res) => setForm(res.data));
  }, [token]);

  function set(key: string, value: any) {
    setForm((f: any) => ({ ...f, [key]: value }));
  }

  async function handleHeroImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploadingImage(true);
    try {
      const { data } = await getPresignedUpload(file.type, 'general', token);
      await uploadToPresignedUrl(data.uploadUrl, file);
      set('heroImageUrl', data.publicUrl);
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await adminUpdateSettings(form, token);
      setForm(res.data);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const [positionX = '50%', positionY = '50%'] = (form?.heroImagePosition || '50% 50%').split(' ');
  const zoom = Number(form?.heroImageZoom) || 1;

  function updateCrop(nextX: number, nextY: number) {
    set('heroImagePosition', `${Math.max(0, Math.min(100, nextX))}% ${Math.max(0, Math.min(100, nextY))}%`);
  }

  function handleCropPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingCrop(true);
  }

  function handleCropPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingCrop) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const deltaX = (e.movementX / rect.width) * 100 / Math.max(zoom, 1);
    const deltaY = (e.movementY / rect.height) * 100 / Math.max(zoom, 1);
    updateCrop(parseFloat(positionX) - deltaX, parseFloat(positionY) - deltaY);
  }

  function handleCropPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDraggingCrop(false);
  }

  if (!form) return <p className="text-bb-text-secondary">Loading…</p>;

  return (
    <div className="max-w-xl">
      <h1 className="font-display font-bold text-2xl text-bb-text mb-6">Organization settings</h1>

      <form onSubmit={handleSubmit} className="space-y-4 bg-bb-surface border border-bb-border rounded-2xl p-6">
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Homepage hero image</label>
          {form.heroImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <div
              className={`relative w-full max-w-xl aspect-video overflow-hidden rounded-xl border border-bb-border mb-2 bg-bb-ink touch-none ${draggingCrop ? 'cursor-grabbing' : 'cursor-grab'}`}
              onPointerDown={handleCropPointerDown}
              onPointerMove={handleCropPointerMove}
              onPointerUp={handleCropPointerUp}
              onPointerCancel={handleCropPointerUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.heroImageUrl}
                alt=""
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover select-none"
                style={{ objectPosition: form.heroImagePosition || '50% 50%', transform: `scale(${zoom})` }}
              />
              <div className="absolute inset-0 pointer-events-none ring-2 ring-inset ring-white/70" />
            </div>
          )}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleHeroImageUpload} disabled={uploadingImage} className="text-sm" />
          {uploadingImage && <p className="text-xs text-bb-text-secondary mt-1">Uploading…</p>}
          <p className="text-xs text-bb-text-muted mt-1">Drag the image to choose the crop. The frame is locked to 16:9.</p>
          {form.heroImageUrl && (
            <div className="mt-4">
              <label className="text-xs text-bb-text-secondary">
                Zoom
                <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(e) => set('heroImageZoom', Number(e.target.value))} className="w-full mt-2" />
              </label>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-bb-text-muted">{zoom.toFixed(2)}x</span>
                <button type="button" onClick={() => { set('heroImagePosition', '50% 50%'); set('heroImageZoom', 1); }} className="text-xs font-semibold text-bb-gold hover:text-bb-gold-dark">
                  Reset crop
                </button>
              </div>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Organization name</label>
          <input value={form.organizationName || ''} onChange={(e) => set('organizationName', e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Support email</label>
          <input type="email" value={form.supportEmail || ''} onChange={(e) => set('supportEmail', e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">Default currency</label>
            <input value={form.defaultCurrency || ''} onChange={(e) => set('defaultCurrency', e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">Default timezone</label>
            <input value={form.defaultTimezone || ''} onChange={(e) => set('defaultTimezone', e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Default refund policy</label>
          <textarea rows={3} value={form.defaultRefundPolicy || ''} onChange={(e) => set('defaultRefundPolicy', e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
        </div>
        {saved && <p className="text-sm text-bb-green">Settings saved.</p>}
        <button type="submit" disabled={saving} className="bg-bb-gold hover:bg-bb-gold-dark disabled:opacity-60 text-bb-ink font-semibold px-6 py-2.5 rounded-full transition-colors">
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </div>
  );
}
