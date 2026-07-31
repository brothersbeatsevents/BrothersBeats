// ──────────────────────────────────────────
// Stripe Payment Integration
// Checkout Sessions, Refunds, and verified webhook events.
// ──────────────────────────────────────────

import Stripe from 'stripe';

const STRIPE_ENVIRONMENT = process.env.STRIPE_ENVIRONMENT || 'test';

// ── Stripe secret key — fetched from the Parameters & Secrets Lambda
//    extension when running in Lambda (cached by extension TTL), otherwise
//    read directly from an env var for local dev. ──
let _cachedSecretKey: string | null = null;
let _secretKeyExpiry = 0;
const KEY_CACHE_TTL = 60 * 60 * 1000; // re-fetch after 1h to pick up rotations

async function getStripeSecretKey(): Promise<string> {
  if (_cachedSecretKey !== null && Date.now() < _secretKeyExpiry)
    return _cachedSecretKey;

  if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    _cachedSecretKey = process.env.STRIPE_SECRET_KEY || '';
    _secretKeyExpiry = Date.now() + KEY_CACHE_TTL;
    return _cachedSecretKey;
  }

  const sessionToken = process.env.AWS_SESSION_TOKEN || '';
  const isProd = STRIPE_ENVIRONMENT === 'live';
  const paramName = encodeURIComponent(
    isProd
      ? '/brothers-beats/stripe-secret-key-prod'
      : '/brothers-beats/stripe-secret-key',
  );
  const url = `http://localhost:2773/systemsmanager/parameters/get?name=${paramName}&withDecryption=true`;

  const res = await fetch(url, {
    headers: { 'X-Aws-Parameters-Secrets-Token': sessionToken },
  });
  if (!res.ok) {
    throw new Error(
      `[Stripe] Failed to fetch secret key from SSM extension: ${res.status}`,
    );
  }
  const body = (await res.json()) as { Parameter: { Value: string } };
  _cachedSecretKey = body.Parameter.Value;
  _secretKeyExpiry = Date.now() + KEY_CACHE_TTL;
  return _cachedSecretKey;
}

let _cachedWebhookSecret: string | null = null;
let _webhookSecretExpiry = 0;

export async function getStripeWebhookSecret(): Promise<string> {
  if (_cachedWebhookSecret !== null && Date.now() < _webhookSecretExpiry)
    return _cachedWebhookSecret;

  if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    _cachedWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    _webhookSecretExpiry = Date.now() + KEY_CACHE_TTL;
    return _cachedWebhookSecret;
  }

  const sessionToken = process.env.AWS_SESSION_TOKEN || '';
  const isProd = STRIPE_ENVIRONMENT === 'live';
  const paramName = encodeURIComponent(
    isProd
      ? '/brothers-beats/stripe-webhook-secret-prod'
      : '/brothers-beats/stripe-webhook-secret',
  );
  const url = `http://localhost:2773/systemsmanager/parameters/get?name=${paramName}&withDecryption=true`;

  try {
    const res = await fetch(url, {
      headers: { 'X-Aws-Parameters-Secrets-Token': sessionToken },
    });
    if (!res.ok) {
      console.warn(`[Stripe] Could not fetch webhook secret: ${res.status}`);
      _cachedWebhookSecret = '';
    } else {
      const body = (await res.json()) as { Parameter: { Value: string } };
      _cachedWebhookSecret = body.Parameter.Value;
    }
  } catch {
    _cachedWebhookSecret = '';
  }
  _webhookSecretExpiry = Date.now() + KEY_CACHE_TTL;
  return _cachedWebhookSecret;
}

let _stripeClient: Stripe | null = null;
let _stripeClientKey: string | null = null;

async function getStripeClient(): Promise<Stripe> {
  const key = await getStripeSecretKey();
  if (!key) throw new Error('Stripe is not configured (missing secret key)');
  if (_stripeClient && _stripeClientKey === key) return _stripeClient;
  _stripeClient = new Stripe(key);
  _stripeClientKey = key;
  return _stripeClient;
}

export function isConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
}

// ── Checkout Session ──

export interface CreateCheckoutSessionInput {
  bookingId: string;
  eventId: string;
  eventTitle: string;
  ticketTierName: string;
  quantity: number;
  unitAmountMinor: number;
  totalAmountMinor: number;
  currency: string;
  buyerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutSessionOutput {
  sessionId: string;
  checkoutUrl: string;
}

export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<CreateCheckoutSessionOutput> {
  const stripe = await getStripeClient();

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      customer_email: input.buyerEmail,
      line_items: [
        {
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.unitAmountMinor,
            product_data: {
              name: `${input.eventTitle} — ${input.ticketTierName}`,
            },
          },
          quantity: input.quantity,
        },
      ],
      metadata: {
        bookingId: input.bookingId,
        eventId: input.eventId,
      },
      payment_intent_data: {
        metadata: {
          bookingId: input.bookingId,
          eventId: input.eventId,
        },
      },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min hard cap (Stripe minimum)
    },
    { idempotencyKey: `checkout-${input.bookingId}` },
  );

  return {
    sessionId: session.id,
    checkoutUrl: session.url || '',
  };
}

export async function expireCheckoutSession(
  providerSessionId: string,
): Promise<void> {
  const stripe = await getStripeClient();
  try {
    await stripe.checkout.sessions.expire(providerSessionId);
  } catch (err) {
    // Already expired/completed — non-fatal
    console.warn('[Stripe] expireCheckoutSession:', err);
  }
}

export async function retrieveCheckoutSession(
  providerSessionId: string,
): Promise<Stripe.Checkout.Session> {
  const stripe = await getStripeClient();
  return stripe.checkout.sessions.retrieve(providerSessionId);
}

// ── Refunds ──

export interface CreateRefundInput {
  paymentIntentId: string;
  amountMinor: number;
  reason?: string;
  idempotencyKey: string;
}

export interface CreateRefundOutput {
  refundId: string;
  status: string;
}

export async function createRefund(
  input: CreateRefundInput,
): Promise<CreateRefundOutput> {
  const stripe = await getStripeClient();
  const refund = await stripe.refunds.create(
    {
      payment_intent: input.paymentIntentId,
      amount: input.amountMinor,
      metadata: input.reason ? { reason: input.reason } : undefined,
    },
    { idempotencyKey: input.idempotencyKey },
  );
  return { refundId: refund.id, status: refund.status || 'unknown' };
}

export async function getRefund(providerRefundId: string) {
  const stripe = await getStripeClient();
  return stripe.refunds.retrieve(providerRefundId);
}

// ── Webhook verification ──

export interface VerifiedStripeEvent {
  id: string;
  type: string;
  data: Stripe.Event.Data;
}

export async function verifyWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string,
): Promise<VerifiedStripeEvent> {
  const stripe = await getStripeClient();
  const webhookSecret = await getStripeWebhookSecret();
  if (!webhookSecret) throw new Error('Stripe webhook secret not configured');

  const event = stripe.webhooks.constructEvent(
    rawBody,
    signatureHeader,
    webhookSecret,
  );
  return { id: event.id, type: event.type, data: event.data };
}
