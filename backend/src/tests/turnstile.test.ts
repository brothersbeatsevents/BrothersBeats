import { after, afterEach, before, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import contact from '../routes/contact';
import serviceEnquiries from '../routes/service-enquiries';
import http from 'node:http';
import { store } from '../store/memory';

let server: Server;
let baseUrl: string;
const originalSecret = process.env.TURNSTILE_SECRET_KEY;
const realFetch = globalThis.fetch;

before(async () => {
  mock.method(console, 'log', () => {});
  mock.method(console, 'warn', () => {});
  mock.method(console, 'error', () => {});
  const app = express();
  app.use(express.json());
  app.use('/contact', contact);
  app.use('/service-enquiries', serviceEnquiries);
  server = await new Promise<Server>((resolve, reject) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    listener.on('error', reject);
  });
  const address = server.address();
  assert(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(() => {
  store.reset();
  process.env.TURNSTILE_SECRET_KEY = originalSecret;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  mock.restoreAll();
});

// Uses node:http so the global fetch mock in these tests can't intercept
// requests to the app server itself.
function postContact(body: Record<string, unknown>): Promise<{ status: number }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `${baseUrl}/contact`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } },
      (res) => {
        res.resume();
        res.on('end', () => resolve({ status: res.statusCode || 0 }));
      },
    );
    req.on('error', reject);
    req.end(JSON.stringify(body));
  });
}

test('requests without a captcha token are rejected when a secret is configured', async () => {
  process.env.TURNSTILE_SECRET_KEY = 'test-secret';
  const res = await postContact({
    name: 'Test User',
    email: 'test@example.com',
    message: 'hello there friend',
    contactReason: 'GENERAL_ENQUIRY',
  });
  assert.equal(res.status, 403);
  assert.equal([...store.serviceEnquiries.values()].length, 0, 'rejected requests must not be stored');
});

test('requests with a valid captcha token are accepted when a secret is configured', async () => {
  process.env.TURNSTILE_SECRET_KEY = 'test-secret';
  const fetchMock = mock.method(globalThis, 'fetch', async (input: unknown) => {
    const url = String(input);
    if (url.includes('siteverify')) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    return realFetch(input as RequestInfo);
  });
  const res = await postContact({
    name: 'Test User',
    email: 'test@example.com',
    message: 'hello there friend',
    contactReason: 'GENERAL_ENQUIRY',
    turnstileToken: 'valid-token',
  });
  fetchMock.mock.restore();
  assert.equal(res.status, 200);
});

test('an invalid captcha token is rejected', async () => {
  process.env.TURNSTILE_SECRET_KEY = 'test-secret';
  const fetchMock = mock.method(globalThis, 'fetch', async (input: unknown) => {
    const url = String(input);
    if (url.includes('siteverify')) {
      return new Response(JSON.stringify({ success: false }), { status: 200 });
    }
    return realFetch(input as RequestInfo);
  });
  const res = await postContact({
    name: 'Test User',
    email: 'test@example.com',
    message: 'hello there friend',
    contactReason: 'GENERAL_ENQUIRY',
    turnstileToken: 'bad-token',
  });
  fetchMock.mock.restore();
  assert.equal(res.status, 403);
});

test('no secret configured means captcha is optional (dev)', async () => {
  delete process.env.TURNSTILE_SECRET_KEY;
  const res = await postContact({
    name: 'Test User',
    email: 'test@example.com',
    message: 'hello there friend',
    contactReason: 'GENERAL_ENQUIRY',
  });
  assert.equal(res.status, 200);
});
