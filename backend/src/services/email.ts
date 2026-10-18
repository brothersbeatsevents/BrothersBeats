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
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'brothersbeatsevents@gmail.com';

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
              Html: { Data: await fillWhatsappSlot(htmlBody), Charset: 'UTF-8' },
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

// ── Brand template — mirrors the website: ink header, gold accents, warm neutral page ──
// Table layout + inline styles so it renders consistently in Gmail, Outlook and Apple Mail.

const BRAND = {
  ink: '#0A0806',
  gold: '#D4AF37',
  goldDark: '#B08A25',
  goldPale: '#FBF6E6',
  neutral: '#F4F1EA',
  border: '#DED8CC',
  text: '#201C16',
  textSecondary: '#655F55',
  textMuted: '#8A8174',
  onInkMuted: '#B8B2A7',
  red: '#FB3A35',
  redPale: '#FFF1F0',
};
const FONT_BODY = `Inter,'Helvetica Neue',Helvetica,Arial,sans-serif`;
const FONT_DISPLAY = `'Space Grotesk','Helvetica Neue',Helvetica,Arial,sans-serif`;
const FONT_MONO = `'SFMono-Regular',Menlo,Consolas,monospace`;
const LOGO_URL = `${FRONTEND_URL}/images/BBlogo.png`;
const SOCIAL_LINKS = [
  { label: 'Instagram', url: 'https://www.instagram.com/brothersbeatsevents?igsh=bzJ1dmJ4djc4NGEz&utm_source=qr' },
  { label: 'Facebook', url: 'https://www.facebook.com/share/1HRsyGnwbJ/?mibextid=wwXIfr' },
  { label: 'YouTube', url: 'https://www.youtube.com/@BrothersbeatsEvents' },
];

interface TemplateOptions {
  preheader?: string;
  eyebrow?: string;
  headline?: string;
  tone?: 'default' | 'alert';
}

function socialPill(label: string, url: string): string {
  return `<a href="${escapeHtml(url)}" target="_blank" style="display:inline-block; margin:0 4px 8px; padding:8px 18px; border:1px solid ${BRAND.gold}; border-radius:999px; font-family:${FONT_BODY}; font-size:13px; font-weight:600; color:${BRAND.gold}; text-decoration:none;">${label}</a>`;
}

// The WhatsApp link lives in admin settings, so it is filled in at send time.
const WHATSAPP_SLOT = '<!--BB_WHATSAPP_SLOT-->';

