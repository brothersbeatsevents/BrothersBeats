// ──────────────────────────────────────────
// Event-service enquiry input validation — shared between the public
// submission route and the automated test suite.
// ──────────────────────────────────────────

import { EventServiceType } from '../types';
import { validateEmail } from '../middleware/validate';

export const VALID_EVENT_SERVICE_TYPES: EventServiceType[] = [
  'BIRTHDAY',
  'PRIVATE_PARTY',
  'WEDDING',
  'CORPORATE',
  'COMMUNITY',
  'ENTERTAINMENT',
  'OTHER',
];

export interface ServiceEnquiryInput {
  eventServiceType?: unknown;
  fullName?: unknown;
  email?: unknown;
  message?: unknown;
  consentToContact?: unknown;
  estimatedGuestCount?: unknown;
}

/**
 * Validates the required fields of an incoming public enquiry submission.
 * Returns the first validation error, or null if the input is valid.
 */
export function validateServiceEnquiryInput(input: ServiceEnquiryInput): string | null {
  const { fullName, email, message, consentToContact } = input;

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    return 'Full name is required';
  }
  if (!validateEmail(email)) {
    return 'A valid email is required';
  }
  if (!message || typeof message !== 'string' || message.trim().length < 5 || message.length > 5000) {
    return 'Please describe your event in a bit more detail';
  }
  if (consentToContact !== true) {
    return 'Please confirm we can contact you about this enquiry';
  }
  return null;
}

export function resolveEventServiceType(value: unknown): EventServiceType {
  return typeof value === 'string' && VALID_EVENT_SERVICE_TYPES.includes(value as EventServiceType)
    ? (value as EventServiceType)
    : 'OTHER';
}

export function resolveGuestCount(value: unknown): number | undefined {
  return typeof value === 'number' && value > 0 && value <= 100_000 ? Math.round(value) : undefined;
}
