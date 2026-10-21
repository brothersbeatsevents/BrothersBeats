import { after, before, beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import Stripe from 'stripe';
import { S3Client } from '@aws-sdk/client-s3';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { db } from '../store';
import { store } from '../store/memory';
import { seedStore } from '../seed/data';
import { generateToken } from '../middleware/auth';
import type { BookingEntity, EventEntity, TicketEntity, TicketTierEntity } from '../types';

let server: Server;
let baseUrl: string;
let adminToken: string;
let event: EventEntity;
let paidTier: TicketTierEntity;
let freeTier: TicketTierEntity;
const emails: SendEmailCommand['input'][] = [];
const buyer = { buyerName: 'Email Test Buyer', buyerEmail: 'booking-email@example.com' };

before(async () => {
  // Configure email before loading the routes; every delivery stays mocked.
  process.env.SES_FROM_EMAIL = 'tickets@example.com';
  process.env.STRIPE_SECRET_KEY = 'sk_test_booking_emails';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_booking_emails';
  mock.method(console, 'log', () => {});
  mock.method(console, 'warn', () => {});
  mock.method(S3Client.prototype, 'send', async () => ({}));
  mock.method(SESv2Client.prototype, 'send', async (command: SendEmailCommand) => {
    emails.push(command.input);
    return {};
  });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  mock.method(Object.getPrototypeOf(stripe.checkout.sessions), 'create', async () => ({
    id: 'cs_test_booking_email', url: 'https://checkout.stripe.test/booking-email',
  }));
  const app = express();
  app.use(express.json({ verify: (req, _res, body) => { (req as any).rawBody = body; } }));
  app.use('/checkout', (await import('../routes/checkout')).default);
  app.use('/webhook', (await import('../routes/webhooks-stripe')).default);
  app.use('/admin/bookings', (await import('../routes/admin/bookings')).default);
  server = await new Promise<Server>((resolve, reject) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    listener.on('error', reject);
  });
  const address = server.address();
  assert(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(async () => {
  store.reset();
  seedStore();
  emails.length = 0;
  const eventTemplate = [...store.events.values()][0];
  event = { ...eventTemplate, id: 'event-email', title: 'Email test concert', slug: 'email-test',
    status: 'PUBLISHED', visibility: 'PUBLIC', allowGuestCheckout: true,
    capacity: 100, perOrderLimit: 10, totalTicketsSold: 0, totalTicketsReserved: 0,
    startDateTime: new Date(Date.now() + 86400000).toISOString(), endDateTime: new Date(Date.now() + 90000000).toISOString() };
  const tierTemplate = [...store.ticketTiers.values()][0];
  paidTier = { ...tierTemplate, id: 'tier-email-paid', eventId: event.id, name: 'Standard', type: 'STANDARD',
    currency: 'EUR', priceAmountMinor: 2000, active: true, visible: true,
    maxQuantity: 100, quantitySold: 0, quantityReserved: 0, minPerOrder: 1, maxPerOrder: 10,
    salesStartAt: new Date(Date.now() - 86400000).toISOString(), salesEndAt: event.endDateTime };
  freeTier = { ...paidTier, id: 'tier-email-free', name: 'Child', type: 'CHILD', priceAmountMinor: 0 };
  await db.put('events', event);
  await db.put('ticketTiers', paidTier);
  await db.put('ticketTiers', freeTier);
  adminToken = generateToken([...store.users.values()].find((user) => user.role === 'ADMIN')!);
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  mock.restoreAll();
});

async function submit(path: string, body: unknown, admin = false) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(admin ? { Authorization: `Bearer ${adminToken}` } : {}) },
    body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
  });
  assert(response.ok, await response.clone().text());
  return response.json() as Promise<{ data: BookingEntity & { bookingReference: string } }>;
}

async function startBooking(free = false, manual = false): Promise<BookingEntity> {
  const { data } = await submit(manual ? '/admin/bookings' : '/checkout/session', {
    eventId: event.id, items: [{ ticketTierId: free ? freeTier.id : paidTier.id, quantity: 2 }],
    ...buyer, ...(manual ? { paymentMethod: 'CASH' } : {}),
  }, manual);
  return (await db.findBy<BookingEntity>('bookings', 'bookingReference', data.bookingReference))!;
}

async function completeBooking(booking: BookingEntity, id: string) {
  const payload = JSON.stringify({ id, type: 'checkout.session.completed', data: { object: {
    metadata: { bookingId: booking.id }, payment_intent: 'pi_booking_email',
  } } });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
  const response = await fetch(`${baseUrl}/webhook`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': signature }, body: payload });
  assert.equal(response.status, 200);
}

async function assertSingleTicketEmail(booking: BookingEntity) {
  assert.equal(emails.length, 1, 'one combined booking and ticket email');
  assert.deepEqual(emails[0].Destination?.ToAddresses, [buyer.buyerEmail]);
  const content = emails[0].Content?.Simple;
  assert.match(content?.Subject?.Data || '', /Booking confirmed/);
  const html = content?.Body?.Html?.Data || '';
  assert(html.includes(booking.bookingReference));
  assert(html.includes(event.title));
  assert(html.includes('Total paid'));
  assert.match(html, /View &amp; Download Tickets/);
  assert(html.includes(`/account/tickets/${booking.bookingReference}`));
  assert.doesNotMatch(html, /on their way|separate email/i);
  const tickets = await db.filterBy<TicketEntity>('tickets', 'bookingId', booking.id);
  assert.equal(tickets.length, 2);
  for (const ticket of tickets) {
    assert(ticket.ticketPdfS3Key && ticket.qrCodeImageS3Key, 'tickets generated before delivery');
    assert(html.includes(ticket.ticketNumber));
    assert(html.includes(ticket.ticketTierNameSnapshot!));
  }
}

test('paid booking sends one complete ticket email and webhook retries do not send another', async () => {
  const booking = await startBooking();
  assert.equal(emails.length, 0, 'no email before successful payment');
  await completeBooking(booking, 'evt_booking_email');
  await assertSingleTicketEmail(booking);
  await completeBooking(booking, 'evt_booking_email');
  await completeBooking(booking, 'evt_second_booking_email');
  assert.equal(emails.length, 1);
});

test('free booking sends one complete ticket email', async () => {
  await assertSingleTicketEmail(await startBooking(true));
});

test('manual booking sends one complete ticket email', async () => {
  await assertSingleTicketEmail(await startBooking(false, true));
});

test('requested confirmation and ticket resends each deliver one email containing the tickets', async () => {
  const booking = await startBooking(false, true);
  emails.length = 0;
  await submit(`/admin/bookings/${booking.bookingReference}/resend-confirmation`, {}, true);
  await assertSingleTicketEmail(booking);
  emails.length = 0;
  await submit(`/admin/bookings/${booking.bookingReference}/resend-tickets`, {}, true);
  assert.equal(emails.length, 1);
  const html = emails[0].Content?.Simple?.Body?.Html?.Data || '';
  const tickets = await db.filterBy<TicketEntity>('tickets', 'bookingId', booking.id);
  assert(tickets.every((ticket) => html.includes(ticket.ticketNumber)));
  assert(html.includes(`/account/tickets/${booking.bookingReference}`));
});

test('pending bookings cannot send a ticket-ready confirmation', async () => {
  const booking = await startBooking();
  const response = await fetch(`${baseUrl}/admin/bookings/${booking.bookingReference}/resend-confirmation`, {
    method: 'POST', headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(response.status, 404);
  assert.equal(emails.length, 0);
});
