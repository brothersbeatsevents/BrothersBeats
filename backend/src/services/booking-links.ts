// Guest booking access uses random bearer tokens; only their hashes are stored.
import crypto from 'crypto';
import { db } from '../store';
import type { BookingAccessTokenEntity } from '../types';

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function tokenHash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createBookingToken(bookingId: string, ttlMs = 30 * 60 * 1000): Promise<string> {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) throw new Error('Invalid booking link lifetime');
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + ttlMs;
  await db.put('bookingAccessTokens', {
    id: tokenHash(token), bookingId, expiresAt, ttl: Math.ceil(expiresAt / 1000),
  } satisfies BookingAccessTokenEntity);
  return token;
}

export async function verifyBookingToken(token: string): Promise<{ bookingId: string } | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const record = await db.get<BookingAccessTokenEntity>('bookingAccessTokens', tokenHash(token));
  if (!record || !Number.isFinite(record.expiresAt) || record.expiresAt <= Date.now()) return null;
  return { bookingId: record.bookingId };
}

// Ticket emails remain useful until one week after the event; lookup links last 30 minutes.
export async function createBookingTicketUrl(bookingId: string, eventStartDateTime: string): Promise<string> {
  const eventStart = Date.parse(eventStartDateTime);
  const ttlMs = Number.isFinite(eventStart) ? Math.max(WEEK_MS, eventStart + WEEK_MS - Date.now()) : WEEK_MS;
  const token = await createBookingToken(bookingId, ttlMs);
  return `${FRONTEND_URL}/booking/confirmation?token=${token}`;
}
