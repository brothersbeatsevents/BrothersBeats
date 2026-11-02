/**
 * Verifies both public enquiry forms notify the support inbox (brothersbeatsevents@gmail.com)
 * with the enquirer set as Reply-To. Kept in its own file because the FROM_EMAIL
 * env var must be in the process environment before the email module is
 * evaluated — see the npm test script.
 */
import { after, before, beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import { SESv2Client } from '@aws-sdk/client-sesv2';
import { store } from '../store/memory';
import contact from '../routes/contact';
import serviceEnquiries from '../routes/service-enquiries';

type SesMail = {
  Destination: { ToAddresses: string[] };
  ReplyToAddresses?: string[];
  Subject: { Data: string };
};

let server: Server;
let baseUrl: string;
let sesSend: ReturnType<typeof mock.method>;

const getSentMail = () =>
  (sesSend as unknown as { mock: { calls: { arguments: unknown[] }[] } }).mock.calls
    .map((call) => (call.arguments[0] as { input: SesMail }).input)
    .filter((input): input is SesMail => Boolean(input?.Destination));

before(async () => {
  mock.method(console, 'log', () => {});
  mock.method(console, 'warn', () => {});
  mock.method(console, 'error', () => {});
  mock.method(console, 'info', () => {});
  sesSend = mock.method(SESv2Client.prototype, 'send', async () => ({}));
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
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  mock.restoreAll();
});

test('both enquiry forms email the support inbox with the enquirer as Reply-To', async () => {
  const sentBefore = getSentMail().length;

  const contactRes = await fetch(`${baseUrl}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      phone: '0851234567',
      message: 'Please help organise an event.',
      contactReason: 'GENERAL_ENQUIRY',
    }),
  });
  assert.equal(contactRes.status, 200);

  const serviceRes = await fetch(`${baseUrl}/service-enquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Test User',
      email: 'test@example.com',
      message: 'Please help organise an event.',
      consentToContact: true,
    }),
  });
  assert.equal(serviceRes.status, 200);

  const sent = getSentMail().slice(sentBefore);
  assert.equal(sent.length, 2, 'each submission should trigger exactly one admin alert email');
  for (const mail of sent) {
    assert.deepEqual(mail.Destination.ToAddresses, ['brothersbeatsevents@gmail.com']);
    assert.deepEqual(mail.ReplyToAddresses, ['test@example.com']);
  }
});
