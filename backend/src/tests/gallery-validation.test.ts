import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateGalleryMediaForPublish } from '../services/gallery-validation';
import { GalleryMediaEntity } from '../types';

const now = new Date().toISOString();

function makeImage(overrides: Partial<GalleryMediaEntity> = {}): GalleryMediaEntity {
  return {
    id: 'media-1',
    type: 'IMAGE',
    status: 'DRAFT',
    title: 'Test photo',
    altText: 'A descriptive alt text',
    imageS3Key: 'gallery/test.jpg',
    imageUrl: 'https://images.example.com/gallery/test.jpg',
    featured: false,
    sortOrder: 0,
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function makeVideo(overrides: Partial<GalleryMediaEntity> = {}): GalleryMediaEntity {
  return {
    id: 'media-2',
    type: 'YOUTUBE_VIDEO',
    status: 'DRAFT',
    title: 'Test video',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    youtubeVideoId: 'dQw4w9WgXcQ',
    featured: false,
    sortOrder: 0,
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

test('a fully-populated image is publishable', () => {
  assert.deepEqual(validateGalleryMediaForPublish(makeImage()), []);
});

test('a fully-populated YouTube video is publishable', () => {
  assert.deepEqual(validateGalleryMediaForPublish(makeVideo()), []);
});

test('an image without alt text cannot be published', () => {
  const errors = validateGalleryMediaForPublish(makeImage({ altText: undefined }));
  assert.ok(errors.some((e) => e.includes('Alt text')));
});

test('an image without an uploaded file cannot be published', () => {
  const errors = validateGalleryMediaForPublish(makeImage({ imageS3Key: undefined, imageUrl: undefined }));
  assert.ok(errors.some((e) => e.includes('Image file')));
});

test('a video without a validated YouTube ID cannot be published', () => {
  const errors = validateGalleryMediaForPublish(makeVideo({ youtubeVideoId: undefined, youtubeUrl: undefined }));
  assert.ok(errors.some((e) => e.includes('YouTube video')));
});

test('an item without a title cannot be published', () => {
  const errors = validateGalleryMediaForPublish(makeImage({ title: '  ' }));
  assert.ok(errors.some((e) => e.includes('Title')));
});
