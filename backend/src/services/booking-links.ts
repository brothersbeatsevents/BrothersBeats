// ──────────────────────────────────────────
// Signed magic links for guest booking lookup (no personal data encoded).
// ──────────────────────────────────────────

import crypto from 'crypto';

const SECRET =
  process.env.TICKET_SIGNING_SECRET || 'local-dev-signing-secret-change-me';

export function signBookingToken(bookingId: string, ttlMs = 30 * 60 * 1000): string {
  const expiresAt = Date.now() + ttlMs;
  const payload = `${bookingId}.${expiresAt}`;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export function verifyBookingToken(token: string): { bookingId: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split('.');
    if (parts.length !== 3) return null;
    const [bookingId, expiresAtStr, sig] = parts;
    const expected = crypto
      .createHmac('sha256', SECRET)
      .update(`${bookingId}.${expiresAtStr}`)
      .digest('hex');
    if (
      sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return null;
    }
    if (Date.now() > Number(expiresAtStr)) return null;
    return { bookingId };
  } catch {
    return null;
  }
}
