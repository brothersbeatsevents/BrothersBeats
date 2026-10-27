import { after, before, beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import Stripe from 'stripe';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { PDFDocument } from 'pdf-lib';
import { SESv2Client, SendEmailCommand, type Attachment } from '@aws-sdk/client-sesv2';
import { db } from '../store';
import { store } from '../store/memory';
import { generateToken } from '../middleware/auth';
import type { BookingEntity, EventEntity, TicketEntity, TicketTierEntity } from '../types';

let server: Server;
let baseUrl: string;
let adminToken: string;
let event: EventEntity;
let paidTier: TicketTierEntity;
let freeTier: TicketTierEntity;
let emailFailure: Error | undefined;
let checkoutSuccessUrl: string | undefined;
let seedStore: typeof import('../seed/data').seedStore;
const ticketFiles = new Map<string, Uint8Array>();
let failPdfRead = false;
const emails: SendEmailCommand['input'][] = [];
const buyer = { buyerName: 'Email Test Buyer', buyerEmail: 'booking-email@example.com' };

before(async () => {
  // Configure email before loading the routes; every delivery stays mocked.
  process.env.SES_FROM_EMAIL = 'tickets@example.com';
  process.env.SUPPORT_EMAIL = 'support@example.com';
  process.env.STRIPE_SECRET_KEY = 'sk_test_booking_emails';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_booking_emails';
  process.env.AWS_ACCESS_KEY_ID = 'test-booking-access';
  process.env.AWS_SECRET_ACCESS_KEY = 'test-booking-access-secret';
  process.env.S3_MEDIA_BUCKET = 'test-ticket-bucket';
  delete process.env.AWS_PROFILE;
  delete process.env.AWS_DEFAULT_PROFILE;
  ({ seedStore } = await import('../seed/data'));
  mock.method(console, 'log', () => {});
  mock.method(console, 'warn', () => {});
  mock.method(console, 'info', () => {});
  mock.method(console, 'error', () => {});
  mock.method(S3Client.prototype, 'send', async (command: GetObjectCommand | PutObjectCommand) => {
    if (command instanceof PutObjectCommand) {
      ticketFiles.set(command.input.Key!, new Uint8Array(command.input.Body as Uint8Array));
    } else if (command instanceof GetObjectCommand) {
      if (failPdfRead) throw new Error('Ticket storage unavailable');
      const file = ticketFiles.get(command.input.Key!);
      if (!file) throw new Error('Ticket PDF not found');
      return { Body: { transformToByteArray: async () => file } };
    }
    return {};
  });
  mock.method(SESv2Client.prototype, 'send', async (command: SendEmailCommand) => {
    emails.push(command.input);
    if (emailFailure) throw emailFailure;
    return {};
  });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  mock.method(Object.getPrototypeOf(stripe.checkout.sessions), 'create', async (params: Stripe.Checkout.SessionCreateParams) => {
    checkoutSuccessUrl = params.success_url;
    return { id: 'cs_test_booking_email', url: 'https://checkout.stripe.test/booking-email' };
  });
  const app = express();
  app.use(express.json({ verify: (req, _res, body) => { (req as any).rawBody = body; } }));
  app.use('/checkout', (await import('../routes/checkout')).default);
  app.use('/webhook', (await import('../routes/webhooks-stripe')).default);
  app.use('/admin/bookings', (await import('../routes/admin/bookings')).default);
  app.use('/me', (await import('../routes/me')).default);
  app.use('/booking', (await import('../routes/booking')).default);
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
  emailFailure = undefined;
  checkoutSuccessUrl = undefined;
  ticketFiles.clear();
  failPdfRead = false;
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

async function startBooking(free = false, manual = false, quantity = 2): Promise<BookingEntity> {
  const { data } = await submit(manual ? '/admin/bookings' : '/checkout/session', {
    eventId: event.id, items: [{ ticketTierId: free ? freeTier.id : paidTier.id, quantity }],
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
  assert.deepEqual(emails[0].ReplyToAddresses, ['support@example.com']);
  const content = emails[0].Content?.Simple;
  assert.match(content?.Subject?.Data || '', /Booking confirmed/);
  const html = content?.Body?.Html?.Data || '';
  const text = content?.Body?.Text?.Data || '';
  assert(text.includes(booking.bookingReference));
  assert(text.includes('/booking/confirmation?token='));
  assert(text.includes('Total paid'));
  assert(html.includes(booking.bookingReference));
  assert(html.includes(event.title));
  assert(html.includes('Total paid'));
  assert.match(html, /View &amp; Download Tickets/);
  await assertGuestTicketEmail(booking);
  assert.doesNotMatch(html, /on their way|separate email/i);
  const tickets = await db.filterBy<TicketEntity>('tickets', 'bookingId', booking.id);
  assert.equal(tickets.length, 2);
  for (const ticket of tickets) {
    assert(ticket.ticketPdfS3Key && ticket.qrCodeImageS3Key, 'tickets generated before delivery');
    assert(html.includes(ticket.ticketNumber));
    assert(text.includes(ticket.ticketNumber));
    assert(html.includes(ticket.ticketTierNameSnapshot!));
  }
}

async function assertGuestTicketUrl(link: string, booking: BookingEntity) {
  const url = new URL(link);
  assert.equal(url.pathname, '/booking/confirmation');
  const token = url.searchParams.get('token');
  assert(token);
  const response = await fetch(`${baseUrl}/booking/confirmation?token=${token}`, { signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200, 'guest ticket access needs no Authorization header');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const result = await response.json() as { data: BookingEntity & { tickets: { ticketNumber: string; pdfDownloadUrl: string }[] } };
  assert.equal(result.data.bookingReference, booking.bookingReference);
  assert.equal(result.data.tickets.length, booking.quantity);
  assert(result.data.tickets.every((ticket) => ticket.ticketNumber && ticket.pdfDownloadUrl.includes('X-Amz-Signature=')));
}

async function assertGuestTicketEmail(booking: BookingEntity) {
  const content = emails[0].Content?.Simple?.Body;
  const html = content?.Html?.Data || '';
  assert.doesNotMatch(html, /\/account\/tickets\//);
  const match = html.match(/href="([^"]*\/booking\/confirmation\?token=[a-f0-9]+)"/);
  assert(match, 'email contains a secure guest ticket link');
  assert(content?.Text?.Data?.includes(match[1]), 'HTML and text use the same guest link');
  const attachments = emails[0].Content?.Simple?.Attachments;
  const tickets = await db.filterBy<TicketEntity>('tickets', 'bookingId', booking.id);
  assert.equal(attachments?.length, tickets.length, 'one PDF attachment per ticket');
  for (const ticket of tickets) {
    const attachment: Attachment | undefined = attachments!.find((file) => file.FileName === `${ticket.ticketNumber}.pdf`);
    assert(attachment, 'attachment filename identifies its ticket');
    assert.equal(attachment.ContentType, 'application/pdf');
    assert.equal(attachment.ContentDisposition, 'ATTACHMENT');
    assert.equal(attachment.ContentTransferEncoding, 'BASE64');
    assert.deepEqual(attachment.RawContent, ticketFiles.get(ticket.ticketPdfS3Key!), 'attach the actual generated PDF');
    assert.equal((await PDFDocument.load(attachment.RawContent!)).getPageCount(), 1);
  }
  assert.match(html, /ticket PDFs? (?:is|are) attached/);
  assert.match(content?.Text?.Data || '', /ticket PDFs are attached/);
  await assertGuestTicketUrl(match[1], booking);
}

test('paid booking sends one complete ticket email and webhook retries do not send another', async () => {
  const booking = await startBooking();
  assert.equal(emails.length, 0, 'no email before successful payment');
  assert(checkoutSuccessUrl);
  const pendingUrl = new URL(checkoutSuccessUrl);
  const pendingResponse = await fetch(`${baseUrl}/booking/confirmation?${pendingUrl.searchParams}`);
  assert.equal(pendingResponse.status, 200);
  const pending = await pendingResponse.json() as { data: { bookingStatus: string; tickets: unknown[] } };
  assert.equal(pending.data.bookingStatus, 'RESERVED_PENDING_PAYMENT');
  assert.equal(pending.data.tickets.length, 0, 'unpaid checkout never exposes tickets');
  await completeBooking(booking, 'evt_booking_email');
  assert(checkoutSuccessUrl);
  await assertGuestTicketUrl(checkoutSuccessUrl, booking);
  await assertSingleTicketEmail(booking);
  await completeBooking(booking, 'evt_booking_email');
  await completeBooking(booking, 'evt_second_booking_email');
  assert.equal(emails.length, 1);
});

test('free booking sends one complete ticket email', async () => {
  await assertSingleTicketEmail(await startBooking(true));
});

test('a single guest ticket includes its PDF attachment', async () => {
  const booking = await startBooking(true, false, 1);
  assert.equal(emails.length, 1);
  await assertGuestTicketEmail(booking);
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
  await assertGuestTicketEmail(booking);
});

test('pending bookings cannot send a ticket-ready confirmation', async () => {
  const booking = await startBooking();
  const response = await fetch(`${baseUrl}/admin/bookings/${booking.bookingReference}/resend-confirmation`, {
    method: 'POST', headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(response.status, 404);
  assert.equal(emails.length, 0);
});

for (const action of ['resend-confirmation', 'resend-tickets', 'customer-resend']) {
  async function prepareResend() {
    const booking = await startBooking(false, true);
    booking.buyerEmail = 'ticket-test@icloud.com';
    booking.normalizedBuyerEmail = booking.buyerEmail;
    const customer = [...store.users.values()].find((user) => user.role === 'CUSTOMER')!;
    booking.customerUserId = customer.id;
    await db.put('bookings', booking);
    emails.length = 0;
    const path = action === 'customer-resend'
      ? `/me/bookings/${booking.bookingReference}/resend`
      : `/admin/bookings/${booking.bookingReference}/${action}`;
    const token = action === 'customer-resend' ? generateToken(customer) : adminToken;
    return { booking, request: () => fetch(`${baseUrl}${path}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    }) };
  }

  test(`${action}: iCloud resend is submitted to SES with both email formats`, async () => {
    const { booking, request } = await prepareResend();
    const response = await request();
    assert.equal(response.status, 200);
    const result = await response.json() as { message: string };
    assert.match(result.message, /submitted for delivery/);
    assert.equal(emails.length, 1);
    assert.deepEqual(emails[0].Destination?.ToAddresses, ['ticket-test@icloud.com']);
    const body = emails[0].Content?.Simple?.Body;
    assert(body?.Html?.Data?.includes(booking.bookingReference));
    assert(body?.Text?.Data?.includes(booking.bookingReference));
    await assertGuestTicketEmail(booking);
    const tickets = await db.filterBy<TicketEntity>('tickets', 'bookingId', booking.id);
    for (const ticket of tickets) {
      assert(body?.Text?.Data?.includes(ticket.ticketNumber));
    }
  });

  test(`${action}: SES rejection returns an error without a success audit entry`, async () => {
    const { request } = await prepareResend();
    const auditsBefore = store.auditLogs.size;
    emailFailure = new Error('SES rejected this email');
    const response = await request();
    assert.equal(response.status, 502);
    const body = await response.json() as { success: boolean; error: string };
    assert.equal(body.success, false);
    assert.match(body.error, /could not be sent/);
    assert.equal(store.auditLogs.size, auditsBefore);
  });

  test(`${action}: suppressed address returns an error without contacting SES`, async () => {
    const { booking, request } = await prepareResend();
    const auditsBefore = store.auditLogs.size;
    await db.put('emailSuppressions', {
      id: `suppressed-${booking.buyerEmail}`, email: booking.buyerEmail,
      reason: 'bounce', suppressed_at: new Date().toISOString(), created_at: new Date().toISOString(),
    });
    const response = await request();
    assert.equal(response.status, 502);
    assert.equal((await response.json() as { success: boolean }).success, false);
    assert.equal(emails.length, 0);
    assert.equal(store.auditLogs.size, auditsBefore);
  });

  test(`${action}: PDF retrieval failure reports an error instead of sending an incomplete email`, async () => {
    const { request } = await prepareResend();
    failPdfRead = true;
    const response = await request();
    assert.equal(response.status, 502);
    assert.equal((await response.json() as { success: boolean }).success, false);
    assert.equal(emails.length, 0);
  });
}

test('guest ticket recovery emails PDFs and an account-free link for a normalized email and booking reference', async () => {
  const booking = await startBooking(false, true);
  emails.length = 0;
  await submit('/booking/lookup', { email: `  ${buyer.buyerEmail.toUpperCase()}  `, bookingReference: ` ${booking.bookingReference.toLowerCase()} ` });
  assert.equal(emails.length, 1);
  assert.deepEqual(emails[0].Destination?.ToAddresses, [buyer.buyerEmail]);
  await assertGuestTicketEmail(booking);
  const html = emails[0].Content?.Simple?.Body?.Html?.Data || '';
  const match = html.match(/href="([^"]*\/booking\/confirmation\?token=[a-f0-9]+)"/);
  assert(match);
  await assertGuestTicketUrl(match[1], booking);
});

test('lookup does not reveal whether an email has a booking', async () => {
  const response = await fetch(`${baseUrl}/booking/lookup`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'unknown@example.com' }),
  });
  assert.equal(response.status, 200);
  assert.match((await response.json() as { message: string }).message, /If a matching booking exists/);
  assert.equal(emails.length, 0);
});

test('guest access rejects booking references, guessed tokens and malformed queries', async () => {
  const booking = await startBooking(false, true);
  for (const query of [`token=${booking.bookingReference}`, `token=${'a'.repeat(64)}`, 'token[]=invalid', '']) {
    const response = await fetch(`${baseUrl}/booking/confirmation?${query}`);
    assert.equal(response.status, query.includes('token=') ? 401 : 400);
    assert.equal((await response.json() as { success: boolean }).success, false);
  }
});
