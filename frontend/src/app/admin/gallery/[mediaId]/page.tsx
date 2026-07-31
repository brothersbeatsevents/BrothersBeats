'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  adminGetGalleryItem,
  adminUpdateGalleryItem,
  adminPublishGalleryItem,
  adminUnpublishGalleryItem,
  adminArchiveGalleryItem,
  adminDeleteGalleryItem,
} from '@/lib/api';
import SafeYouTubeEmbed from '@/components/ui/SafeYouTubeEmbed';

export default function GalleryMediaDetailPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams<{ mediaId: string }>();

  const [item, setItem] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [altText, setAltText] = useState('');
  const [featured, setFeatured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !params.mediaId) return;
    adminGetGalleryItem(params.mediaId, token)
      .then((res) => {
        setItem(res.data);
        setTitle(res.data.title || '');
        setCaption(res.data.caption || '');
        setAltText(res.data.altText || '');
        setFeatured(!!res.data.featured);
      })
      .finally(() => setLoading(false));
  }, [token, params.mediaId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const res = await adminUpdateGalleryItem(params.mediaId, { title, caption, altText, featured }, token);
      setItem(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!token) return;
    setError('');
    try {
      const res = await adminPublishGalleryItem(params.mediaId, token);
      setItem(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to publish.');
    }
  }

  async function handleUnpublish() {
    if (!token) return;
    const res = await adminUnpublishGalleryItem(params.mediaId, token);
    setItem(res.data);
  }

  async function handleArchive() {
    if (!token) return;
    const res = await adminArchiveGalleryItem(params.mediaId, token);
    setItem(res.data);
  }

  async function handleDelete() {
    if (!token) return;
    if (!confirm('Delete this gallery item permanently? This cannot be undone.')) return;
    await adminDeleteGalleryItem(params.mediaId, token);
    router.push('/admin/gallery');
  }

  if (loading) return <p className="text-bb-text-secondary">Loading…</p>;
  if (!item) return <p className="text-bb-text-secondary">Gallery item not found.</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-bb-text">Edit gallery media</h1>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-bb-neutral text-bb-text-secondary">{item.status}</span>
      </div>

      <div className="mb-6">
        {item.type === 'IMAGE' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.altText || item.title} className="w-full max-h-96 object-contain rounded-xl bg-bb-neutral" />
        ) : (
          <SafeYouTubeEmbed videoId={item.youtubeVideoId} title={item.title} />
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4 bg-bb-surface border border-bb-border rounded-2xl p-6">
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Title</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Caption</label>
          <input value={caption} onChange={(e) => setCaption(e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
        </div>
        {item.type === 'IMAGE' && (
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">Alt text (required to publish)</label>
            <input value={altText} onChange={(e) => setAltText(e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-bb-text">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
          Feature this item at the top of the gallery
        </label>

        {error && <p className="text-sm text-bb-red">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={saving} className="bg-bb-orange hover:bg-bb-orange-dark disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-full transition-colors">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {item.status !== 'PUBLISHED' && item.status !== 'ARCHIVED' && (
            <button type="button" onClick={handlePublish} className="border border-bb-green text-bb-green font-semibold px-6 py-2.5 rounded-full hover:bg-bb-pale-green transition-colors">
              Publish
            </button>
          )}
          {item.status === 'PUBLISHED' && (
            <button type="button" onClick={handleUnpublish} className="border border-bb-border font-semibold px-6 py-2.5 rounded-full hover:border-bb-text transition-colors">
              Unpublish
            </button>
          )}
          {item.status !== 'ARCHIVED' && (
            <button type="button" onClick={handleArchive} className="border border-bb-border font-semibold px-6 py-2.5 rounded-full hover:border-bb-text transition-colors">
              Archive
            </button>
          )}
          <button type="button" onClick={handleDelete} className="border border-bb-red text-bb-red font-semibold px-6 py-2.5 rounded-full hover:bg-red-50 transition-colors">
            Delete
          </button>
        </div>
      </form>
    </div>
  );
}
