'use client';

import { useEffect, useCallback } from 'react';
import GalleryVideoEmbed from './GalleryVideoEmbed';
import { GalleryMediaCardData } from './GalleryMediaCard';

export default function GalleryLightbox({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: GalleryMediaCardData[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const item = items[index];

  const goNext = useCallback(() => {
    onNavigate((index + 1) % items.length);
  }, [index, items.length, onNavigate]);

  const goPrev = useCallback(() => {
    onNavigate((index - 1 + items.length) % items.length);
  }, [index, items.length, onNavigate]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goNext, goPrev]);

  if (!item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute z-10 top-2 right-2 flex h-11 w-11 items-center justify-center text-white/80 hover:text-white text-3xl leading-none"
      >
        &times;
      </button>

      {items.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          aria-label="Previous"
          className="absolute left-2 md:left-6 text-white/70 hover:text-white text-4xl leading-none px-2"
        >
          &#8249;
        </button>
      )}

      <div className="max-w-4xl w-full max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain" onClick={(e) => e.stopPropagation()}>
        {item.type === 'IMAGE' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.altText || item.title}
            className="w-full max-h-[75vh] object-contain rounded-xl bg-black"
          />
        ) : (
          <GalleryVideoEmbed item={item} />
        )}
        <div className="mt-3 text-center">
          <p className="text-white font-semibold">{item.title}</p>
          {item.caption && <p className="text-white/70 text-sm mt-1">{item.caption}</p>}
        </div>
      </div>

      {items.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          aria-label="Next"
          className="absolute right-2 md:right-6 text-white/70 hover:text-white text-4xl leading-none px-2"
        >
          &#8250;
        </button>
      )}
    </div>
  );
}
