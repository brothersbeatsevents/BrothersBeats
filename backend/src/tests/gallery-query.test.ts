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
