import test from 'node:test';
import assert from 'node:assert/strict';
import { getHeroImages } from './hero-images.ts';

test('the homepage retains the original banner and all six added carousel images', () => {
  const original = { url: 'https://images.example.com/banner.jpg', position: '25% 75%', zoom: 1.5 };
  const additions = Array.from({ length: 6 }, (_, index) => ({ url: `https://images.example.com/generated-${index + 1}.png` }));
  const carousel = [original, ...additions];
  assert.deepEqual(getHeroImages({ heroImages: carousel, heroImageUrl: original.url }), carousel);
});

test('the legacy banner keeps its crop before adding more carousel images', () => {
  assert.deepEqual(getHeroImages({ heroImageUrl: 'https://images.example.com/banner.jpg', heroImagePosition: '25% 75%', heroImageZoom: 1.5 }), [
    { url: 'https://images.example.com/banner.jpg', position: '25% 75%', zoom: 1.5 },
  ]);
});
