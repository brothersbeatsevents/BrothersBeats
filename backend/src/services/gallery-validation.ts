// ──────────────────────────────────────────
// Gallery media validation rules — shared between the admin publish route
// and the automated test suite so the two never drift apart.
// ──────────────────────────────────────────

import { GalleryMediaEntity } from '../types';

/**
 * Returns a list of human-readable validation errors that must be resolved
 * before a gallery media item may transition to PUBLISHED. An empty array
 * means the item is ready to publish.
 */
export function validateGalleryMediaForPublish(item: GalleryMediaEntity): string[] {
  const errors: string[] = [];

  if (!item.title || !item.title.trim()) errors.push('Title is required');

  if (item.type === 'IMAGE') {
    if (!item.imageS3Key || !item.imageUrl) errors.push('Image file is missing');
    if (!item.altText || !item.altText.trim()) {
      errors.push('Alt text is required before publishing (unless explicitly decorative)');
    }
  } else if (item.type === 'YOUTUBE_VIDEO') {
    if (!item.youtubeVideoId || !item.youtubeUrl) {
      errors.push('A validated YouTube video is required');
    }
  } else {
    errors.push('Unknown media type');
  }

  return errors;
}
