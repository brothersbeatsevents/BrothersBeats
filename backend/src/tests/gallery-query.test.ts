import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterPublishedGallery, toPublicGalleryMedia } from '../services/gallery-query';
import { GalleryMediaEntity } from '../types';

const now = new Date().toISOString();

function makeItem(overrides: Partial<GalleryMediaEntity>): GalleryMediaEntity {
  return {
    id: `media-${Math.random()}`,
    type: 'IMAGE',
    status: 'PUBLISHED',
    title: 'Photo',
    imageS3Key: 'gallery/x.jpg',
    imageUrl: 'https://images.example.com/gallery/x.jpg',
    featured: false,
    sortOrder: 0,
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

test('draft and archived items are never returned to the public', () => {
  const items = [
    makeItem({ id: 'a', status: 'DRAFT' }),
    makeItem({ id: 'b', status: 'ARCHIVED' }),
    makeItem({ id: 'c', status: 'PUBLISHED' }),
  ];
  const result = filterPublishedGallery(items, {});
  assert.deepEqual(result.map((i) => i.id), ['c']);
});

test('filters by eventId', () => {
  const items = [
    makeItem({ id: 'a', eventId: 'event-1' }),
    makeItem({ id: 'b', eventId: 'event-2' }),
  ];
  const result = filterPublishedGallery(items, { eventId: 'event-1' });
  assert.deepEqual(result.map((i) => i.id), ['a']);
});

test('filters by media type', () => {
  const items = [
    makeItem({ id: 'a', type: 'IMAGE' }),
    makeItem({ id: 'b', type: 'YOUTUBE_VIDEO', youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', youtubeVideoId: 'dQw4w9WgXcQ' }),
  ];
  const result = filterPublishedGallery(items, { type: 'YOUTUBE_VIDEO' });
  assert.deepEqual(result.map((i) => i.id), ['b']);
});

test('the Videos filter includes YouTube videos, Shorts, and Instagram Reels only when published', () => {
  const items = [
    makeItem({ id: 'photo' }),
    makeItem({ id: 'youtube', type: 'YOUTUBE_VIDEO' }),
    makeItem({ id: 'short', type: 'YOUTUBE_VIDEO', youtubeUrl: 'https://www.youtube.com/shorts/dQw4w9WgXcQ' }),
    makeItem({ id: 'reel', type: 'INSTAGRAM_REEL', instagramUrl: 'https://www.instagram.com/reel/DA_12-abC3/', instagramShortcode: 'DA_12-abC3' }),
    makeItem({ id: 'draft-reel', type: 'INSTAGRAM_REEL', status: 'DRAFT' }),
    makeItem({ id: 'archived-reel', type: 'INSTAGRAM_REEL', status: 'ARCHIVED' }),
  ];
  assert.deepEqual(filterPublishedGallery(items, { type: 'VIDEO' }).map((item) => item.id), ['youtube', 'short', 'reel']);
  assert.deepEqual(filterPublishedGallery(items, { type: 'INSTAGRAM_REEL' }).map((item) => item.id), ['reel']);
  const reel = toPublicGalleryMedia(items[3]);
  assert.equal(reel.instagramShortcode, 'DA_12-abC3');
  assert.equal(reel.instagramUrl, 'https://www.instagram.com/reel/DA_12-abC3/');
  assert.equal((reel as any).createdBy, undefined);
});

test('featured items always sort first regardless of sortOrder', () => {
  const items = [
    makeItem({ id: 'a', featured: false, sortOrder: 0 }),
    makeItem({ id: 'b', featured: true, sortOrder: 5 }),
  ];
  const result = filterPublishedGallery(items, {});
  assert.deepEqual(result.map((i) => i.id), ['b', 'a']);
});

test('within the same featured tier, lower sortOrder comes first', () => {
  const items = [
    makeItem({ id: 'a', sortOrder: 2 }),
    makeItem({ id: 'b', sortOrder: 1 }),
  ];
  const result = filterPublishedGallery(items, {});
  assert.deepEqual(result.map((i) => i.id), ['b', 'a']);
});

test('public projection never exposes createdBy/updatedBy', () => {
  const item = makeItem({ id: 'a' });
  const publicItem = toPublicGalleryMedia(item);
  assert.equal((publicItem as any).createdBy, undefined);
  assert.equal((publicItem as any).updatedBy, undefined);
});
