// ──────────────────────────────────────────
// Door check-in: decode what a scanner/manual entry gives us into a ticket lookup.
// ──────────────────────────────────────────

import { verifyTicketSignature } from './tickets';

export type TicketLookup =
  | { kind: 'qr'; ticketId: string }
  | { kind: 'ticketNumber'; ticketNumber: string }
  | null;

const QR_PATTERN = /^bbe_ticket:(ticket-[0-9a-fA-F-]{36}):([0-9a-f]{32})$/;
const TICKET_NUMBER_PATTERN = /^BBE-\d{8}-[0-9A-F]{6}$/;

/** Returns null for malformed input or a QR whose signature does not verify. */
export function parseScannedCode(raw: unknown): TicketLookup {
  if (typeof raw !== 'string') return null;
  const code = raw.trim();

  const qr = QR_PATTERN.exec(code);
  if (qr) {
    return verifyTicketSignature(qr[1], qr[2]) ? { kind: 'qr', ticketId: qr[1] } : null;
  }

  // Fallback for staff typing the number printed on the ticket.
  const number = code.toUpperCase();
  if (TICKET_NUMBER_PATTERN.test(number)) return { kind: 'ticketNumber', ticketNumber: number };

  return null;
}
