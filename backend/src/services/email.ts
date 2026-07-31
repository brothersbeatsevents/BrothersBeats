// ──────────────────────────────────────────
// SES Email Service — Brothers Beats Events transactional emails
// Free tier: 62,000 emails/month when sent from Lambda
// ──────────────────────────────────────────

import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { db } from '../store';

const REGION =
  process.env.AWS_REGION || process.env.AWS_REGION_OVERRIDE || 'eu-west-1';
const FROM_EMAIL = process.env.SES_FROM_EMAIL || '';
const CONFIG_SET = process.env.SES_CONFIGURATION_SET || '';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')[0]
  .trim();
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@brothersbeats.events';

const sesClient = new SESv2Client({ region: REGION });

// ── Core send function ──

async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
  textBody?: string,
): Promise<boolean> {
  if (!FROM_EMAIL) {
    console.warn('[SES] SES_FROM_EMAIL not set — skipping email');
    return false;
  }

  // Check suppression list (hard bounces + complaints)
  try {
    const suppressed = await db.get(
      'emailSuppressions',
      `suppressed-${to.toLowerCase().trim()}`,
    );
    if (suppressed) {
      console.warn('[SES] Skipping suppressed address:', to);
      return false;
    }
  } catch (err) {
    console.warn('[SES] Suppression check failed (proceeding with send):', err);
  }

  try {
    await sesClient.send(
      new SendEmailCommand({
        FromEmailAddress: FROM_EMAIL,
        Destination: { ToAddresses: [to] },
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: htmlBody, Charset: 'UTF-8' },
              ...(textBody
                ? { Text: { Data: textBody, Charset: 'UTF-8' } }
                : {}),
            },
          },
        },
        ...(CONFIG_SET ? { ConfigurationSetName: CONFIG_SET } : {}),
      }),
    );
    return true;
  } catch (error) {
    console.error('[SES] Failed to send email:', error);
    return false;
  }
}

// ── HTML escaping for email content ──
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountMinor / 100);
}

function formatEventDate(iso: string, timezone = 'Europe/Dublin'): string {
  return new Date(iso).toLocaleDateString('en-IE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone,
  });
}

