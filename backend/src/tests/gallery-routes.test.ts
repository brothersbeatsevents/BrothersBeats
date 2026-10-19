import { after, before, beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import express from 'express';
import { store } from '../store/memory';
import { seedStore } from '../seed/data';
import { generateToken } from '../middleware/auth';
import { sanitizeInput, blockSuspiciousPayloads } from '../middleware/validate';
import adminGalleryRoutes from '../routes/admin/gallery';
import galleryRoutes from '../routes/gallery';

let server: Server;
let baseUrl: string;
let adminToken: string;
let customerToken: string;

before(async () => {
  mock.method(console, 'log', () => {});
  const app = express();
  app.use(express.json(), sanitizeInput, blockSuspiciousPayloads);
  app.use('/admin/gallery', adminGalleryRoutes);
  app.use('/gallery', galleryRoutes);
  server = await new Promise<Server>((resolve, reject) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    listener.on('error', reject);
  });
  const address = server.address();
  assert(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  mock.restoreAll();
});

beforeEach(() => {
  store.reset();
  seedStore();
  adminToken = generateToken([...store.users.values()].find((user) => user.role === 'ADMIN')!);
  customerToken = generateToken([...store.users.values()].find((user) => user.role === 'CUSTOMER')!);
});

async function request(path: string, body?: unknown, token?: string) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  return { status: res.status, body: await res.json() as any };
}

test('admins create and publish Shorts and Reels, which appear in both video galleries', async () => {
  for (const source of [
    { type: 'YOUTUBE_VIDEO', youtubeUrl: 'https://www.youtube.com/shorts/dQw4w9WgXcQ?si=share' },
    { type: 'INSTAGRAM_REEL', instagramUrl: 'https://www.instagram.com/reels/DA_12-abC3/?igsh=share' },
  ]) {
    const created = await request('/admin/gallery', { ...source, title: source.type }, adminToken);
    assert.equal(created.status, 201);
    const item = created.body.data;
    assert.equal(item.status, 'DRAFT');
    if (source.type === 'YOUTUBE_VIDEO') {
      assert.equal(item.youtubeUrl, 'https://www.youtube.com/shorts/dQw4w9WgXcQ');
      assert.equal(item.youtubeVideoId, 'dQw4w9WgXcQ');
    } else {
      assert.equal(item.instagramUrl, 'https://www.instagram.com/reel/DA_12-abC3/');
      assert.equal(item.instagramShortcode, 'DA_12-abC3');
    }
    assert.equal((await request(`/gallery/${item.id}`)).status, 404);
    assert.equal((await request(`/admin/gallery/${item.id}/publish`, {}, adminToken)).status, 200);
    const publicItem = await request(`/gallery/${item.id}`);
    assert.equal(publicItem.status, 200);
    assert.equal(publicItem.body.data.createdBy, undefined);
    assert.equal(publicItem.body.data.updatedBy, undefined);
    for (const path of ['/gallery?type=VIDEO', '/admin/gallery?type=VIDEO', `/gallery?type=${source.type}`]) {
      const list = await request(path, undefined, path.startsWith('/admin') ? adminToken : undefined);
      assert.equal(list.status, 200);
      assert.ok(list.body.data.some((entry: any) => entry.id === item.id));
      assert.ok(list.body.data.every((entry: any) => entry.type !== 'IMAGE'));
    }
  }
});

test('invalid Reel sources are rejected without creating records', async () => {
  const count = store.galleryMedia.size;
  for (const instagramUrl of [
    'https://www.instagram.com/account/',
    'https://instagram.com.evil.example/reel/DA_12-abC3/',
    '<iframe src="https://www.instagram.com/reel/DA_12-abC3/embed/"></iframe>',
  ]) {
    const result = await request('/admin/gallery', { type: 'INSTAGRAM_REEL', title: 'Invalid', instagramUrl }, adminToken);
    assert.equal(result.status, 400);
  }
  assert.equal(store.galleryMedia.size, count);
});

test('adding Reels still requires an administrator', async () => {
  const body = { type: 'INSTAGRAM_REEL', title: 'Test', instagramUrl: 'https://www.instagram.com/reel/DA_12-abC3/' };
  assert.equal((await request('/admin/gallery', body)).status, 401);
  assert.equal((await request('/admin/gallery', body, customerToken)).status, 403);
});
