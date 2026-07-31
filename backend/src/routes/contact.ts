// ──────────────────────────────────────────
// POST /api/contact — public contact form, forwarded to the support inbox
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { sendAdminAlert } from '../services/email';

const router = Router();

router.post('/', async (req, res: Response): Promise<void> => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    res.status(400).json({ success: false, error: 'Name, email, and message are required' });
    return;
  }
  if (typeof message !== 'string' || message.length > 5000) {
    res.status(400).json({ success: false, error: 'Message is too long' });
    return;
  }

  await sendAdminAlert(
    'New contact form submission',
    `From: ${name} <${email}>\n\n${message}`,
  ).catch((err) => console.error('[Contact] Failed to send alert:', err));

  res.json({ success: true, message: 'Thanks for reaching out — we\'ll be in touch soon.' });
});

export default router;
