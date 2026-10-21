import { after, before, beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import { SESv2Client } from '@aws-sdk/client-sesv2';
import { store } from '../store/memory';
import { seedStore } from '../seed/data';
import { getTodayInDublin } from '../services/enquiry-date-validation';
import contact from '../routes/contact';
import serviceEnquiries from '../routes/service-enquiries';

let server: Server;
let baseUrl: string;
const baseInput = { name: 'Test User', email: 'test@example.com', phone: '0851234567', message: 'Please help organise an event.' };

before(async () => {
  mock.method(console, 'log', () => {});
  mock.method(console, 'warn', () => {});
  mock.method(SESv2Client.prototype, 'send', async () => ({}));
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

beforeEach(() => {
  store.reset();
  seedStore();
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  mock.restoreAll();
});

async function submit(body: unknown, path = '/contact') {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
}

test('contact requires a real, non-past date for performer, event, and party enquiries', async () => {
  const original = structuredClone([...store.serviceEnquiries.values()]);
  for (const contactReason of ['PERFORMER', 'ORGANISE_EVENT', 'PERSONAL_PARTY']) {
    for (const preferredDate of [undefined, '', null, 20261021, {}, [], 'tomorrow', '2000-01-01', '2030-02-30', '2030-13-01', '2030-1-2']) {
      const response = await submit({ ...baseInput, contactReason, preferredDate });
      assert.equal(response.status, 400, `${contactReason}: ${String(preferredDate)}`);
      assert.match((await response.json() as { error: string }).error, /date/i);
    }
  }
  assert.deepEqual([...store.serviceEnquiries.values()], original, 'invalid submissions must not be saved');
});

test('contact accepts today and future dates and saves the structured preferred date', async () => {
  const today = getTodayInDublin();
  const tomorrow = new Date(`${today}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  for (const contactReason of ['PERFORMER', 'ORGANISE_EVENT', 'PERSONAL_PARTY']) {
    for (const preferredDate of [today, tomorrow.toISOString().slice(0, 10)]) {
      const response = await submit({ ...baseInput, contactReason, preferredDate });
      assert.equal(response.status, 200);
      assert([...store.serviceEnquiries.values()].some((enquiry) => enquiry.email === baseInput.email &&
        enquiry.eventServiceType === contactReason && enquiry.preferredDate === preferredDate));
    }
  }
});

test('contact reasons without a date question still submit without a date', async () => {
  for (const contactReason of ['SPONSORSHIP', 'PARTNERSHIP', 'GENERAL_ENQUIRY']) {
    assert.equal((await submit({ ...baseInput, contactReason })).status, 200);
  }
});

test('private-event enquiry dates stay optional but reject invalid dates and reversed ranges', async () => {
  const input = { fullName: baseInput.name, email: baseInput.email, message: baseInput.message, consentToContact: true };
  const today = getTodayInDublin();
  const tomorrow = new Date(`${today}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const future = tomorrow.toISOString().slice(0, 10);
  const originalCount = store.serviceEnquiries.size;
  for (const dates of [
    { preferredDate: '2000-01-01' }, { preferredDate: '2030-02-30' }, { preferredDate: 'tomorrow' },
    { preferredDate: today, preferredDateEnd: '2000-01-01' },
    { preferredDate: future, preferredDateEnd: today }, { preferredDateEnd: future },
  ]) {
    assert.equal((await submit({ ...input, ...dates }, '/service-enquiries')).status, 400);
  }
  assert.equal(store.serviceEnquiries.size, originalCount);
  assert.equal((await submit(input, '/service-enquiries')).status, 200);
  assert.equal((await submit({ ...input, preferredDate: today, preferredDateEnd: future }, '/service-enquiries')).status, 200);
});
