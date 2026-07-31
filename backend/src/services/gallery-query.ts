// ──────────────────────────────────────────
// Public gallery query logic — shared between the public route and the
// automated test suite so filtering/sorting/redaction rules stay in sync.
// ──────────────────────────────────────────

import { GalleryMediaEntity } from '../types';

export interface GalleryQueryFilters {
  eventId?: string;
  type?: string;
  year?: string;
  featured?: string;
}

/** A gallery media item with admin-only fields stripped for public consumption. */
export type PublicGalleryMedia = Omit<GalleryMediaEntity, 'createdBy' | 'updatedBy'>;

export function toPublicGalleryMedia(item: GalleryMediaEntity): PublicGalleryMedia {
  const { createdBy, updatedBy, ...publicFields } = item;
  return publicFields;
}

/**
 * Filters a full gallery collection down to published items matching the
 * given query filters, sorted featured-first, then by sortOrder, then by
 * most-recently-published. Never returns DRAFT or ARCHIVED items.
 */
export function filterPublishedGallery(
  items: GalleryMediaEntity[],
  filters: GalleryQueryFilters,
): GalleryMediaEntity[] {
  let result = items.filter((m) => m.status === 'PUBLISHED');

  if (filters.eventId) result = result.filter((m) => m.eventId === filters.eventId);
  if (filters.type === 'IMAGE' || filters.type === 'YOUTUBE_VIDEO') {
    result = result.filter((m) => m.type === filters.type);
  }
  if (filters.year) {
    result = result.filter((m) => (m.publishedAt || m.created_at).slice(0, 4) === filters.year);
  }
  if (filters.featured === 'true') result = result.filter((m) => m.featured);

  return [...result].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return (
      new Date(b.publishedAt || b.created_at).getTime() - new Date(a.publishedAt || a.created_at).getTime()
    );
  });
}
