import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getHeroImages, validateHeroImages } from '../services/hero-images';

const image = { url: 'https://images.example.com/banner.jpg', position: '25% 75%', zoom: 1.5, alt: 'Live music' };

test('accepts one through six slides and an empty list to hide the banner', () => {
  for (let count = 0; count <= 6; count++) {
    assert.equal(validateHeroImages(Array.from({ length: count }, () => ({ ...image }))), null);
  }
  assert.ok(validateHeroImages(Array.from({ length: 7 }, () => ({ ...image }))));
});

test('rejects malformed lists and image URLs', () => {
  for (const value of [null, {}, 'banner.jpg', [null], [{}], [{ url: 'javascript:alert(1)' }], [{ url: '/relative.jpg' }]]) {
    assert.ok(validateHeroImages(value));
  }
});

test('validates each slide crop, zoom, and description', () => {
  for (const changes of [
    { position: '101% 50%' }, { position: '-1% 0%' }, { position: 'center' },
    { zoom: 0.9 }, { zoom: 3.1 }, { zoom: '2' }, { zoom: NaN },
    { alt: 123 }, { alt: 'x'.repeat(301) },
  ]) {
    assert.ok(validateHeroImages([{ ...image, ...changes }]));
  }
  assert.equal(validateHeroImages([{ url: image.url }]), null);
  assert.equal(validateHeroImages([{ ...image, position: '0% 100%', zoom: 3 }]), null);
});

test('preserves the existing single banner and crop without migration', () => {
  assert.deepEqual(getHeroImages({ heroImageUrl: image.url, heroImagePosition: image.position, heroImageZoom: image.zoom }), [
    { url: image.url, position: image.position, zoom: image.zoom },
  ]);
  assert.deepEqual(getHeroImages(null), []);
});

test('uses ordered carousel images in preference to legacy fields, including explicit removal', () => {
  const second = { url: 'https://images.example.com/second.jpg' };
  assert.deepEqual(getHeroImages({ heroImages: [second, image], heroImageUrl: image.url }), [second, image]);
  assert.deepEqual(getHeroImages({ heroImages: [], heroImageUrl: image.url }), []);
});