function formatEventTime(iso: string, timezone = 'Europe/Dublin'): string {
  return new Date(iso).toLocaleTimeString('en-IE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  });
}

function buildGoogleCalendarUrl(event: {
  title: string;
  startDateTime: string;
  endDateTime?: string;
  venueName?: string;
  slug?: string;
}): string {
  const fmt = (iso: string) =>
    iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '').replace('Z', 'Z');
  const start = fmt(event.startDateTime);
  const end = event.endDateTime ? fmt(event.endDateTime) : start;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    ...(event.venueName ? { location: event.venueName } : {}),
    ...(event.slug ? { details: `${FRONTEND_URL}/events/${event.slug}` } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ── Brand template (Brothers Beats Events palette: green #087A3E / orange #FF5E30) ──

const baseStyles = `font-family:'Inter',Arial,sans-serif; color:#221D19; line-height:1.6;`;

function wrapInTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#FFFDF8;">
  <div style="max-width:600px; margin:0 auto; padding:32px 24px; ${baseStyles}">
    <div style="text-align:center; margin-bottom:24px;">
      <h2 style="color:#FF5E30; font-family:'Space Grotesk',Arial,sans-serif; margin:0; letter-spacing:-0.02em;">
        Brothers Beats Events
      </h2>
    </div>
    <div style="background:#ffffff; border-radius:10px; padding:32px; border:1px solid #EDE7DC;">
      ${content}
    </div>
    <div style="text-align:center; margin-top:24px; font-size:12px; color:#615D59;">
      <p>Brothers Beats Events</p>
      <p><a href="${FRONTEND_URL}" style="color:#087A3E;">brothersbeats.events</a></p>
    </div>
  </div>
</body>
</html>`;
}

function ctaButton(label: string, url: string, color = '#FF5E30'): string {
  return `
    <div style="text-align:center; margin:24px 0;">
      <a href="${escapeHtml(url)}" style="background:${color}; color:#fff; padding:12px 32px; border-radius:6px; text-decoration:none; font-weight:bold; display:inline-block;">
        ${escapeHtml(label)}
      </a>
    </div>`;
}

function eventSummaryBlock(event: {
  title: string;
  startDateTime: string;
  venueName?: string;
  city?: string;
  timezone?: string;
}): string {
  return `
    <div style="background:#FFFDF8; border-radius:8px; padding:20px; margin:16px 0; border-left:4px solid #087A3E;">
      <h2 style="margin:0 0 8px; color:#221D19; font-family:'Space Grotesk',Arial,sans-serif; font-size:22px;">
        ${escapeHtml(event.title)}
      </h2>
      <p style="margin:4px 0; font-size:14px; color:#221D19;">
        &#128197; ${escapeHtml(formatEventDate(event.startDateTime, event.timezone))} at ${escapeHtml(formatEventTime(event.startDateTime, event.timezone))}
      </p>
      ${event.venueName ? `<p style="margin:4px 0; font-size:14px; color:#221D19;">&#128205; ${escapeHtml(event.venueName)}${event.city ? `, ${escapeHtml(event.city)}` : ''}</p>` : ''}
    </div>`;
}

// ── Public API ──

export function isConfigured(): boolean {
  return !!FROM_EMAIL;
}

export async function sendWelcomeEmail(
  to: string,
  displayName: string,
): Promise<boolean> {
  const subject = `Welcome to Brothers Beats Events!`;
  const content = `
    <h3 style="color:#087A3E; margin-top:0;">Hi ${escapeHtml(displayName)},</h3>
    <p>Welcome to Brothers Beats Events. Your account is ready to go.</p>
    <p>Browse upcoming events, book tickets in a few clicks, and manage everything from your account dashboard.</p>
    ${ctaButton('Browse Events', `${FRONTEND_URL}/events`)}
  `;
  return sendEmail(to, subject, wrapInTemplate(content));
}

export async function sendAdminAlert(subject: string, message: string): Promise<boolean> {
  const content = `
    <h3 style="color:#FF5E30; margin-top:0;">Admin Alert</h3>
    <p>${escapeHtml(message)}</p>
    <p style="font-size:12px; color:#615D59;">Timestamp: ${new Date().toISOString()}</p>
  `;
  return sendEmail(FROM_EMAIL, `[Brothers Beats Admin] ${subject}`, wrapInTemplate(content));
}

export async function sendPasswordReset(
  to: string,
  displayName: string,
  resetLink: string,
): Promise<boolean> {
  const subject = `Reset your password — Brothers Beats Events`;
  const content = `
    <h3 style="color:#087A3E; margin-top:0;">Password Reset Request</h3>
    <p>Hi ${escapeHtml(displayName)},</p>
    <p>We received a request to reset your password. Click the button below to create a new one:</p>
    ${ctaButton('Reset Password', resetLink, '#087A3E')}
    <p style="font-size:12px; color:#615D59;">If you didn't request this, please ignore this email. This link expires in 1 hour.</p>
  `;
  return sendEmail(to, subject, wrapInTemplate(content));
}

export async function sendBookingConfirmation(
  to: string,
  buyerName: string,
  booking: { bookingReference: string; quantity: number; totalAmountMinor: number; currency: string },
  event: { title: string; startDateTime: string; venueName: string; city: string; timezone: string; slug: string },
): Promise<boolean> {
  const subject = `Booking confirmed: ${event.title}`;
  const calUrl = buildGoogleCalendarUrl(event);
  const content = `
    <h3 style="color:#087A3E; margin-top:0;">Hi ${escapeHtml(buyerName)}, you're going!</h3>
    <p>Your booking <strong>${escapeHtml(booking.bookingReference)}</strong> for ${booking.quantity} ticket${booking.quantity > 1 ? 's' : ''} is confirmed.</p>
    ${eventSummaryBlock(event)}
    <p style="font-size:14px;">Total paid: <strong>${formatMoney(booking.totalAmountMinor, booking.currency)}</strong></p>
    <p style="font-size:13px; color:#615D59;">Your tickets are attached in a follow-up email and always available in your account.</p>
    ${ctaButton('Add to Google Calendar', calUrl, '#087A3E')}
    ${ctaButton('View My Bookings', `${FRONTEND_URL}/account/tickets/${booking.bookingReference}`)}
  `;
  return sendEmail(to, subject, wrapInTemplate(content));
}

export async function sendTicketDelivery(
  to: string,
  buyerName: string,
  tickets: Array<{ ticketNumber: string }>,
  event: { title: string; startDateTime: string; venueName: string; city: string; timezone: string; slug: string },
  bookingReference: string,
  isResend = false,
): Promise<boolean> {
  const subject = `${isResend ? 'Your tickets (resent): ' : 'Your tickets: '}${event.title}`;
  const rows = tickets
    .map(
      (t) => `
      <tr>
        <td style="padding:10px 16px; font-family:monospace; font-size:15px; font-weight:bold; color:#087A3E; letter-spacing:0.05em;">${escapeHtml(t.ticketNumber)}</td>
        <td style="padding:10px 16px; font-size:14px; color:#221D19;">1 &times; Admission</td>
      </tr>`,
    )
    .join('');
  const content = `
    <h3 style="color:#087A3E; margin-top:0;">Hi ${escapeHtml(buyerName)},</h3>
    <p>Here ${tickets.length > 1 ? 'are your tickets' : 'is your ticket'} for:</p>
    ${eventSummaryBlock(event)}
    <table style="width:100%; border-collapse:collapse; background:#fff; border:1px solid #EDE7DC; border-radius:6px; overflow:hidden;">
      <thead>
        <tr style="background:#087A3E;">
          <th style="padding:10px 16px; text-align:left; color:#fff; font-size:12px; text-transform:uppercase; letter-spacing:0.08em;">Ticket Number</th>
          <th style="padding:10px 16px; text-align:left; color:#fff; font-size:12px; text-transform:uppercase; letter-spacing:0.08em;">Type</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:16px; font-size:13px; color:#615D59;">Download your PDF tickets (with QR codes) from your account, or present the QR code from your account on your phone at entry.</p>
    ${ctaButton('View & Download Tickets', `${FRONTEND_URL}/account/tickets/${bookingReference}`)}
    <p style="font-size:12px; color:#615D59; text-align:center;">Questions? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#087A3E;">${SUPPORT_EMAIL}</a></p>
  `;
  return sendEmail(to, subject, wrapInTemplate(content));
}

export async function sendPaymentFailed(
  to: string,
  buyerName: string,
  eventTitle: string,
  bookingReference: string,
): Promise<boolean> {
  const subject = `Payment issue with your booking — ${eventTitle}`;
  const content = `
    <h3 style="color:#FF5E30; margin-top:0;">Hi ${escapeHtml(buyerName)},</h3>
    <p>We couldn't process payment for your booking <strong>${escapeHtml(bookingReference)}</strong> for <strong>${escapeHtml(eventTitle)}</strong>.</p>
    <p>Your reserved tickets have been released. If you'd still like to attend, please start a new booking — tickets are subject to availability.</p>
    ${ctaButton('Browse Events', `${FRONTEND_URL}/events`)}
  `;
  return sendEmail(to, subject, wrapInTemplate(content));
}

export async function sendReservationExpired(
  to: string,
  buyerName: string,
  eventTitle: string,
  eventSlug: string,
): Promise<boolean> {
  const subject = `Your reservation expired — ${eventTitle}`;
  const content = `
    <h3 style="color:#615D59; margin-top:0;">Hi ${escapeHtml(buyerName)},</h3>
    <p>Your ticket reservation for <strong>${escapeHtml(eventTitle)}</strong> expired before payment was completed, so your tickets were released back for sale.</p>
    ${ctaButton('Try Again', `${FRONTEND_URL}/events/${eventSlug}`)}
  `;
  return sendEmail(to, subject, wrapInTemplate(content));
}

export async function sendEventReminder(
  to: string,
  attendeeName: string,
  event: { title: string; startDateTime: string; venueName: string; city: string; timezone: string; slug: string },
  bookingReference: string,
): Promise<boolean> {
  const hoursAway = Math.round(
    (new Date(event.startDateTime).getTime() - Date.now()) / (60 * 60 * 1000),
  );
  const label = hoursAway <= 30 ? 'tomorrow' : `in ${Math.round(hoursAway / 24)} days`;
  const subject = `Reminder: ${event.title} is ${label}`;
  const calUrl = buildGoogleCalendarUrl(event);
  const content = `
    <h3 style="color:#087A3E; margin-top:0;">Hi ${escapeHtml(attendeeName)},</h3>
    <p>Just a friendly reminder — <strong>${escapeHtml(event.title)}</strong> is coming up ${label}!</p>
    ${eventSummaryBlock(event)}
    ${ctaButton('Add to Google Calendar', calUrl, '#087A3E')}
    ${ctaButton('View My Tickets', `${FRONTEND_URL}/account/tickets/${bookingReference}`)}
  `;
  return sendEmail(to, subject, wrapInTemplate(content));
}

export async function sendEventUpdated(
  to: string,
  buyerName: string,
  event: { title: string; startDateTime: string; venueName: string; city: string; timezone: string; slug: string },
  bookingReference: string,
  changeSummary: string,
): Promise<boolean> {
  const subject = `Event update: ${event.title}`;
  const content = `
    <h3 style="color:#087A3E; margin-top:0;">Hi ${escapeHtml(buyerName)},</h3>
    <p>There's an update to an event you have tickets for:</p>
    <p style="background:#FFF7E8; border-radius:6px; padding:12px 16px; font-size:14px;">${escapeHtml(changeSummary)}</p>
    ${eventSummaryBlock(event)}
    ${ctaButton('View Booking', `${FRONTEND_URL}/account/tickets/${bookingReference}`)}
  `;
  return sendEmail(to, subject, wrapInTemplate(content));
}

export async function sendEventCancelled(
  to: string,
  buyerName: string,
  eventTitle: string,
  cancellationMessage: string,
  bookingReference: string,
): Promise<boolean> {
  const subject = `Event cancelled: ${eventTitle}`;
  const content = `
    <h3 style="color:#FF5E30; margin-top:0;">Hi ${escapeHtml(buyerName)},</h3>
    <p><strong>${escapeHtml(eventTitle)}</strong> has been cancelled.</p>
    <p style="background:#FFF7E8; border-radius:6px; padding:12px 16px; font-size:14px;">${escapeHtml(cancellationMessage)}</p>
    <p>A full refund is being processed automatically for booking <strong>${escapeHtml(bookingReference)}</strong>.</p>
  `;
  return sendEmail(to, subject, wrapInTemplate(content));
}

export async function sendRefundRequested(
  to: string,
  buyerName: string,
  eventTitle: string,
  amountMinor: number,
  currency: string,
): Promise<boolean> {
  const subject = `Refund requested — ${eventTitle}`;
  const content = `
    <h3 style="color:#087A3E; margin-top:0;">Hi ${escapeHtml(buyerName)},</h3>
    <p>We've received your refund request for <strong>${escapeHtml(eventTitle)}</strong> (${formatMoney(amountMinor, currency)}). We'll confirm once it's processed.</p>
  `;
  return sendEmail(to, subject, wrapInTemplate(content));
}

export async function sendRefundCompleted(
  to: string,
  buyerName: string,
  eventTitle: string,
  amountMinor: number,
  currency: string,
): Promise<boolean> {
  const subject = `Refund completed — ${eventTitle}`;
  const content = `
    <h3 style="color:#087A3E; margin-top:0;">Hi ${escapeHtml(buyerName)},</h3>
    <p>Your refund of <strong>${formatMoney(amountMinor, currency)}</strong> for <strong>${escapeHtml(eventTitle)}</strong> has been completed and should appear on your original payment method within 5-10 business days.</p>
  `;
  return sendEmail(to, subject, wrapInTemplate(content));
}

export async function sendRefundFailed(
  to: string,
  buyerName: string,
  eventTitle: string,
): Promise<boolean> {
  const subject = `Refund issue — ${eventTitle}`;
  const content = `
    <h3 style="color:#FF5E30; margin-top:0;">Hi ${escapeHtml(buyerName)},</h3>
    <p>We ran into an issue processing your refund for <strong>${escapeHtml(eventTitle)}</strong>. Our team has been notified and will follow up by email at <a href="mailto:${SUPPORT_EMAIL}" style="color:#087A3E;">${SUPPORT_EMAIL}</a>.</p>
  `;
  return sendEmail(to, subject, wrapInTemplate(content));
}

export async function sendBookingLookupLink(
  to: string,
  buyerName: string,
  link: string,
): Promise<boolean> {
  const subject = `Your booking link — Brothers Beats Events`;
  const content = `
    <h3 style="color:#087A3E; margin-top:0;">Hi ${escapeHtml(buyerName)},</h3>
    <p>Here's the link you requested to view your booking:</p>
    ${ctaButton('View My Booking', link)}
    <p style="font-size:12px; color:#615D59;">This link expires in 30 minutes and can only be used once requested.</p>
  `;
  return sendEmail(to, subject, wrapInTemplate(content));
}

export async function sendCampaignEmail(
  to: string,
  campaign: { subject: string; preheader?: string; heading: string; body: string; ctaLabel?: string; ctaUrl?: string; heroImageUrl?: string },
  unsubscribeUrl: string,
): Promise<boolean> {
  const content = `
    ${campaign.heroImageUrl ? `<img src="${escapeHtml(campaign.heroImageUrl)}" style="width:100%; border-radius:8px; margin-bottom:16px;" />` : ''}
    <h3 style="color:#087A3E; margin-top:0;">${escapeHtml(campaign.heading)}</h3>
    <div style="font-size:14px; color:#221D19; white-space:pre-wrap;">${escapeHtml(campaign.body)}</div>
    ${campaign.ctaLabel && campaign.ctaUrl ? ctaButton(campaign.ctaLabel, campaign.ctaUrl) : ''}
    <p style="font-size:11px; color:#615D59; text-align:center; margin-top:24px;">
      <a href="${escapeHtml(unsubscribeUrl)}" style="color:#615D59;">Unsubscribe from these emails</a>
    </p>
  `;
  return sendEmail(to, campaign.subject, wrapInTemplate(content));
}
