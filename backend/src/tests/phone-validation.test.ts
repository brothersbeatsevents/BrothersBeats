import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import { isValidOptionalPhone, PHONE_ERROR } from '../services/phone-validation';
import { store } from '../store/memory';
import { seedStore } from '../seed/data';
import { generateToken } from '../middleware/auth';
import contact from '../routes/contact';
import serviceEnquiries from '../routes/service-enquiries';
import me from '../routes/me';
import checkout from '../routes/checkout';
import adminBookings from '../routes/admin/bookings';

test('phone validation supports local/international formatting and optional empty fields', () => {
  for (const value of [undefined, '', '   ', '0851234567', '+353 85 123 4567', '(085) 123-4567', '1234567', '+123456789012345']) {
    assert.equal(isValidOptionalPhone(value), true, String(value));
  }
});

const invalidPhones = ['abcdefgh', '085abc4567', '1-800-FLOWERS', '123456', '+1234567890123456', '--------', '085+1234567', '++353851234567', '085/1234567', '１２３４５６７８９', 851234567, null, {}, []];

test('phone validation rejects letters, invalid lengths, misplaced plus signs, and non-string values', () => {
  for (const value of invalidPhones) assert.equal(isValidOptionalPhone(value), false, String(value));
});

let server: Server;
let baseUrl: string;
let customerToken: string;
let adminToken: string;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/contact', contact);
  app.use('/service-enquiries', serviceEnquiries);
  app.use('/me', me);
  app.use('/checkout', checkout);
  app.use('/admin/bookings', adminBookings);
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
  customerToken = generateToken([...store.users.values()].find((user) => user.role === 'CUSTOMER')!);
  adminToken = generateToken([...store.users.values()].find((user) => user.role === 'ADMIN')!);
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function submit(path: string, body: unknown, token?: string, method = 'POST') {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
}

test('all phone-writing APIs reject invalid phones before changing enquiries, users, bookings, or inventory', async () => {
  const snapshots = structuredClone({
    enquiries: [...store.serviceEnquiries.values()], users: [...store.users.values()],
    bookings: [...store.bookings.values()], events: [...store.events.values()], tiers: [...store.ticketTiers.values()],
  });
  for (const phone of invalidPhones) {
    const responses = [
      await submit('/contact', { name: 'Test User', email: 'test@example.com', message: 'An event enquiry', contactReason: 'GENERAL_ENQUIRY', phone }),
      await submit('/service-enquiries', { fullName: 'Test User', email: 'test@example.com', message: 'An event enquiry', consentToContact: true, phone }),
      await submit('/me', { display_name: 'Must not change', phone }, customerToken, 'PATCH'),
      await submit('/checkout/session', { eventId: 'missing-event', buyerName: 'Test User', buyerEmail: 'test@example.com', buyerPhone: phone }),
      await submit('/admin/bookings', { eventId: 'missing-event', buyerName: 'Test User', buyerEmail: 'test@example.com', paymentMethod: 'CASH', buyerPhone: phone }, adminToken),
    ];
    for (const response of responses) {
      assert.equal(response.status, 400);
      assert.equal((await response.json() as { error: string }).error, PHONE_ERROR);
    }
  }
  assert.deepEqual({
    enquiries: [...store.serviceEnquiries.values()], users: [...store.users.values()],
    bookings: [...store.bookings.values()], events: [...store.events.values()], tiers: [...store.ticketTiers.values()],
  }, snapshots);
});

test('contact saves a formatted phone and profile allows updating and clearing an optional phone', async () => {
  const phone = '+353 (85) 123-4567';
  assert.equal((await submit('/contact', { name: 'Test User', email: 'test@example.com', message: 'An event enquiry', contactReason: 'GENERAL_ENQUIRY', phone })).status, 200);
  assert([...store.serviceEnquiries.values()].some((enquiry) => enquiry.phone === phone));
  const update = await submit('/me', { phone }, customerToken, 'PATCH');
  assert.equal(update.status, 200);
  assert.equal((await update.json() as { data: { phone: string } }).data.phone, phone);
  const clear = await submit('/me', { phone: '' }, customerToken, 'PATCH');
  assert.equal(clear.status, 200);
  assert.equal((await clear.json() as { data: { phone: string } }).data.phone, '');
});
