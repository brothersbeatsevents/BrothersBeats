'use client';

import { useEffect, useState } from 'react';
import { getGallery } from '@/lib/api';
import GalleryGrid from '@/components/ui/GalleryGrid';
import GalleryLightbox from '@/components/ui/GalleryLightbox';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import ErrorState from '@/components/ui/ErrorState';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'IMAGE', label: 'Photos' },
  { value: 'YOUTUBE_VIDEO', label: 'Videos' },
];

export default function GalleryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(false);
    getGallery({ type: type || undefined })
      .then((res) => setItems(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [type]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-display font-bold text-4xl text-bb-text mb-2">Event memories</h1>
      <p className="text-bb-text-secondary mb-8">
        Photos and highlights from Brothers Beats events — the moments we&apos;ve created together.
      </p>

      <div className="flex gap-2 mb-8">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setType(f.value)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              type === f.value
                ? 'bg-bb-green text-white'
                : 'bg-bb-surface border border-bb-border text-bb-text-secondary hover:border-bb-green'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSkeleton count={8} />
      ) : error ? (
        <ErrorState message="Couldn't load the gallery. Please try again later." />
      ) : (
        <GalleryGrid items={items} onSelect={setLightboxIndex} />
      )}

      {lightboxIndex !== null && (
        <GalleryLightbox
          items={items}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
