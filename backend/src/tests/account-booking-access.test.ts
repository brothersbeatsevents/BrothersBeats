import { after, before, beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import express from 'express';
import type { Server } from 'node:http';
import { S3Client } from '@aws-sdk/client-s3';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { store } from '../store/memory';
import type { BookingEntity, TicketEntity, User } from '../types';

const poolId = 'eu-west-1_test_bookings';
const clientId = 'test-booking-client';
const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const emails: SendEmailCommand['input'][] = [];
let server: Server;
let baseUrl: string;
let seedStore: typeof import('../seed/data').seedStore;
let customer: User;
let other: User;
let booking: BookingEntity;
let ticket: TicketEntity;

before(async () => {
  process.env.COGNITO_USER_POOL_ID = poolId;
  process.env.COGNITO_CLIENT_ID = clientId;
  process.env.AWS_REGION = 'eu-west-1';
  process.env.AWS_ACCESS_KEY_ID = 'test-booking-access';
  process.env.AWS_SECRET_ACCESS_KEY = 'test-booking-access-secret';
  process.env.S3_MEDIA_BUCKET = 'test-ticket-bucket';
  process.env.SES_FROM_EMAIL = 'tickets@example.com';
  delete process.env.AWS_PROFILE;
  delete process.env.AWS_DEFAULT_PROFILE;
  mock.method(console, 'log', () => {});
  mock.method(console, 'info', () => {});
  mock.method(https, 'get', (_url: unknown, callback: (response: EventEmitter) => void) => {
    const request = new EventEmitter();
    queueMicrotask(() => {
      const response = new EventEmitter();
      callback(response);
      response.emit('data', JSON.stringify({ keys: [{ ...keys.publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' }] }));
      response.emit('end');
    });
    return request;
  });
  mock.method(S3Client.prototype, 'send', async () => ({ Body: { transformToByteArray: async () => Buffer.from('%PDF-test-ticket') } }));
  mock.method(SESv2Client.prototype, 'send', async (command: SendEmailCommand) => { emails.push(command.input); return {}; });
  ({ seedStore } = await import('../seed/data'));
  const app = express();
  app.use(express.json());
  app.use('/me', (await import('../routes/me')).default);
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
  emails.length = 0;
  [customer, other] = [...store.users.values()].filter((user) => user.role === 'CUSTOMER');
  customer.cognito_sub = 'customer-sub';
  other.cognito_sub = 'other-sub';
  const template = [...store.bookings.values()].find((item) => item.bookingStatus === 'CONFIRMED')!;
  booking = { ...template, id: 'booking-guest-recovery', bookingReference: 'BBE-GUEST123', quantity: 1,
    buyerEmail: customer.email.toUpperCase(), normalizedBuyerEmail: customer.email.trim().toLowerCase() };
  delete booking.customerUserId;
  store.bookings.set(booking.id, booking);
  ticket = { ...[...store.tickets.values()][0], id: 'ticket-guest-recovery', bookingId: booking.id,
    ticketNumber: 'BBE-TEST-GUEST', ticketPdfS3Key: 'tickets/pdf/guest.pdf' };
  store.tickets.set(ticket.id, ticket);
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  mock.restoreAll();
});

function token(user: User, verified?: boolean): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const payload = `${encode({ alg: 'RS256', kid: 'test-key' })}.${encode({
    sub: user.cognito_sub, email: user.email, ...(verified === undefined ? {} : { email_verified: verified }),
    'cognito:groups': ['CUSTOMER'], token_use: 'id', aud: clientId,
    iss: `https://cognito-idp.eu-west-1.amazonaws.com/${poolId}`, exp: Math.floor(Date.now() / 1000) + 600,
  })}`;
  return `${payload}.${crypto.sign('RSA-SHA256', Buffer.from(payload), keys.privateKey).toString('base64url')}`;
}

async function request(path: string, user: User, verified?: boolean, body?: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token(user, verified)}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000),
  });
  return { status: response.status, body: await response.json() as any };
}

test('a verified customer sees guest bookings for the same email without changing their ownership', async () => {
  const result = await request('/me/bookings', customer, true);
  assert.equal(result.status, 200);
  assert(result.body.data.some((item: any) => item.bookingReference === booking.bookingReference));
  assert.equal(booking.customerUserId, undefined);
  const detail = await request(`/me/bookings/${booking.bookingReference}`, customer, true);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.data.tickets[0].id, ticket.id);
  assert.match(detail.body.data.tickets[0].pdfDownloadUrl, /X-Amz-Signature=/);
  const download = await request(`/me/tickets/${ticket.id}/download`, customer, true);
  assert.equal(download.status, 200);
});

test('verified guest booking access also supports resend with a PDF attachment', async () => {
  const result = await request(`/me/bookings/${booking.bookingReference}/resend`, customer, true, {});
  assert.equal(result.status, 200);
  assert.equal(emails.length, 1);
  assert.deepEqual(emails[0].Destination?.ToAddresses, [booking.buyerEmail]);
  assert.equal(emails[0].Content?.Simple?.Attachments?.[0].FileName, `${ticket.ticketNumber}.pdf`);
});

test('another email cannot list, open, download, resend or claim the guest booking', async () => {
  const list = await request('/me/bookings', other, true);
  assert(!list.body.data.some((item: any) => item.bookingReference === booking.bookingReference));
  assert.equal((await request(`/me/bookings/${booking.bookingReference}`, other, true)).status, 404);
  assert.equal((await request(`/me/tickets/${ticket.id}/download`, other, true)).status, 404);
  assert.equal((await request(`/me/bookings/${booking.bookingReference}/resend`, other, true, {})).status, 404);
  assert.equal((await request('/me/bookings/claim', other, true, { bookingReference: booking.bookingReference })).status, 404);
  assert.equal(emails.length, 0);
});

test('an unverified or missing email-verification claim cannot grant guest ticket access', async () => {
  for (const verified of [false, undefined]) {
    const list = await request('/me/bookings', customer, verified);
    assert(!list.body.data.some((item: any) => item.bookingReference === booking.bookingReference));
    assert.equal((await request(`/me/bookings/${booking.bookingReference}`, customer, verified)).status, 404);
    assert.equal((await request(`/me/tickets/${ticket.id}/download`, customer, verified)).status, 404);
    assert.equal((await request(`/me/bookings/${booking.bookingReference}/resend`, customer, verified, {})).status, 404);
    assert.equal((await request('/me/bookings/claim', customer, verified, { bookingReference: booking.bookingReference })).status, 404);
  }
});

test('a booking already linked to another account cannot be exposed or reassigned by email match', async () => {
  booking.customerUserId = other.id;
  const list = await request('/me/bookings', customer, true);
  assert(!list.body.data.some((item: any) => item.bookingReference === booking.bookingReference));
  assert.equal((await request(`/me/bookings/${booking.bookingReference}`, customer, true)).status, 404);
  assert.equal((await request('/me/bookings/claim', customer, true, { bookingReference: booking.bookingReference })).status, 404);
  assert.equal(booking.customerUserId, other.id);
  assert.equal((await request(`/me/bookings/${booking.bookingReference}`, other, false)).status, 200);
});

test('owned bookings appear once and explicit guest claims preserve access', async () => {
  const result = await request('/me/bookings/claim', customer, true, { bookingReference: booking.bookingReference });
  assert.equal(result.status, 200);
  assert.equal(booking.customerUserId, customer.id);
  const list = await request('/me/bookings', customer, true);
  assert.equal(list.body.data.filter((item: any) => item.bookingReference === booking.bookingReference).length, 1);
});
