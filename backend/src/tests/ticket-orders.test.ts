import { after, before, beforeEach, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import Stripe from 'stripe';
import { S3Client } from '@aws-sdk/client-s3';
import { SESv2Client } from '@aws-sdk/client-sesv2';
import { store } from '../store/memory';
import { db } from '../store';
import { seedStore } from '../seed/data';
import { BookingEntity, EventEntity, TicketTierEntity, User } from '../types';
import { generateToken } from '../middleware/auth';
import { parseTicketSelections, quoteTicketOrder } from '../services/ticket-order';
import { reserveOrderInventory, expireStaleReservations, releaseBookingInventory } from '../services/inventory';
import checkoutRoutes from '../routes/checkout';
import pricingRoutes from '../routes/pricing';
import webhookRoutes from '../routes/webhooks-stripe';
import adminBookingRoutes from '../routes/admin/bookings';
import adminEventRoutes from '../routes/admin/events';
import reportRoutes from '../routes/admin/reports';
import refundRoutes from '../routes/admin/refunds';
import discountCodeRoutes from '../routes/admin/discount-codes';
import { verifyBookingToken } from '../services/booking-links';

process.env.STRIPE_SECRET_KEY = 'sk_test_local_regression';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_local_regression';

const stripe = new Stripe('sk_test_local_regression');
const sessionPrototype = Object.getPrototypeOf(stripe.checkout.sessions);
let stripeLines: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
let failStripe = false;
let server: Server;
let baseUrl: string;
let event: EventEntity;
let standard: TicketTierEntity;
let group: TicketTierEntity;
let child: TicketTierEntity;
let adminToken: string;

before(async () => {
  mock.method(console, 'log', () => {});
  mock.method(console, 'warn', () => {});
  // Keep integration tests offline, including generated QR/PDF assets and email delivery.
  mock.method(S3Client.prototype, 'send', async () => ({}));
  mock.method(SESv2Client.prototype, 'send', async () => ({}));
  mock.method(sessionPrototype, 'create', async (params: Stripe.Checkout.SessionCreateParams) => {
    if (failStripe) throw new Error('Simulated Stripe outage');
    stripeLines = params.line_items || [];
    return { id: 'cs_test_basket', url: 'https://checkout.stripe.test/basket' };
  });
  const app = express();
  app.use(express.json({ verify: (req, _res, body) => { (req as any).rawBody = body; } }));
  app.use('/checkout', checkoutRoutes);
  app.use('/pricing', pricingRoutes);
  app.use('/webhook', webhookRoutes);
  app.use('/admin/bookings', adminBookingRoutes);
  app.use('/admin/events', adminEventRoutes);
  app.use('/admin/reports', reportRoutes);
  app.use('/admin/refunds', refundRoutes);
  app.use('/admin/discount-codes', discountCodeRoutes);
  server = await new Promise<Server>((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  const address = server.address();
  assert(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  mock.restoreAll();
});

beforeEach(async () => {
  store.reset();
  seedStore();
  const template = Array.from(store.events.values())[0];
  event = { ...template, id: 'event-basket', slug: 'basket', status: 'PUBLISHED', visibility: 'PUBLIC',
    capacity: 100, totalTicketsSold: 0, totalTicketsReserved: 0, perOrderLimit: 20, allowGuestCheckout: true,
    startDateTime: new Date(Date.now() + 86400000).toISOString(), endDateTime: new Date(Date.now() + 90000000).toISOString() };
  const tierTemplate = Array.from(store.ticketTiers.values())[0];
  const tier = (id: string, type: TicketTierEntity['type'], price: number): TicketTierEntity => ({
    ...tierTemplate, id, eventId: event.id, type, name: id, priceAmountMinor: price, currency: 'EUR',
    salesStartAt: new Date(Date.now() - 86400000).toISOString(), salesEndAt: event.endDateTime,
    active: true, visible: true, maxQuantity: 100, quantitySold: 0, quantityReserved: 0,
    minPerOrder: 1, maxPerOrder: 20, groupMinSize: undefined,
  });
  standard = tier('Standard', 'STANDARD', 2000);
  group = { ...tier('Group', 'GROUP', 1500), minPerOrder: 4, groupMinSize: 4 };
  child = { ...tier('Child', 'CHILD', 0), name: 'Child 0–12 yrs' };
  await db.put('events', event);
  for (const item of [standard, group, child]) await db.put('ticketTiers', item);
  const admin = Array.from(store.users.values()).find((user) => user.role === 'ADMIN') as User;
  adminToken = generateToken(admin);
  stripeLines = [];
  failStripe = false;
});

const basket = () => [{ ticketTierId: standard.id, quantity: 1 }, { ticketTierId: group.id, quantity: 4 }, { ticketTierId: child.id, quantity: 2 }];
const buyer = { buyerName: 'Test Buyer', buyerEmail: 'buyer@example.com' };
async function request(path: string, body?: unknown, admin = false, method = body ? 'POST' : 'GET') {
  const res = await fetch(`${baseUrl}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(admin ? { Authorization: `Bearer ${adminToken}` } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(10000) });
  return { status: res.status, body: await res.json() as any };
}
async function webhook(type: string, object: unknown, id = `evt_${type}_${Date.now()}`) {
  const payload = JSON.stringify({ id, type, data: { object } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
  const res = await fetch(`${baseUrl}/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': signature }, body: payload });
  assert.equal(res.status, 200);
}
async function startBasket() {
  const result = await request('/checkout/session', { eventId: event.id, items: basket(), ...buyer });
  assert.equal(result.status, 200);
  return (await db.findBy<BookingEntity>('bookings', 'bookingReference', result.body.data.bookingReference))!;
}

test('Standard, Group and free Child tickets share one quote and Stripe checkout', async () => {
  const preview = await request('/pricing/quote', { eventId: event.id, items: basket() });
  assert.equal(preview.status, 200);
  assert.equal(preview.body.data.quantity, 7);
  assert.equal(preview.body.data.totalAmountMinor, 8000);
  assert.equal(preview.body.data.lineItems.length, 3);
  const booking = await startBasket();
  assert.equal(booking.totalAmountMinor, preview.body.data.totalAmountMinor);
  assert.equal(event.totalTicketsReserved, 7);
  assert.deepEqual(stripeLines.map((line) => [line.quantity, line.price_data?.unit_amount]), [[1, 2000], [4, 1500], [2, 0]]);
  await webhook('checkout.session.completed', { metadata: { bookingId: booking.id }, payment_intent: 'pi_test' });
  assert.equal(booking.bookingStatus, 'CONFIRMED');
  assert.equal(event.totalTicketsSold, 7);
  assert.equal(event.totalTicketsReserved, 0);
  const tickets = await db.filterBy('tickets', 'bookingId', booking.id);
  assert.equal(tickets.length, 7);
  assert.equal(tickets.filter((ticket) => ticket.ticketTierId === child.id).length, 2);
  assert.equal(child.quantitySold, 2);
  await webhook('checkout.session.completed', { metadata: { bookingId: booking.id } }, 'evt_second_completion');
  assert.equal((await db.filterBy('tickets', 'bookingId', booking.id)).length, 7);
  const report = await request(`/admin/reports/sales?eventId=${event.id}`, undefined, true);
  assert.deepEqual(report.body.data.byTicketTier.map((line: any) => [line.name, line.quantity, line.grossMinor]), [['Standard', 1, 2000], ['Group', 4, 6000], ['Child 0–12 yrs', 2, 0]]);
});

test('free child-only booking issues tickets immediately and returns a signed confirmation link', async () => {
  const result = await request('/checkout/session', { eventId: event.id, items: [{ ticketTierId: child.id, quantity: 3 }], ...buyer });
  assert.equal(result.status, 200);
  assert.equal(stripeLines.length, 0);
  const url = new URL(result.body.data.checkoutUrl);
  const verified = verifyBookingToken(url.searchParams.get('token')!);
  assert(verified);
  const booking = await db.get<BookingEntity>('bookings', verified.bookingId);
  assert.equal(booking?.paymentStatus, 'NOT_REQUIRED');
  assert.equal(booking?.bookingStatus, 'CONFIRMED');
  const tickets = await db.filterBy('tickets', 'bookingId', verified.bookingId);
  assert.equal(tickets.length, 3);
  assert(tickets.every((ticket) => ticket.ticketTierNameSnapshot === child.name && ticket.ticketPdfS3Key && ticket.qrCodeImageS3Key));
  assert.equal(child.quantitySold, 3);
  assert.equal(event.totalTicketsSold, 3);
});

test('mixed order enforces group minimum, aggregate order limit, and event capacity', async () => {
  for (const [items, expected] of [
    [[{ ticketTierId: standard.id, quantity: 1 }, { ticketTierId: group.id, quantity: 3 }], 400],
    [[{ ticketTierId: standard.id, quantity: 15 }, { ticketTierId: child.id, quantity: 6 }], 400],
  ] as const) {
    const result = await request('/checkout/session', { eventId: event.id, items, ...buyer });
    assert.equal(result.status, expected);
    assert.equal(event.totalTicketsReserved, 0);
  }
  event.capacity = 6;
  assert.equal((await request('/pricing/quote', { eventId: event.id, items: basket() })).status, 409);
  assert.equal((await request('/checkout/session', { eventId: event.id, items: basket(), ...buyer })).status, 409);
});

test('duplicate, fractional, negative and empty selections are rejected', () => {
  for (const items of [[], [{ ticketTierId: child.id, quantity: 0 }], [{ ticketTierId: child.id, quantity: 1.5 }], [{ ticketTierId: child.id, quantity: -1 }], [{ ticketTierId: child.id, quantity: 1 }, { ticketTierId: child.id, quantity: 1 }]]) {
    assert.throws(() => parseTicketSelections({ items }));
  }
});

test('unavailable, hidden, foreign, and different-currency types invalidate the whole basket', async () => {
  for (const mutation of [{ active: false }, { visible: false }, { eventId: 'another-event' }, { currency: 'USD' }, { quantitySold: 100 }]) {
    await db.put('ticketTiers', { ...child, ...mutation });
    const result = await request('/checkout/session', { eventId: event.id, items: basket(), ...buyer });
    assert([400, 404, 409].includes(result.status));
    assert.equal(event.totalTicketsReserved, 0);
  }
});

test('Early Bird price is identical at preview and checkout and applies only to Standard', async () => {
  await db.put('ticketTiers', { ...standard, id: 'early', type: 'EARLY_BIRD', maxQuantity: 2, priceAmountMinor: 1000 });
  const items = [{ ticketTierId: standard.id, quantity: 3 }, { ticketTierId: child.id, quantity: 1 }];
  const quote = await quoteTicketOrder(event, items);
  assert.equal(quote.totalAmountMinor, 4000);
  assert.equal(quote.earlyBirdQuantity, 2);
  const result = await request('/checkout/session', { eventId: event.id, items, ...buyer });
  assert.equal(result.status, 200);
  const booking = await db.findBy<BookingEntity>('bookings', 'bookingReference', result.body.data.bookingReference);
  assert.equal(booking?.totalAmountMinor, quote.totalAmountMinor);
  assert.deepEqual(stripeLines.map((line) => [line.quantity, line.price_data?.unit_amount]), [[2, 1000], [1, 2000], [1, 0]]);
});

test('a later tier reservation failure releases all earlier reservations', async () => {
  child.maxQuantity = 1;
  await assert.rejects(reserveOrderInventory(event.id, basket()));
  assert.equal(event.totalTicketsReserved, 0);
  assert.equal(standard.quantityReserved, 0);
  assert.equal(group.quantityReserved, 0);
});

test('Stripe failure releases all ticket types and marks the reservation as failed', async () => {
  const expectedError = mock.method(console, 'error', () => {});
  failStripe = true;
  const result = await request('/checkout/session', { eventId: event.id, items: basket(), ...buyer });
  assert.equal(result.status, 502);
  assert.equal(event.totalTicketsReserved, 0);
  assert.equal(group.quantityReserved, 0);
  const failed = (await db.filterBy<BookingEntity>('bookings', 'eventId', event.id))[0];
  assert.equal(failed.bookingStatus, 'PAYMENT_FAILED');
  expectedError.mock.restore();
});

test('expiry and payment failure release every type exactly once', async () => {
  for (const type of ['checkout.session.expired', 'payment_intent.payment_failed']) {
    const booking = await startBasket();
    await webhook(type, { metadata: { bookingId: booking.id } });
    await webhook(type, { metadata: { bookingId: booking.id } }, `evt_repeat_${type}`);
    assert.equal(event.totalTicketsReserved, 0);
    for (const tier of [standard, group, child]) assert.equal(tier.quantityReserved, 0);
  }
  const stale = await startBasket();
  stale.reservedUntil = new Date(Date.now() - 1).toISOString();
  await expireStaleReservations(event.id);
  assert.equal(stale.bookingStatus, 'EXPIRED');
  assert.equal(event.totalTicketsReserved, 0);
});

test('admin cancellation and full refund return inventory for every type', async () => {
  const booking = await startBasket();
  await webhook('checkout.session.completed', { metadata: { bookingId: booking.id }, payment_intent: 'pi_refund' });
  await webhook('charge.refunded', { payment_intent: 'pi_refund', amount_refunded: 8000 });
  await webhook('charge.refunded', { payment_intent: 'pi_refund', amount_refunded: 8000 }, 'evt_refund_repeat');
  assert.equal(event.totalTicketsSold, 0);
  for (const tier of [standard, group, child]) assert.equal(tier.quantitySold, 0);
  const free = await request('/checkout/session', { eventId: event.id, items: [{ ticketTierId: child.id, quantity: 2 }], ...buyer });
  assert.equal((await request(`/admin/bookings/${free.body.data.bookingReference}/cancel`, { reason: 'Cannot attend' }, true)).status, 200);
  assert.equal(event.totalTicketsSold, 0);
  assert.equal(child.quantitySold, 0);
});

test('admin creates, edits and hides a free child type and invalid edits leave it intact', async () => {
  const created = await request(`/admin/events/${event.id}/ticket-tiers`, { name: 'Child 0-12 yrs', type: 'CHILD', priceAmountMinor: 0, maxQuantity: 25, salesStartAt: child.salesStartAt, salesEndAt: child.salesEndAt }, true);
  assert.equal(created.status, 201);
  const id = created.body.data.id;
  const patch = await request(`/admin/events/${event.id}/ticket-tiers/${id}`, { name: 'Child 0-10 yrs', priceAmountMinor: 0, visible: false }, true, 'PATCH');
  assert.equal(patch.status, 200);
  assert.equal(patch.body.data.visible, false);
  assert.equal((await request(`/admin/events/${event.id}/ticket-tiers/${id}`, { priceAmountMinor: -1 }, true, 'PATCH')).status, 400);
  assert.equal((await db.get<TicketTierEntity>('ticketTiers', id))?.priceAmountMinor, 0);
});

test('manual mixed bookings issue child tickets and full refunds restore all types', async () => {
  const result = await request('/admin/bookings', { eventId: event.id, items: basket(), ...buyer, paymentMethod: 'CASH' }, true);
  assert.equal(result.status, 201);
  assert.equal(event.totalTicketsSold, 7);
  assert.equal((await db.filterBy('tickets', 'bookingId', result.body.data.id)).length, 7);
  const refund = await request('/admin/refunds', { bookingId: result.body.data.id, amountMinor: 8000, reason: 'Cancelled visit' }, true);
  assert.equal(refund.status, 201);
  assert.equal(event.totalTicketsSold, 0);
  for (const tier of [standard, group, child]) assert.equal(tier.quantitySold, 0);
});

test('legacy single-tier checkout requests continue to work', async () => {
  const result = await request('/checkout/session', { eventId: event.id, ticketTierId: standard.id, quantity: 2, ...buyer });
  assert.equal(result.status, 200);
  assert.equal(event.totalTicketsReserved, 2);
});


test('VIP, complimentary and custom types can join a Standard, Group and Child order', async () => {
  const items = basket();
  for (const type of ['VIP', 'COMPLIMENTARY', 'CUSTOM'] as const) {
    await db.put('ticketTiers', { ...standard, id: type, type, name: type, priceAmountMinor: type === 'COMPLIMENTARY' ? 0 : 3000 });
    items.push({ ticketTierId: type, quantity: 1 });
  }
  const quote = await quoteTicketOrder(event, items);
  assert.equal(quote.lineItems?.length, 6);
  assert.equal(quote.quantity, 10);
  assert.equal(quote.totalAmountMinor, 14000);
});

test('inventory cleanup supports existing stored bookings without line items', async () => {
  await reserveOrderInventory(event.id, [{ ticketTierId: standard.id, quantity: 2 }]);
  await releaseBookingInventory({ eventId: event.id, ticketTierId: standard.id, quantity: 2 } as BookingEntity);
  assert.equal(event.totalTicketsReserved, 0);
  assert.equal(standard.quantityReserved, 0);
});

async function createDiscount(overrides: Record<string, unknown> = {}) {
  return request('/admin/discount-codes', {
    eventId: event.id, code: 'FRIENDS10', discountType: 'PERCENTAGE', value: 10, ...overrides,
  }, true);
}

test('admins generate unique codes, list them and control availability; customers cannot manage codes', async () => {
  assert.equal((await request('/admin/discount-codes', { eventId: event.id })).status, 401);
  const customer = Array.from(store.users.values()).find((user) => user.role === 'CUSTOMER')!;
  const forbidden = await fetch(`${baseUrl}/admin/discount-codes`, { headers: { Authorization: `Bearer ${generateToken(customer)}` } });
  assert.equal(forbidden.status, 403);
  const generated = await createDiscount({ code: undefined, value: 5 });
  assert.equal(generated.status, 201);
  assert.match(generated.body.data.code, /^BB-[A-F0-9]{12}$/);
  assert.equal((await createDiscount({ code: 'friends10' })).status, 201);
  assert.equal((await createDiscount()).status, 409);
  assert.equal((await request('/admin/discount-codes', undefined, true)).body.data.length, 2);
  const toggle = await request('/admin/discount-codes/FRIENDS10', { active: false }, true, 'PATCH');
  assert.equal(toggle.status, 200);
  assert.equal(toggle.body.data.active, false);
  assert.equal((await request('/admin/discount-codes/FRIENDS10', { active: 'false' }, true, 'PATCH')).status, 400);
  assert.equal((await request('/admin/discount-codes/FRIENDS10', { active: true }, true, 'PATCH')).body.data.active, true);
});

test('invalid discount values, codes, expiry dates and foreign ticket scopes are rejected', async () => {
  for (const overrides of [
    { value: 0 }, { value: -1 }, { value: 101 }, { value: '10' }, { value: 1.001 },
    { discountType: 'UNKNOWN' }, { discountType: 'FIXED', value: 1.5 },
    { code: {} }, { code: 'bad code' }, { code: 'ab' },
    { eventId: 'missing' }, { ticketTierIds: ['missing'] }, { ticketTierIds: [standard.id, standard.id] },
    { expiresAt: 'invalid' }, { expiresAt: new Date(Date.now() - 1000).toISOString() },
  ]) {
    assert.equal((await createDiscount(overrides)).status, 400, JSON.stringify(overrides));
  }
  for (const value of [1.1, 9.99, 12.5]) {
    assert.equal((await createDiscount({ code: `VALID-${Math.round(value * 100)}`, value,
      expiresAt: new Date(Date.now() + 86400000).toISOString() })).status, 201);
  }
});

test('percentage codes apply per ticket with exact preview, Stripe, booking and report totals', async () => {
  await createDiscount({ value: 12.5 });
  const data = { eventId: event.id, items: basket(), discountCode: '  friends10  ' };
  const preview = await request('/pricing/quote', data);
  assert.equal(preview.status, 200);
  assert.equal(preview.body.data.subtotalAmountMinor, 8000);
  assert.equal(preview.body.data.discountAmountMinor, 1002); // 250 + (188 × 4), rounded per ticket
  assert.equal(preview.body.data.totalAmountMinor, 6998);
  const result = await request('/checkout/session', { ...data, ...buyer, totalAmountMinor: 1, discountAmountMinor: 7999 });
  assert.equal(result.status, 200);
  const booking = (await db.findBy<BookingEntity>('bookings', 'bookingReference', result.body.data.bookingReference))!;
  assert.equal(booking.discountCode, 'FRIENDS10');
  assert.equal(booking.discountAmountMinor, 1002);
  assert.equal(booking.totalAmountMinor, 6998);
  assert.equal(stripeLines.reduce((sum, line) => sum + line.quantity! * Number(line.price_data?.unit_amount), 0), booking.totalAmountMinor);
  await webhook('checkout.session.completed', { metadata: { bookingId: booking.id }, payment_intent: 'pi_discount' });
  const report = await request(`/admin/reports/sales?eventId=${event.id}`, undefined, true);
  assert.equal(report.body.data.byTicketTier.reduce((sum: number, line: any) => sum + line.grossMinor, 0), 6998);
  booking.refundedAmountMinor = 500;
  booking.bookingStatus = 'PARTIALLY_REFUNDED';
  const refunded = await request(`/admin/reports/sales?eventId=${event.id}`, undefined, true);
  assert.equal(refunded.body.data.byTicketTier.reduce((sum: number, line: any) => sum + line.grossMinor, 0), 6498);
});

test('fixed discounts apply to each eligible ticket after Early Bird pricing and cap at its price', async () => {
  await createDiscount({ discountType: 'FIXED', value: 1500, ticketTierIds: [standard.id] });
  await db.put('ticketTiers', { ...standard, id: 'early-discount', type: 'EARLY_BIRD', maxQuantity: 2, priceAmountMinor: 1000 });
  const items = [{ ticketTierId: standard.id, quantity: 3 }, { ticketTierId: group.id, quantity: 4 }];
  const data = { eventId: event.id, items, discountCode: 'FRIENDS10' };
  const preview = await request('/pricing/quote', data);
  assert.equal(preview.body.data.subtotalAmountMinor, 10000);
  assert.equal(preview.body.data.discountAmountMinor, 3500);
  assert.equal(preview.body.data.totalAmountMinor, 6500);
  const result = await request('/checkout/session', { ...data, ...buyer });
  assert.equal(result.status, 200);
  assert.deepEqual(stripeLines.map((line) => [line.quantity, line.price_data?.unit_amount]), [[2, 0], [1, 500], [4, 1500]]);
});

test('invalid, disabled, expired, other-event and ineligible codes fail before inventory reservation', async () => {
  await createDiscount();
  const original = { ...(await db.get('discountCodes', 'FRIENDS10')) };
  const data = { eventId: event.id, items: basket(), discountCode: 'FRIENDS10' };
  for (const mutation of [{ active: false }, { eventId: 'another-event' },
    { expiresAt: new Date(Date.now() - 1000).toISOString() }, { ticketTierIds: [child.id] },
    { discountType: 'FIXED', currency: 'USD' },
  ]) {
    await db.put('discountCodes', { ...original, ...mutation });
    assert.equal((await request('/pricing/quote', data)).status, 400);
    assert.equal((await request('/checkout/session', { ...data, ...buyer })).status, 400);
    assert.equal(event.totalTicketsReserved, 0);
  }
  for (const discountCode of ['MISSING', null, {}, 10]) {
    assert.equal((await request('/checkout/session', { ...data, discountCode, ...buyer })).status, 400);
  }
  assert.equal((await request('/checkout/session', { ...data, ...buyer, discountCode: undefined })).status, 200);
});

test('a code disabled after preview is revalidated at checkout', async () => {
  await createDiscount();
  const data = { eventId: event.id, items: basket(), discountCode: 'FRIENDS10' };
  assert.equal((await request('/pricing/quote', data)).status, 200);
  await request('/admin/discount-codes/FRIENDS10', { active: false }, true, 'PATCH');
  assert.equal((await request('/checkout/session', { ...data, ...buyer })).status, 400);
  assert.equal(event.totalTicketsReserved, 0);
});

test('100 percent discounts confirm immediately and issue every ticket without Stripe', async () => {
  await createDiscount({ value: 100 });
  const result = await request('/checkout/session', { eventId: event.id, items: basket(), discountCode: 'FRIENDS10', ...buyer });
  assert.equal(result.status, 200);
  assert.equal(stripeLines.length, 0);
  const booking = (await db.findBy<BookingEntity>('bookings', 'bookingReference', result.body.data.bookingReference))!;
  assert.equal(booking.totalAmountMinor, 0);
  assert.equal(booking.discountAmountMinor, 8000);
  assert.equal(booking.bookingStatus, 'CONFIRMED');
  assert.equal(booking.paymentStatus, 'NOT_REQUIRED');
  assert.equal((await db.filterBy('tickets', 'bookingId', booking.id)).length, 7);
});
