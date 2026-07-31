'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  adminGetGallery,
  adminPublishGalleryItem,
  adminUnpublishGalleryItem,
  adminArchiveGalleryItem,
  adminDeleteGalleryItem,
} from '@/lib/api';

const STATUS_LABELS: Record<string, string> = { DRAFT: 'Draft', PUBLISHED: 'Published', ARCHIVED: 'Archived' };

export default function AdminGalleryPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await adminGetGallery(token, { status: status || undefined, type: type || undefined });
      setItems(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  }, [token, status, type]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePublish(id: string) {
    if (!token) return;
    try {
      await adminPublishGalleryItem(id, token);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to publish');
    }
  }

  async function handleUnpublish(id: string) {
    if (!token) return;
    await adminUnpublishGalleryItem(id, token);
    load();
  }

  async function handleArchive(id: string) {
    if (!token) return;
    await adminArchiveGalleryItem(id, token);
    load();
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm('Delete this gallery item permanently? This cannot be undone.')) return;
    await adminDeleteGalleryItem(id, token);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-bb-text">Gallery</h1>
        <Link
          href="/admin/gallery/new"
          className="bg-bb-orange hover:bg-bb-orange-dark text-white font-semibold px-5 py-2.5 rounded-full text-sm transition-colors"
        >
          Add media
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-bb-border px-4 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-bb-border px-4 py-2 text-sm">
          <option value="">All types</option>
          <option value="IMAGE">Photos</option>
          <option value="YOUTUBE_VIDEO">Videos</option>
        </select>
      </div>

      {error && <p className="text-sm text-bb-red mb-4">{error}</p>}

      {loading ? (
        <p className="text-bb-text-secondary">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-bb-surface border border-bb-border rounded-2xl overflow-hidden">
              <Link href={`/admin/gallery/${item.id}`} className="block aspect-[4/3] bg-bb-neutral relative">
                {item.type === 'IMAGE' && item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.altText || item.title} className="w-full h-full object-cover" />
                ) : item.type === 'YOUTUBE_VIDEO' && item.youtubeVideoId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`https://img.youtube.com/vi/${item.youtubeVideoId}/hqdefault.jpg`}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-bb-text-muted text-sm">No preview</div>
                )}
              </Link>
              <div className="p-3">
                <p className="text-sm font-semibold text-bb-text line-clamp-1">{item.title}</p>
                <p className="text-xs text-bb-text-secondary mb-2">{STATUS_LABELS[item.status]}</p>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {item.status !== 'PUBLISHED' && item.status !== 'ARCHIVED' && (
                    <button onClick={() => handlePublish(item.id)} className="text-bb-green hover:underline">Publish</button>
                  )}
                  {item.status === 'PUBLISHED' && (
                    <button onClick={() => handleUnpublish(item.id)} className="text-bb-text-secondary hover:underline">Unpublish</button>
                  )}
                  {item.status !== 'ARCHIVED' && (
                    <button onClick={() => handleArchive(item.id)} className="text-bb-text-secondary hover:underline">Archive</button>
                  )}
                  <button onClick={() => handleDelete(item.id)} className="text-bb-red hover:underline">Delete</button>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="col-span-full text-center text-bb-text-secondary py-10">No gallery items found.</p>
          )}
        </div>
      )}
    </div>
  );
}