async function fillWhatsappSlot(html: string): Promise<string> {
  if (!html.includes(WHATSAPP_SLOT)) return html;
  let pill = '';
  try {
    const settings = await db.get<{ whatsappGroupUrl?: string }>('orgSettings', 'org-settings');
    const url = settings?.whatsappGroupUrl;
    if (url && /^https?:\/\//i.test(url)) pill = socialPill('WhatsApp Channel', url);
  } catch (err) {
    console.warn('[SES] Could not load WhatsApp link for email footer:', err);
  }
  return html.replace(WHATSAPP_SLOT, pill);
}

function wrapInTemplate(content: string, opts: TemplateOptions = {}): string {
  const accent = opts.tone === 'alert' ? BRAND.red : BRAND.gold;
  const socials = SOCIAL_LINKS.map((s) => socialPill(s.label, s.url)).join('') + WHATSAPP_SLOT;
  // Trailing filler stops inbox previews from pulling body copy in after the preheader.
  const preheader = opts.preheader
    ? `<div style="display:none; max-height:0; max-width:0; overflow:hidden; opacity:0; mso-hide:all; font-size:1px; line-height:1px; color:${BRAND.neutral};">${escapeHtml(opts.preheader)}${'&#847;&zwnj;&nbsp;'.repeat(40)}</div>`
    : '';
  const hero = opts.headline
    ? `
          <tr>
            <td class="bb-pad" align="center" bgcolor="${BRAND.ink}" style="background:${BRAND.ink}; padding:8px 40px 36px;">
              ${opts.eyebrow ? `<p style="margin:0 0 10px; font-family:${FONT_BODY}; font-size:12px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:${accent};">${escapeHtml(opts.eyebrow)}</p>` : ''}
              <h1 class="bb-headline" style="margin:0; font-family:${FONT_DISPLAY}; font-size:32px; line-height:1.2; font-weight:700; color:#FFFFFF; letter-spacing:-0.02em;">${escapeHtml(opts.headline)}</h1>
            </td>
          </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&amp;family=Space+Grotesk:wght@700&amp;display=swap" rel="stylesheet">
<style>
  @media only screen and (max-width:620px) {
    .bb-pad { padding-left:24px !important; padding-right:24px !important; }
    .bb-headline { font-size:26px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background:${BRAND.neutral}; -webkit-text-size-adjust:100%;">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.neutral}" style="background:${BRAND.neutral};">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; background:#FFFFFF; border-radius:20px; border-collapse:separate; overflow:hidden;">
          <tr>
            <td class="bb-pad" align="center" bgcolor="${BRAND.ink}" style="background:${BRAND.ink}; padding:32px 40px ${opts.headline ? '20px' : '28px'}; border-radius:20px 20px 0 0;">
              <a href="${FRONTEND_URL}" target="_blank" style="text-decoration:none;">
                <img src="${LOGO_URL}" width="64" height="64" alt="" style="display:block; margin:0 auto 12px; width:64px; height:64px; border:0; outline:none;">
                <span style="font-family:${FONT_DISPLAY}; font-size:22px; font-weight:700; color:#FFFFFF; letter-spacing:-0.01em;">Brothers<span style="color:${BRAND.gold};">Beats</span> Events</span>
              </a>
              <p style="margin:6px 0 0; font-family:${FONT_BODY}; font-size:11px; font-weight:600; letter-spacing:0.14em; text-transform:uppercase;">
                <span style="color:${BRAND.gold};">Fresh Events</span><span style="color:${BRAND.onInkMuted};"> &nbsp;|&nbsp; Vibrant Energy</span>
              </p>
            </td>
          </tr>${hero}
          <tr><td height="4" bgcolor="${accent}" style="height:4px; line-height:4px; font-size:0; background:${accent};">&nbsp;</td></tr>
          <tr>
            <td class="bb-pad" style="padding:40px 40px 32px; font-family:${FONT_BODY}; color:${BRAND.text};">
              ${content}
            </td>
          </tr>
          <tr>
            <td class="bb-pad" align="center" bgcolor="${BRAND.ink}" style="background:${BRAND.ink}; padding:32px 40px; border-radius:0 0 20px 20px;">
              <p style="margin:0 0 14px; font-family:${FONT_DISPLAY}; font-size:16px; font-weight:700; color:#FFFFFF;">Stay connected with us</p>
              <div>${socials}</div>
              <p style="margin:16px 0 4px; font-family:${FONT_BODY}; font-size:12px; line-height:1.6; color:${BRAND.onInkMuted};">
                Questions? Email <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.gold}; text-decoration:none;">${SUPPORT_EMAIL}</a>
              </p>
              <p style="margin:0; font-family:${FONT_BODY}; font-size:12px; line-height:1.6; color:${BRAND.onInkMuted};">
                <a href="${FRONTEND_URL}" style="color:${BRAND.gold}; text-decoration:none;">brothersbeats.events</a> &nbsp;&middot;&nbsp; Dublin, Ireland
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0; font-family:${FONT_BODY}; font-size:11px; color:${BRAND.textMuted};">&copy; ${new Date().getFullYear()} Brothers Beats Events &middot; We organise, we manage, we execute &mdash; you enjoy.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const TEXT_STYLE = `margin:0 0 16px; font-family:${FONT_BODY}; font-size:16px; line-height:1.65; color:${BRAND.text};`;

function greeting(name: string): string {
  return `<p style="${TEXT_STYLE} font-size:18px; font-weight:700;">Hi ${escapeHtml(name)},</p>`;
}

// `html` must already be escaped by the caller.
function paragraph(html: string): string {
  return `<p style="${TEXT_STYLE}">${html}</p>`;
}

function finePrint(html: string): string {
  return `<p style="margin:16px 0 0; font-family:${FONT_BODY}; font-size:13px; line-height:1.6; color:${BRAND.textSecondary};">${html}</p>`;
}

function callout(html: string, tone: 'gold' | 'alert' = 'gold'): string {
  const bg = tone === 'alert' ? BRAND.redPale : BRAND.goldPale;
  const bar = tone === 'alert' ? BRAND.red : BRAND.gold;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
      <tr>
        <td bgcolor="${bg}" style="background:${bg}; border-left:4px solid ${bar}; border-radius:12px; padding:16px 20px; font-family:${FONT_BODY}; font-size:15px; line-height:1.6; color:${BRAND.text};">${html}</td>
      </tr>
    </table>`;
}

function detailRows(rows: Array<[string, string]>): string {
  const body = rows
    .map(([label, value], i) => {
      const divider = i ? `border-top:1px solid ${BRAND.border};` : '';
      return `
      <tr>
        <td style="padding:12px 0; ${divider} font-family:${FONT_BODY}; font-size:12px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:${BRAND.textMuted};">${escapeHtml(label)}</td>
        <td align="right" style="padding:12px 0; ${divider} font-family:${FONT_BODY}; font-size:15px; font-weight:700; color:${BRAND.text};">${escapeHtml(value)}</td>
      </tr>`;
    })
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">${body}</table>`;
}

function ctaButton(label: string, url: string, variant: 'primary' | 'secondary' = 'primary'): string {
  const bg = variant === 'primary' ? BRAND.gold : '#FFFFFF';
  const border = variant === 'primary' ? BRAND.gold : BRAND.ink;
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:12px auto;">
      <tr>
        <td align="center" bgcolor="${bg}" style="border-radius:999px; border:2px solid ${border};">
          <a href="${escapeHtml(url)}" target="_blank" style="display:inline-block; padding:14px 34px; font-family:${FONT_BODY}; font-size:15px; font-weight:700; color:${BRAND.ink}; text-decoration:none; border-radius:999px;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>`;
}

function buttons(...items: string[]): string {
  return `<div style="margin:28px 0 8px;">${items.join('')}</div>`;
}

function eventSummaryBlock(event: {
  title: string;
  startDateTime: string;
  venueName?: string;
  city?: string;
  timezone?: string;
}): string {
  const row = (label: string, value: string, first = false) => `
            <tr>
              <td style="padding:10px 0; ${first ? '' : `border-top:1px dashed ${BRAND.border};`}">
                <p style="margin:0; font-family:${FONT_BODY}; font-size:11px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:${BRAND.textMuted};">${label}</p>
                <p style="margin:2px 0 0; font-family:${FONT_BODY}; font-size:16px; font-weight:600; color:${BRAND.text};">${value}</p>
              </td>
            </tr>`;
  const venue = event.venueName
    ? `${escapeHtml(event.venueName)}${event.city ? `, ${escapeHtml(event.city)}` : ''}`
    : '';
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px; border:1px solid ${BRAND.border}; border-radius:16px; border-collapse:separate;">
      <tr>
        <td bgcolor="${BRAND.ink}" style="background:${BRAND.ink}; padding:20px 24px; border-bottom:4px solid ${BRAND.gold}; border-radius:15px 15px 0 0;">
          <p style="margin:0 0 6px; font-family:${FONT_BODY}; font-size:11px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:${BRAND.gold};">Event</p>
          <p style="margin:0; font-family:${FONT_DISPLAY}; font-size:22px; line-height:1.25; font-weight:700; color:#FFFFFF;">${escapeHtml(event.title)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 24px 14px; background:#FFFFFF; border-radius:0 0 15px 15px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${row('Date', escapeHtml(formatEventDate(event.startDateTime, event.timezone)), true)}
            ${row('Time', escapeHtml(formatEventTime(event.startDateTime, event.timezone)))}
            ${venue ? row('Venue', venue) : ''}
          </table>
        </td>
      </tr>
    </table>`;
}

// ── Public API ──

export function isConfigured(): boolean {
  return !!FROM_EMAIL;
}

export async function sendWelcomeEmail(
  to: string,
  displayName: string,
): Promise<boolean> {
  const subject = `Welcome to Brothers Beats Events — the good times start here`;
  const perks = [
    ['Discover', 'Live music, community nights and celebrations across Ireland.'],
    ['Book in seconds', 'Secure checkout with tickets delivered straight to your phone.'],
    ['Never miss out', 'Be first to hear about new events and early-bird releases.'],
  ]
    .map(
      ([title, text]) => `
      <tr>
        <td width="36" valign="top" style="padding:6px 0;">
          <div style="width:24px; height:24px; border-radius:999px; background:${BRAND.gold}; color:${BRAND.ink}; font-family:${FONT_BODY}; font-size:14px; font-weight:700; line-height:24px; text-align:center;">&#10003;</div>
        </td>
        <td style="padding:6px 0; font-family:${FONT_BODY}; font-size:15px; line-height:1.55; color:${BRAND.text};"><strong>${title}</strong> &mdash; ${text}</td>
      </tr>`,
    )
    .join('');
  const content = `
    ${greeting(displayName)}
    ${paragraph('Your account is ready, and you&rsquo;re officially part of the Brothers Beats crew. Here&rsquo;s what&rsquo;s waiting for you:')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">${perks}</table>
    ${buttons(ctaButton('Explore Upcoming Events', `${FRONTEND_URL}/events`))}
  `;
  return sendEmail(
    to,
    subject,
    wrapInTemplate(content, {
      preheader: 'Your account is ready — see what’s on and grab your tickets.',
      eyebrow: 'Welcome aboard',
      headline: 'You’re part of the crew',
    }),
  );
}

export async function sendAdminAlert(subject: string, message: string): Promise<boolean> {
  const content = `
    ${callout(escapeHtml(message), 'alert')}
    ${finePrint(`Timestamp: ${new Date().toISOString()}`)}
  `;
  return sendEmail(
    FROM_EMAIL,
    `[Brothers Beats Admin] ${subject}`,
    wrapInTemplate(content, { eyebrow: 'Admin alert', headline: subject, tone: 'alert' }),
  );
}

export async function sendPasswordReset(
  to: string,
  displayName: string,
  resetLink: string,
): Promise<boolean> {
  const subject = `Reset your password — Brothers Beats Events`;
  const content = `
    ${greeting(displayName)}
    ${paragraph('We received a request to reset the password on your Brothers Beats account. Tap the button below to choose a new one.')}
    ${buttons(ctaButton('Reset My Password', resetLink))}
    ${finePrint('This link expires in 1 hour. If you didn&rsquo;t ask for a reset, you can safely ignore this email &mdash; your password won&rsquo;t change.')}
    ${finePrint(`Button not working? Paste this link into your browser:<br><a href="${escapeHtml(resetLink)}" style="color:${BRAND.goldDark}; word-break:break-all;">${escapeHtml(resetLink)}</a>`)}
  `;
  return sendEmail(
    to,
    subject,
    wrapInTemplate(content, {
      preheader: 'Use this link within the hour to set a new password.',
      eyebrow: 'Account security',
      headline: 'Reset your password',
    }),
  );
}

export async function sendBookingConfirmation(
  to: string,
  buyerName: string,
  booking: { bookingReference: string; quantity: number; totalAmountMinor: number; currency: string },
  event: { title: string; startDateTime: string; venueName: string; city: string; timezone: string; slug: string },
): Promise<boolean> {
  const subject = `🎉 You're going! Booking confirmed for ${event.title}`;
  const calUrl = buildGoogleCalendarUrl(event);
  const ticketLabel = `${booking.quantity} ticket${booking.quantity > 1 ? 's' : ''}`;
  const content = `
    ${greeting(buyerName)}
    ${paragraph(`Get ready &mdash; your spot is locked in! We can&rsquo;t wait to see you at <strong>${escapeHtml(event.title)}</strong>.`)}
    ${eventSummaryBlock(event)}
    ${detailRows([
      ['Booking reference', booking.bookingReference],
      ['Tickets', ticketLabel],
      ['Total paid', formatMoney(booking.totalAmountMinor, booking.currency)],
    ])}
    ${callout('Your tickets with QR codes are on their way in a separate email, and they&rsquo;re always available in your account.')}
    ${buttons(
      ctaButton('View My Tickets', `${FRONTEND_URL}/account/tickets/${booking.bookingReference}`),
      ctaButton('Add to Google Calendar', calUrl, 'secondary'),
    )}
  `;
  return sendEmail(
    to,
    subject,
    wrapInTemplate(content, {
      preheader: `Booking ${booking.bookingReference} · ${ticketLabel} · ${formatEventDate(event.startDateTime, event.timezone)}`,
      eyebrow: 'Booking confirmed',
      headline: 'You’re going! 🎉',
    }),
  );
}

export async function sendTicketDelivery(
  to: string,
  buyerName: string,
  tickets: Array<{ ticketNumber: string; ticketTierName?: string }>,
  event: { title: string; startDateTime: string; venueName: string; city: string; timezone: string; slug: string },
  bookingReference: string,
  isResend = false,
): Promise<boolean> {
  const subject = `🎟️ ${isResend ? 'Your tickets (resent)' : 'Your tickets are here'}: ${event.title}`;
  const stubs = tickets
    .map(
      (t, i) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px; border:1px solid ${BRAND.border}; border-radius:14px; border-collapse:separate;">
      <tr>
        <td width="8" bgcolor="${BRAND.gold}" style="width:8px; background:${BRAND.gold}; border-radius:13px 0 0 13px;">&nbsp;</td>
        <td style="padding:14px 18px;">
          <p style="margin:0; font-family:${FONT_BODY}; font-size:11px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:${BRAND.textMuted};">${escapeHtml(t.ticketTierName || 'Admission')} &middot; Ticket ${i + 1} of ${tickets.length}</p>
          <p style="margin:4px 0 0; font-family:${FONT_MONO}; font-size:17px; font-weight:700; letter-spacing:0.06em; color:${BRAND.ink};">${escapeHtml(t.ticketNumber)}</p>
        </td>
        <td align="right" style="padding:14px 18px; font-family:${FONT_BODY}; font-size:12px; font-weight:700; letter-spacing:0.1em; color:${BRAND.goldDark}; white-space:nowrap;">ADMIT ONE</td>
      </tr>
    </table>`,
    )
    .join('');
  const content = `
    ${greeting(buyerName)}
    ${paragraph(`${tickets.length > 1 ? 'Your tickets are' : 'Your ticket is'} ready! Keep this email handy &mdash; it&rsquo;s your pass to a great night.`)}
    ${eventSummaryBlock(event)}
    ${stubs}
    <div style="height:12px; line-height:12px; font-size:0;">&nbsp;</div>
    ${callout('<strong>How entry works</strong><br>Open your tickets on your phone and show the QR code at the door &mdash; or download the PDF and bring it along. Each QR code can be scanned once.')}
    ${buttons(ctaButton('View & Download Tickets', `${FRONTEND_URL}/account/tickets/${bookingReference}`))}
    ${finePrint(`Booking reference: <strong>${escapeHtml(bookingReference)}</strong>`)}
  `;
  return sendEmail(
    to,
    subject,
    wrapInTemplate(content, {
      preheader: `${tickets.length} ticket${tickets.length > 1 ? 's' : ''} for ${event.title} — show the QR code at the door.`,
      eyebrow: isResend ? 'Tickets resent' : 'Your tickets are here',
      headline: event.title,
    }),
  );
}

export async function sendPaymentFailed(
  to: string,
  buyerName: string,
  eventTitle: string,
  bookingReference: string,
): Promise<boolean> {
  const subject = `Payment issue with your booking — ${eventTitle}`;
  const content = `
    ${greeting(buyerName)}
    ${paragraph(`We couldn&rsquo;t process the payment for your booking <strong>${escapeHtml(bookingReference)}</strong> for <strong>${escapeHtml(eventTitle)}</strong>, so no money has been taken.`)}
    ${callout('Your reserved tickets have been released. If you&rsquo;d still like to come, start a new booking &mdash; tickets are subject to availability, so don&rsquo;t wait too long!', 'alert')}
    ${buttons(ctaButton('Try Booking Again', `${FRONTEND_URL}/events`))}
  `;
  return sendEmail(
    to,
    subject,
    wrapInTemplate(content, {
      preheader: 'No payment was taken — you can try booking again.',
      eyebrow: 'Payment unsuccessful',
      headline: 'We couldn’t complete your booking',
      tone: 'alert',
    }),
  );
}

export async function sendReservationExpired(
  to: string,
  buyerName: string,
  eventTitle: string,
  eventSlug: string,
): Promise<boolean> {
  const subject = `Your reservation expired — ${eventTitle}`;
  const content = `
    ${greeting(buyerName)}
    ${paragraph(`Your reservation for <strong>${escapeHtml(eventTitle)}</strong> timed out before checkout was completed, so the tickets went back on sale.`)}
    ${paragraph('Good news: there may still be tickets left. Jump back in and secure your spot before they&rsquo;re gone.')}
    ${buttons(ctaButton('Get My Tickets', `${FRONTEND_URL}/events/${eventSlug}`))}
  `;
  return sendEmail(
    to,
    subject,
    wrapInTemplate(content, {
      preheader: 'Tickets may still be available — grab them before they’re gone.',
      eyebrow: 'Reservation expired',
      headline: 'Still want to come?',
    }),
  );
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
  const subject = `⏰ ${event.title} is ${label} — are you ready?`;
  const calUrl = buildGoogleCalendarUrl(event);
  const content = `
    ${greeting(attendeeName)}
    ${paragraph(`The countdown is on! <strong>${escapeHtml(event.title)}</strong> is happening ${label}, and we&rsquo;re getting everything ready for you.`)}
    ${eventSummaryBlock(event)}
    ${callout('<strong>Before you head out</strong><br>&#10003; Have your QR code ready on your phone (or bring the PDF)<br>&#10003; Arrive a little early to beat the queue<br>&#10003; Bring your energy &mdash; we&rsquo;ll bring the vibes')}
    ${buttons(
      ctaButton('View My Tickets', `${FRONTEND_URL}/account/tickets/${bookingReference}`),
      ctaButton('Add to Google Calendar', calUrl, 'secondary'),
    )}
  `;
  return sendEmail(
    to,
    subject,
    wrapInTemplate(content, {
      preheader: `See you ${label}! Your tickets and event details inside.`,
      eyebrow: 'Get ready',
      headline: `See you ${label}!`,
    }),
  );
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
    ${greeting(buyerName)}
    ${paragraph('There&rsquo;s an update to an event you have tickets for. Here&rsquo;s what changed:')}
    ${callout(escapeHtml(changeSummary))}
    ${eventSummaryBlock(event)}
    ${paragraph('Your tickets are still valid &mdash; no action is needed unless the new details don&rsquo;t work for you.')}
    ${buttons(ctaButton('View My Booking', `${FRONTEND_URL}/account/tickets/${bookingReference}`))}
  `;
  return sendEmail(
    to,
    subject,
    wrapInTemplate(content, {
      preheader: changeSummary,
      eyebrow: 'Event update',
      headline: event.title,
    }),
  );
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
    ${greeting(buyerName)}
    ${paragraph(`We&rsquo;re really sorry to let you know that <strong>${escapeHtml(eventTitle)}</strong> has been cancelled.`)}
    ${callout(escapeHtml(cancellationMessage), 'alert')}
    ${paragraph(`A full refund is being processed for booking <strong>${escapeHtml(bookingReference)}</strong>. You don&rsquo;t need to do anything &mdash; we&rsquo;ll email you once it&rsquo;s complete.`)}
    ${paragraph('We hope to make it up to you at one of our upcoming events.')}
    ${buttons(ctaButton('Discover Upcoming Events', `${FRONTEND_URL}/events`))}
  `;
  return sendEmail(
    to,
    subject,
    wrapInTemplate(content, {
      preheader: 'A full refund is on its way — no action needed.',
      eyebrow: 'Event cancelled',
      headline: eventTitle,
      tone: 'alert',
    }),
  );
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
    ${greeting(buyerName)}
    ${paragraph('We&rsquo;ve received your refund request and our team is on it. Here are the details:')}
    ${detailRows([
      ['Event', eventTitle],
      ['Refund amount', formatMoney(amountMinor, currency)],
    ])}
    ${paragraph('We&rsquo;ll send you another email as soon as it&rsquo;s been processed.')}
  `;
  return sendEmail(
    to,
    subject,
    wrapInTemplate(content, {
      preheader: `Refund of ${formatMoney(amountMinor, currency)} requested — we’ll confirm once it’s processed.`,
      eyebrow: 'Refund requested',
      headline: 'We’ve got your request',
    }),
  );
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
    ${greeting(buyerName)}
    ${paragraph('Your refund has been completed and is on its way back to your original payment method.')}
    ${detailRows([
      ['Event', eventTitle],
      ['Refund amount', formatMoney(amountMinor, currency)],
      ['Expected in', '5–10 business days'],
    ])}
    ${paragraph('We&rsquo;d love to see you at another event soon.')}
    ${buttons(ctaButton('Find Your Next Event', `${FRONTEND_URL}/events`))}
  `;
  return sendEmail(
    to,
    subject,
    wrapInTemplate(content, {
      preheader: `${formatMoney(amountMinor, currency)} is on its way back to you.`,
      eyebrow: 'Refund complete',
      headline: 'Your refund is on its way',
    }),
  );
}

export async function sendRefundFailed(
  to: string,
  buyerName: string,
  eventTitle: string,
): Promise<boolean> {
  const subject = `Refund issue — ${eventTitle}`;
  const content = `
    ${greeting(buyerName)}
    ${paragraph(`We ran into a problem processing your refund for <strong>${escapeHtml(eventTitle)}</strong>.`)}
    ${callout(`Don&rsquo;t worry &mdash; our team has been notified and will personally follow up with you. If you have any questions in the meantime, reach us at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.goldDark}; font-weight:600;">${SUPPORT_EMAIL}</a>.`, 'alert')}
  `;
  return sendEmail(
    to,
    subject,
    wrapInTemplate(content, {
      preheader: 'Our team is looking into it and will follow up with you.',
      eyebrow: 'Refund issue',
      headline: 'We hit a snag with your refund',
      tone: 'alert',
    }),
  );
}

export async function sendBookingLookupLink(
  to: string,
  buyerName: string,
  link: string,
): Promise<boolean> {
  const subject = `Your booking link — Brothers Beats Events`;
  const content = `
    ${greeting(buyerName)}
    ${paragraph('Here&rsquo;s the secure link you requested to view your booking and tickets.')}
    ${buttons(ctaButton('View My Booking', link))}
    ${finePrint('This link expires in 30 minutes. If you didn&rsquo;t request it, you can ignore this email.')}
  `;
  return sendEmail(
    to,
    subject,
    wrapInTemplate(content, {
      preheader: 'Your secure booking link — valid for 30 minutes.',
      eyebrow: 'Your booking',
      headline: 'Here’s your booking link',
    }),
  );
}

export async function sendCampaignEmail(
  to: string,
  campaign: { subject: string; preheader?: string; heading: string; body: string; ctaLabel?: string; ctaUrl?: string; heroImageUrl?: string },
  unsubscribeUrl: string,
): Promise<boolean> {
  const content = `
    ${campaign.heroImageUrl ? `<img src="${escapeHtml(campaign.heroImageUrl)}" width="520" alt="" style="display:block; width:100%; max-width:520px; height:auto; border:0; border-radius:16px; margin:0 0 24px;" />` : ''}
    <div style="${TEXT_STYLE} white-space:pre-wrap;">${escapeHtml(campaign.body)}</div>
    ${campaign.ctaLabel && campaign.ctaUrl ? buttons(ctaButton(campaign.ctaLabel, campaign.ctaUrl)) : ''}
    <p style="margin:32px 0 0; font-family:${FONT_BODY}; font-size:12px; color:${BRAND.textMuted}; text-align:center;">
      You&rsquo;re receiving this because you subscribed to Brothers Beats updates.<br>
      <a href="${escapeHtml(unsubscribeUrl)}" style="color:${BRAND.textSecondary};">Unsubscribe from these emails</a>
    </p>
  `;
  return sendEmail(
    to,
    campaign.subject,
    wrapInTemplate(content, {
      preheader: campaign.preheader,
      eyebrow: 'From Brothers Beats',
      headline: campaign.heading,
    }),
  );
}
