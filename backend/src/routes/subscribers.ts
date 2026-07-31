// ──────────────────────────────────────────
// Public newsletter subscription
// POST /api/subscribers              — subscribe (footer / checkout)
// POST /api/subscribers/unsubscribe  — one-click unsubscribe
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../store';
import { SubscriberEntity } from '../types';

const router = Router();

router.post('/', async (req, res: Response): Promise<void> => {
  const { email, fullName, categories, city, source } = req.body;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ success: false, error: 'Email is required' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date().toISOString();
  const existing = await db.findBy<SubscriberEntity>('subscribers', 'normalizedEmail', normalizedEmail);

  if (existing) {
    existing.status = 'SUBSCRIBED';
    existing.unsubscribedAt = undefined;
    existing.updated_at = now;
    if (fullName) existing.fullName = fullName;
    if (Array.isArray(categories)) existing.categories = categories;
    if (city) existing.city = city;
    await db.put('subscribers', existing);
    res.json({ success: true, message: 'You are subscribed!' });
    return;
  }

  const subscriber: SubscriberEntity = {
    id: `sub-${uuid()}`,
    email,
    normalizedEmail,
    fullName,
    status: 'SUBSCRIBED',
    categories: Array.isArray(categories) ? categories : undefined,
    city,
    source: source === 'CHECKOUT' || source === 'CUSTOMER_ACCOUNT' ? source : 'WEBSITE_FOOTER',
    consentTextVersion: '1.0',
    subscribedAt: now,
    created_at: now,
    updated_at: now,
  };
  await db.put('subscribers', subscriber);
  res.json({ success: true, message: 'You are subscribed!' });
});

router.post('/unsubscribe', async (req, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ success: false, error: 'Email is required' });
    return;
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await db.findBy<SubscriberEntity>('subscribers', 'normalizedEmail', normalizedEmail);
  if (existing) {
    existing.status = 'UNSUBSCRIBED';
    existing.unsubscribedAt = new Date().toISOString();
    existing.updated_at = existing.unsubscribedAt;
    await db.put('subscribers', existing);
  }
  // Always return success to avoid leaking subscription status
  res.json({ success: true, message: 'You have been unsubscribed.' });
});

export default router;
