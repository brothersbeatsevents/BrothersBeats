import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseScannedCode } from '../services/checkin';
import { buildQrContent, signTicket } from '../services/tickets';

const ticketId = 'ticket-123e4567-e89b-12d3-a456-426614174000';

test('a genuine ticket QR resolves to its ticket id', () => {
  assert.deepEqual(parseScannedCode(buildQrContent(ticketId)), { kind: 'qr', ticketId });
});

test('a QR with a forged signature is rejected', () => {
  assert.equal(parseScannedCode(`bbe_ticket:${ticketId}:${'0'.repeat(32)}`), null);
});

test('a QR whose id was swapped after signing is rejected', () => {
  const other = 'ticket-00000000-0000-0000-0000-000000000000';
  assert.equal(parseScannedCode(`bbe_ticket:${other}:${signTicket(ticketId)}`), null);
});

test('a truncated signature is rejected', () => {
  assert.equal(parseScannedCode(`bbe_ticket:${ticketId}:${signTicket(ticketId).slice(0, 8)}`), null);
});

test('a printed ticket number is accepted case-insensitively', () => {
  assert.deepEqual(parseScannedCode(' bbe-20261011-a1b2c3 '), { kind: 'ticketNumber', ticketNumber: 'BBE-20261011-A1B2C3' });
});

test('garbage and non-strings are rejected', () => {
  assert.equal(parseScannedCode('https://example.com'), null);
  assert.equal(parseScannedCode(undefined), null);
  assert.equal(parseScannedCode(42), null);
});
