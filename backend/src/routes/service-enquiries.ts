// ──────────────────────────────────────────
// POST /api/service-enquiries — paid private-event management enquiry
// Public, rate-limited (see server.ts). Never creates a public event, ticket
// tier, booking, invoice, or payment automatically — informational only.
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../store';
import { EventServiceEnquiryEntity } from '../types';
import { sendAdminAlert } from '../services/email';
import { isValidOptionalPhone, PHONE_ERROR } from '../services/phone-validation';
import { getEnquiryDateError } from '../services/enquiry-date-validation';
import {
  validateServiceEnquiryInput,
  resolveEventServiceType,
  resolveGuestCount,
} from '../services/service-enquiry-validation';

const router = Router();

router.post('/', async (req, res: Response): Promise<void> => {
  const {
    eventServiceType,
    fullName,
    email,
    phone,
    preferredDate,
    preferredDateEnd,
    venueOrCity,
    estimatedGuestCount,
    budgetRange,
    message,
    consentToContact,
    source,
  } = req.body;

  const validationError = validateServiceEnquiryInput({ fullName, email, message, consentToContact });
  if (validationError) {
    res.status(400).json({ success: false, error: validationError });
    return;
  }

  if (!isValidOptionalPhone(phone)) {
    res.status(400).json({ success: false, error: PHONE_ERROR });
    return;
  }

  const dateError = getEnquiryDateError(preferredDate) || getEnquiryDateError(preferredDateEnd);
  if (dateError) {
    res.status(400).json({ success: false, error: dateError });
    return;
  }
  if (preferredDateEnd && (!preferredDate || preferredDateEnd < preferredDate)) {
    res.status(400).json({ success: false, error: 'End date must be the same as or later than the preferred date.' });
    return;
  }

  const resolvedServiceType = resolveEventServiceType(eventServiceType);
  const guestCount = resolveGuestCount(estimatedGuestCount);

  const now = new Date().toISOString();
  const enquiry: EventServiceEnquiryEntity = {
    id: `enquiry-${uuid()}`,
    eventServiceType: resolvedServiceType,
    status: 'NEW',
    fullName: fullName.trim(),
    email,
    normalizedEmail: email.trim().toLowerCase(),
    phone: typeof phone === 'string' ? phone.trim() : undefined,
    preferredDate: typeof preferredDate === 'string' ? preferredDate : undefined,
    preferredDateEnd: typeof preferredDateEnd === 'string' ? preferredDateEnd : undefined,
    venueOrCity: typeof venueOrCity === 'string' ? venueOrCity.trim() : undefined,
    estimatedGuestCount: guestCount,
    budgetRange: typeof budgetRange === 'string' ? budgetRange.trim() : undefined,
    message: message.trim(),
    consentToContact: true,
    source: source === 'CONTACT_PAGE' ? 'CONTACT_PAGE' : 'SERVICES_PAGE',
    created_at: now,
    updated_at: now,
  };

  await db.put('serviceEnquiries', enquiry);

  await sendAdminAlert(
    'New paid event-management enquiry',
    `Type: ${enquiry.eventServiceType}\nFrom: ${enquiry.fullName} <${enquiry.email}>\nPhone: ${enquiry.phone || '—'}\nPreferred date: ${enquiry.preferredDate || '—'}\nVenue/city: ${enquiry.venueOrCity || '—'}\nGuests: ${enquiry.estimatedGuestCount ?? '—'}\nBudget: ${enquiry.budgetRange || '—'}\n\n${enquiry.message}`,
  ).catch((err) => console.error('[ServiceEnquiries] Failed to send alert:', err));

  // Generic response — never confirms internal status or dedup details.
  res.json({
    success: true,
    message: "Thanks — we've received your enquiry and will be in touch soon.",
  });
});

export default router;
