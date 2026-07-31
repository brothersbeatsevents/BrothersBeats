import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeYouTubeUrl } from '../services/youtube';

test('accepts a standard youtube.com/watch URL', () => {
  const result = normalizeYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.ok(result);
  assert.equal(result?.videoId, 'dQw4w9WgXcQ');
  assert.equal(result?.canonicalUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
});

test('accepts a bare youtube.com (no www) watch URL', () => {
  const result = normalizeYouTubeUrl('https://youtube.com/watch?v=dQw4w9WgXcQ');
  assert.ok(result);
  assert.equal(result?.videoId, 'dQw4w9WgXcQ');
});

test('accepts m.youtube.com watch URLs', () => {
  const result = normalizeYouTubeUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.ok(result);
  assert.equal(result?.videoId, 'dQw4w9WgXcQ');
});

test('accepts a youtu.be short link', () => {
  const result = normalizeYouTubeUrl('https://youtu.be/dQw4w9WgXcQ');
  assert.ok(result);
  assert.equal(result?.videoId, 'dQw4w9WgXcQ');
});

test('accepts a youtube.com/embed/ URL', () => {
  const result = normalizeYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
  assert.ok(result);
  assert.equal(result?.videoId, 'dQw4w9WgXcQ');
});

test('ignores extra query params but keeps the canonical form', () => {
  const result = normalizeYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PLxyz');
  assert.ok(result);
  assert.equal(result?.videoId, 'dQw4w9WgXcQ');
  assert.equal(result?.canonicalUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
});

test('rejects a playlist URL', () => {
  assert.equal(normalizeYouTubeUrl('https://www.youtube.com/playlist?list=PLxyz'), null);
});

test('rejects a channel URL', () => {
  assert.equal(normalizeYouTubeUrl('https://www.youtube.com/channel/UC1234567890'), null);
});

test('rejects a shorts URL', () => {
  assert.equal(normalizeYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ'), null);
});

test('rejects a live URL', () => {
  assert.equal(normalizeYouTubeUrl('https://www.youtube.com/live/dQw4w9WgXcQ'), null);
});

test('rejects a non-YouTube hostname', () => {
  assert.equal(normalizeYouTubeUrl('https://vimeo.com/12345678'), null);
});

test('rejects an unrelated youtube-lookalike hostname', () => {
  assert.equal(normalizeYouTubeUrl('https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ'), null);
});

test('rejects malformed URLs', () => {
  assert.equal(normalizeYouTubeUrl('not-a-url'), null);
  assert.equal(normalizeYouTubeUrl(''), null);
});

test('rejects a video ID of the wrong length', () => {
  assert.equal(normalizeYouTubeUrl('https://www.youtube.com/watch?v=short'), null);
});

test('rejects arbitrary embed/script HTML instead of a URL', () => {
  assert.equal(normalizeYouTubeUrl('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>'), null);
});
