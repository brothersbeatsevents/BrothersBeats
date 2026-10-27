import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import type { OrgSettings } from '../types';
import { store } from '../store/memory';
import { seedStore } from '../seed/data';
import { generateToken } from '../middleware/auth';
import adminSettings from '../routes/admin/settings';
import publicSettings from '../routes/settings';

let server: Server;
let baseUrl: string;
let token: string;
const slides = [
  { url: 'https://images.example.com/first.jpg', position: '20% 80%', zoom: 1.5, alt: 'Live performance' },
  { url: 'https://images.example.com/second.jpg', position: '75% 25%', zoom: 2, alt: 'Community event' },
];

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/admin/settings', adminSettings);
  app.use('/settings', publicSettings);
  server = await new Promise<Server>((resolve, reject) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    listener.on('error', reject);
  });
  const address = server.address();
  assert(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(() => {
  store.reset();
  seedStore();
  token = generateToken(Array.from(store.users.values()).find((user) => user.role === 'ADMIN')!);
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function save(body: unknown, authToken = token) {
  return fetch(`${baseUrl}/admin/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
    body: JSON.stringify(body),
  });
}

async function read(path = '/settings', authenticated = false) {
  const response = await fetch(`${baseUrl}${path}`, { headers: authenticated ? { Authorization: `Bearer ${token}` } : {} });
  assert.equal(response.status, 200);
  return (await response.json() as { data: Partial<OrgSettings> }).data;
}

test('carousel order, individual crops, and descriptions survive admin save and public reload', async () => {
  assert.equal((await save({ heroImages: slides })).status, 200);
  assert.deepEqual((await read()).heroImages, slides);
  assert.deepEqual((await read('/admin/settings', true)).heroImages, slides);
  const reversed = [...slides].reverse();
  assert.equal((await save({ heroImages: reversed })).status, 200);
  assert.deepEqual((await read()).heroImages, reversed);
});

test('an eighth image is rejected without changing the saved carousel or other settings', async () => {
  assert.equal((await save({ heroImages: slides, organizationName: 'Original name' })).status, 200);
  const response = await save({ heroImages: Array.from({ length: 8 }, () => slides[0]), organizationName: 'Rejected name' });
  assert.equal(response.status, 400);
  const settings = await read();
  assert.deepEqual(settings.heroImages, slides);
  assert.equal(settings.organizationName, 'Original name');
});

test('an existing banner and six additional images save and reload as a seven-image carousel', async () => {
  assert.equal((await save({ heroImageUrl: slides[0].url, heroImagePosition: slides[0].position, heroImageZoom: slides[0].zoom })).status, 200);
  const existing = (await read()).heroImages!;
  const additional = Array.from({ length: 6 }, (_, index) => ({
    url: `https://images.example.com/generated-${index + 1}.png`, position: '50% 50%', zoom: 1,
  }));
  const carousel = [...existing, ...additional];
  assert.equal(carousel.length, 7);
  assert.equal((await save({ heroImages: carousel })).status, 200);
  assert.deepEqual((await read()).heroImages, carousel);
  assert.deepEqual((await read('/admin/settings', true)).heroImages, carousel);
});

test('legacy banner retains its crop, and removing all slides hides the banner', async () => {
  assert.equal((await save({ heroImageUrl: slides[0].url, heroImagePosition: slides[0].position, heroImageZoom: slides[0].zoom })).status, 200);
  assert.deepEqual((await read()).heroImages, [{ url: slides[0].url, position: slides[0].position, zoom: slides[0].zoom }]);
  assert.equal((await save({ heroImages: [] })).status, 200);
  assert.deepEqual((await read()).heroImages, []);
});

test('unauthenticated visitors and customers cannot update the carousel', async () => {
  assert.equal((await save({ heroImages: slides }, '')).status, 401);
  const customer = Array.from(store.users.values()).find((user) => user.role === 'CUSTOMER')!;
  assert.equal((await save({ heroImages: slides }, generateToken(customer))).status, 403);
  assert.deepEqual((await read()).heroImages, []);
});
