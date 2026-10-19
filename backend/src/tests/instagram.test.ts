import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInstagramReelUrl } from '../services/instagram';

test('normalizes Instagram Reel links, mobile links, and sharing parameters', () => {
  for (const host of ['instagram.com', 'www.instagram.com', 'm.instagram.com']) {
    for (const path of ['reel', 'reels']) {
      assert.deepEqual(normalizeInstagramReelUrl(` https://${host}/${path}/DA_12-abC3/?igsh=sharing&utm_source=ig_web_copy_link `), {
        shortcode: 'DA_12-abC3',
        canonicalUrl: 'https://www.instagram.com/reel/DA_12-abC3/',
      });
    }
  }
});

test('rejects unsupported Instagram pages, malformed URLs, and unsafe sources', () => {
  for (const url of [
    '', 'not-a-url', 'javascript:alert(1)',
    'https://www.instagram.com/',
    'https://www.instagram.com/brothersbeatsevents/',
    'https://www.instagram.com/p/DA_12-abC3/',
    'https://www.instagram.com/stories/user/123/',
    'https://www.instagram.com/reel/',
    'https://www.instagram.com/reel/DA_12-abC3/extra/',
    'https://www.instagram.com/reel/%3Cscript%3E/',
    `https://www.instagram.com/reel/${'a'.repeat(65)}/`,
    'https://instagram.com.evil.example/reel/DA_12-abC3/',
    'https://instagram.com@evil.example/reel/DA_12-abC3/',
    'https://user:password@www.instagram.com/reel/DA_12-abC3/',
    'https://www.instagram.com:8443/reel/DA_12-abC3/',
    '<iframe src="https://www.instagram.com/reel/DA_12-abC3/embed/"></iframe>',
  ]) assert.equal(normalizeInstagramReelUrl(url), null, url);
  assert.equal(normalizeInstagramReelUrl(undefined as any), null);
});
