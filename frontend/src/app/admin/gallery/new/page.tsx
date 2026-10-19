'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { adminGetEvents, adminCreateGalleryItem, getPresignedUpload, uploadToPresignedUrl } from '@/lib/api';

export default function NewGalleryMediaPage() {
  const { token } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [events, setEvents] = useState<any[]>([]);
  const [mediaType, setMediaType] = useState<'IMAGE' | 'YOUTUBE_VIDEO' | 'INSTAGRAM_REEL'>('IMAGE');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [altText, setAltText] = useState('');
  const [eventId, setEventId] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [featured, setFeatured] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<{ imageUrl: string; imageS3Key: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    adminGetEvents(token).then((res) => setEvents(res.data));
  }, [token]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploading(true);
    setError('');
    try {
      const { data } = await getPresignedUpload(file.type, 'gallery', token);
      await uploadToPresignedUrl(data.uploadUrl, file);
      setUploadedImage({ imageUrl: data.publicUrl, imageS3Key: data.key });
    } catch (err: any) {
      setError(err.message || 'Failed to upload image.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, any> = {
        type: mediaType,
        title,
        caption: caption || undefined,
        eventId: eventId || undefined,
        featured,
      };
      if (mediaType === 'IMAGE') {
        if (!uploadedImage) {
          setError('Please upload an image first.');
          setSaving(false);
          return;
        }
        payload.altText = altText;
        payload.imageUrl = uploadedImage.imageUrl;
        payload.imageS3Key = uploadedImage.imageS3Key;
      } else if (mediaType === 'INSTAGRAM_REEL') {
        payload.instagramUrl = instagramUrl;
      } else {
        payload.youtubeUrl = youtubeUrl;
      }
      const res = await adminCreateGalleryItem(payload, token);
      router.push(`/admin/gallery/${res.data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create gallery item.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display font-bold text-2xl text-bb-text mb-6">Add gallery media</h1>

      <form onSubmit={handleSubmit} className="space-y-4 bg-bb-surface border border-bb-border rounded-2xl p-6">
        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Media type</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMediaType('IMAGE')}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${mediaType === 'IMAGE' ? 'bg-bb-gold text-bb-ink' : 'bg-bb-neutral text-bb-text-secondary'}`}
            >
              Photo
            </button>
            <button
              type="button"
              onClick={() => setMediaType('YOUTUBE_VIDEO')}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${mediaType === 'YOUTUBE_VIDEO' ? 'bg-bb-gold text-bb-ink' : 'bg-bb-neutral text-bb-text-secondary'}`}
            >
              YouTube video / Short
            </button>
            <button
              type="button"
              onClick={() => setMediaType('INSTAGRAM_REEL')}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${mediaType === 'INSTAGRAM_REEL' ? 'bg-bb-gold text-bb-ink' : 'bg-bb-neutral text-bb-text-secondary'}`}
            >
              Instagram Reel
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Title</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Caption (optional)</label>
          <input value={caption} onChange={(e) => setCaption(e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-bb-text mb-1">Related event (optional)</label>
          <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm">
            <option value="">No related event</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
        </div>

        {mediaType === 'IMAGE' ? (
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">Photo</label>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onChange={handleFileChange} className="text-sm" />
            {uploading && <p className="text-xs text-bb-text-secondary mt-1">Uploading…</p>}
            {uploadedImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={uploadedImage.imageUrl} alt="Preview" className="mt-3 w-full max-h-64 object-contain rounded-lg bg-bb-neutral" />
            )}
            <label className="block text-sm font-medium text-bb-text mt-3 mb-1">Alt text (required to publish)</label>
            <input value={altText} onChange={(e) => setAltText(e.target.value)} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm" placeholder="Describe the image for screen readers" />
          </div>
        ) : mediaType === 'INSTAGRAM_REEL' ? (
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">Instagram Reel URL</label>
            <input
              required
              type="url"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/…/"
              className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm"
            />
            <p className="text-xs text-bb-text-secondary mt-1">
              Paste a Reel link from a public Instagram account with embedding enabled.
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-bb-text mb-1">YouTube video or Shorts URL</label>
            <input
              required
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm"
            />
            <p className="text-xs text-bb-text-secondary mt-1">
              Supports youtube.com videos, YouTube Shorts, and youtu.be links. Playlists, channels, and live links are not supported.
            </p>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-bb-text">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
          Feature this item at the top of the gallery
        </label>

        {error && <p className="text-sm text-bb-red">{error}</p>}

        <button
          type="submit"
          disabled={saving || uploading}
          className="bg-bb-gold hover:bg-bb-gold-dark disabled:opacity-60 text-bb-ink font-semibold px-6 py-2.5 rounded-full transition-colors"
        >
          {saving ? 'Saving…' : 'Save as draft'}
        </button>
      </form>
    </div>
  );
}
