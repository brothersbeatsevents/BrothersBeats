// ──────────────────────────────────────────
// POST /api/contact — public contact form, stored in the admin enquiries inbox
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../store';
import { EventServiceEnquiryEntity, EventServiceType } from '../types';
import { validateEmail } from '../middleware/validate';

const router = Router();

router.post('/', async (req, res: Response): Promise<void> => {
  const { name, email, message, contactReason, phone, website, formStartedAt } = req.body;
  if (website || (typeof formStartedAt === 'number' && Date.now() - formStartedAt < 2000)) {
    res.status(400).json({ success: false, error: 'Invalid request' });
    return;
  }
  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.length > 160 || !validateEmail(email) || !message) {
    res.status(400).json({ success: false, error: 'Name, email, and message are required' });
    return;
  }
  if (typeof message !== 'string' || message.trim().length < 5 || message.length > 5000) {
    res.status(400).json({ success: false, error: 'Message is too long' });
    return;
  }

  const validReasons: EventServiceType[] = [
    'SPONSORSHIP',
    'PERFORMER',
    'PARTNERSHIP',
    'ORGANISE_EVENT',
    'PERSONAL_PARTY',
    'GENERAL_ENQUIRY',
  ];
  if (!validReasons.includes(contactReason)) {
    res.status(400).json({ success: false, error: 'Please select a valid contact reason' });
    return;
  }
  const eventServiceType = contactReason;
  const now = new Date().toISOString();
  const enquiry: EventServiceEnquiryEntity = {
    id: `enquiry-${uuid()}`,
    eventServiceType,
    status: 'NEW',
    fullName: name.trim(),
    email,
    normalizedEmail: email.trim().toLowerCase(),
    phone: typeof phone === 'string' && phone.trim().length <= 40 ? phone.trim() : undefined,
    message: message.trim(),
    consentToContact: true,
    source: 'CONTACT_PAGE',
    created_at: now,
    updated_at: now,
  };
  await db.put('serviceEnquiries', enquiry);

  res.json({ success: true, message: 'Thanks for reaching out — we\'ll be in touch soon.' });
});

export default router;
