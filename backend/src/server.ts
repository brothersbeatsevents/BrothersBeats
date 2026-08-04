import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { seedStore } from './seed/data';
import { sanitizeInput, blockSuspiciousPayloads } from './middleware/validate';

// Routes
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import pricingRoutes from './routes/pricing';
import checkoutRoutes from './routes/checkout';
import bookingRoutes from './routes/booking';
import meRoutes from './routes/me';
import subscriberRoutes from './routes/subscribers';
import contactRoutes from './routes/contact';
import mediaRoutes from './routes/media';
import galleryRoutes from './routes/gallery';
import serviceEnquiriesRoutes from './routes/service-enquiries';
import sesNotificationRoutes from './routes/ses-notifications';
import stripeWebhookRoutes from './routes/webhooks-stripe';
import settingsRoutes from './routes/settings';
import adminRoutes from './routes/admin';

const app = express();
const PORT = process.env.PORT || 4000;

// ── Trust API Gateway / ALB proxy so rate-limiter reads the correct IP ──
app.set('trust proxy', 1);

// ── Security headers (CSP, HSTS, X-Frame-Options, etc.) ──
app.use(helmet());

// ── CORS ──
const allowedOrigins = new Set(
  (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim()),
);
allowedOrigins.add('http://localhost:3000');
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.has(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

// ── Global rate limit: 100 req/min per IP ──
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'Too many requests. Please try again later.',
    },
  }),
);

// ── Stricter limit for auth endpoints: 10 req/15 min ──
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again later.',
  },
});

// ── Strict limit for checkout/payment endpoints: 10 req/15 min per IP ──
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many payment attempts. Please try again later.',
  },
});

// ── Limit for public enquiry/lookup-style endpoints: 5 req/15 min per IP ──
const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many submissions. Please try again later.',
  },
});

app.use(
  express.json({
    limit: '1mb',
    // Capture raw body bytes for Stripe webhook signature verification
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// ── Input sanitization & injection protection ──
app.use(sanitizeInput);
app.use(blockSuspiciousPayloads);

// Seed data on startup (in-memory store for local dev only)
if (!process.env.USE_DYNAMODB) {
  seedStore();
}

// Health check — minimal response (no env details exposed publicly)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/checkout', paymentLimiter, checkoutRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/me', meRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/service-enquiries', enquiryLimiter, serviceEnquiriesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);
// SNS sends Content-Type: text/plain — parse as text before JSON sanitisation
app.use(
  '/api/webhooks/ses-notifications',
  express.text({ type: ['text/plain', 'application/json'] }),
  sesNotificationRoutes,
);
app.use('/api/webhooks/stripe', stripeWebhookRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Start server (only when running directly, not in Lambda)
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(PORT, () => {
    console.log(`\n🎟️  Brothers Beats Events API running at http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
    console.log(`\n📋 Key endpoints:`);
    console.log(`   GET  /api/events               — Published events`);
    console.log(`   GET  /api/events/:slug         — Event detail + ticket tiers`);
    console.log(`   POST /api/pricing/quote        — Price preview`);
    console.log(`   POST /api/checkout/session     — Reserve inventory + Stripe Checkout`);
    console.log(`   GET  /api/me                   — Current customer profile`);
    console.log(`   GET  /api/me/bookings          — My bookings`);
    console.log(`   GET  /api/admin/reports/dashboard — Admin dashboard`);
    console.log(`\n🔑 Test accounts (seeded for local dev):`);
    console.log(`   Super Admin: superadmin@brothersbeats.events`);
    console.log(`   Admin:       admin@brothersbeats.events`);
    console.log(`   Customer:    alex@example.com\n`);
  });
}

export default app;

