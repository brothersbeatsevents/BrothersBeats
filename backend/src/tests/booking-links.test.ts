import { afterEach, beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createBookingTicketUrl, createBookingToken, verifyBookingToken } from '../services/booking-links';
import { store } from '../store/memory';

beforeEach(() => store.bookingAccessTokens.clear());
afterEach(() => mock.restoreAll());

test('guest links are random, reusable and store only a token hash', async () => {
  const token = await createBookingToken('booking-one');
  const other = await createBookingToken('booking-one');
  assert.notEqual(token, other);
  assert.match(token, /^[a-f0-9]{64}$/);
  assert(!token.includes('booking-one'));
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  assert(store.bookingAccessTokens.has(hash));
  assert(!JSON.stringify([...store.bookingAccessTokens.values()]).includes(token));
  assert.deepEqual(await verifyBookingToken(token), { bookingId: 'booking-one' });
  assert.deepEqual(await verifyBookingToken(token), { bookingId: 'booking-one' });
});

test('altered, unknown and expired links cannot retrieve a booking', async () => {
  const now = Date.now();
  mock.method(Date, 'now', () => now);
  const token = await createBookingToken('booking-one', 1000);
  const altered = (token[0] === 'a' ? 'b' : 'a') + token.slice(1);
  assert.equal(await verifyBookingToken(altered), null);
  assert.equal(await verifyBookingToken('0'.repeat(64)), null);
  mock.method(Date, 'now', () => now + 1000);
  assert.equal(await verifyBookingToken(token), null);
});

test('the old public development signing key cannot forge guest access', async () => {
  const payload = `booking-one.${Date.now() + 60000}`;
  const signature = crypto.createHmac('sha256', 'local-dev-signing-secret-change-me').update(payload).digest('hex');
  const token = Buffer.from(`${payload}.${signature}`).toString('base64url');
  assert.equal(await verifyBookingToken(token), null);
});

test('ticket email links remain valid through the event and expire a week afterward', async () => {
  const now = Date.now();
  const day = 86400000;
  mock.method(Date, 'now', () => now);
  const eventStart = now + 60 * day;
  const url = new URL(await createBookingTicketUrl('booking-future', new Date(eventStart).toISOString()));
  const token = url.searchParams.get('token')!;
  mock.method(Date, 'now', () => eventStart);
  assert.deepEqual(await verifyBookingToken(token), { bookingId: 'booking-future' });
  mock.method(Date, 'now', () => eventStart + 7 * day);
  assert.equal(await verifyBookingToken(token), null);
});

test('invalid token lifetimes do not create access records', async () => {
  for (const ttl of [NaN, Infinity, 0, -1]) await assert.rejects(createBookingToken('booking-one', ttl));
  assert.equal(store.bookingAccessTokens.size, 0);
});
