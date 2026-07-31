// ──────────────────────────────────────────
// Digital Ticket Generation
// Ticket numbers, signed QR verification hashes, QR images, and ticket PDFs.
// ──────────────────────────────────────────

import crypto from 'crypto';
import QRCode from 'qrcode';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { uploadBuffer } from './s3';
import { TicketEntity, EventEntity } from '../types';

const TICKET_SIGNING_SECRET =
  process.env.TICKET_SIGNING_SECRET || 'brothers-beats-local-dev-secret';

export function generateTicketNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `BBE-${date}-${suffix}`;
}

// Signed token — does not encode any personal data, only a signature over the ticketId.
export function signTicket(ticketId: string): string {
  return crypto
    .createHmac('sha256', TICKET_SIGNING_SECRET)
    .update(ticketId)
    .digest('hex')
    .slice(0, 32);
}

export function verifyTicketSignature(
  ticketId: string,
  signature: string,
): boolean {
  const expected = signTicket(ticketId);
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature.padEnd(expected.length, '0').slice(0, expected.length)),
  );
}

export function buildQrContent(ticketId: string): string {
  return `bbe_ticket:${ticketId}:${signTicket(ticketId)}`;
}

// Generates a QR PNG for the ticket and uploads it to S3. Returns the S3 key.
export async function generateAndStoreQrCode(
  ticketId: string,
): Promise<string> {
  const content = buildQrContent(ticketId);
  const pngBuffer = await QRCode.toBuffer(content, {
    type: 'png',
    width: 400,
    margin: 2,
  });
  const key = `tickets/qr/${ticketId}.png`;
  await uploadBuffer(key, pngBuffer, 'image/png');
  return key;
}

// Generates a simple one-page ticket PDF (event details + QR) and uploads it.
export async function generateAndStoreTicketPdf(
  ticket: TicketEntity,
  event: EventEntity,
  buyerName: string,
): Promise<string> {
  const content = buildQrContent(ticket.id);
  const qrDataUrl = await QRCode.toDataURL(content, { width: 300, margin: 2 });
  const qrPngBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([420, 600]);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const qrImage = await pdfDoc.embedPng(qrPngBytes);

  const orange = rgb(1, 0.369, 0.188); // #FF5E30
  const dark = rgb(0.133, 0.114, 0.098); // #221D19
  const muted = rgb(0.38, 0.365, 0.349); // #615D59

  page.drawRectangle({ x: 0, y: 560, width: 420, height: 40, color: orange });
  page.drawText('Brothers Beats Events', {
    x: 20,
    y: 572,
    size: 16,
    font,
    color: rgb(1, 1, 1),
  });

  page.drawText(event.title, { x: 20, y: 520, size: 18, font, color: dark });
  const start = new Date(event.startDateTime);
  page.drawText(
    start.toLocaleString('en-IE', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: event.timezone || 'Europe/Dublin',
    }),
    { x: 20, y: 498, size: 11, font: bodyFont, color: muted },
  );
  page.drawText(`${event.venueName}${event.city ? `, ${event.city}` : ''}`, {
    x: 20,
    y: 482,
    size: 11,
    font: bodyFont,
    color: muted,
  });

  page.drawText(`Attendee: ${ticket.attendeeName || buyerName}`, {
    x: 20,
    y: 450,
    size: 12,
    font: bodyFont,
    color: dark,
  });
  page.drawText(`Ticket: ${ticket.ticketNumber}`, {
    x: 20,
    y: 432,
    size: 12,
    font: bodyFont,
    color: dark,
  });

  page.drawImage(qrImage, { x: 110, y: 190, width: 200, height: 200 });
  page.drawText('Present this QR code at entry', {
    x: 110,
    y: 170,
    size: 10,
    font: bodyFont,
    color: muted,
  });

  const pdfBytes = await pdfDoc.save();
  const key = `tickets/pdf/${ticket.id}.pdf`;
  await uploadBuffer(key, Buffer.from(pdfBytes), 'application/pdf');
  return key;
}
