// ──────────────────────────────────────────
// SES Bounce & Complaint Notifications via SNS
//
// Flow: SES Configuration Set → SNS Topic → HTTPS POST here
//
// Handles:
//   SubscriptionConfirmation — auto-confirms the SNS subscription
//   Notification/Bounce      — suppresses Permanent hard-bounce addresses
//   Notification/Complaint   — suppresses complained-against addresses
// ──────────────────────────────────────────

import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import https from 'https';
import { db } from '../store';
import { EmailSuppression } from '../types';

const router = Router();

const EXPECTED_TOPIC_ARN = process.env.SES_SNS_TOPIC_ARN || '';

// Cache signing certificates — Lambda instances are reused across invocations
const certCache = new Map<string, string>();

// ── Fetch text body from an HTTPS URL ──
function fetchHttpsBody(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

// ── Validate a URL is an AWS-hosted SNS endpoint (SigningCertURL and SubscribeURL) ──
function isSnsAwsUrl(url: string): boolean {
  return /^https:\/\/sns\.[a-z0-9-]+\.amazonaws\.com\//.test(url);
}

// ── Build the canonical string-to-sign per SNS signature spec ──
// https://docs.aws.amazon.com/sns/latest/dg/SendMessageToHttp.verify.signature.html
function buildStringToSign(msg: Record<string, string>): string {
  const fields =
    msg.Type === 'Notification'
      ? ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type']
      : ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'];
  return fields
    .filter((f) => msg[f] != null)
    .map((f) => `${f}\n${msg[f]}\n`)
    .join('');
}

// ── Verify SNS message PKCS#1 signature ──
async function verifySnsSignature(msg: Record<string, string>): Promise<boolean> {
  const certUrl = msg.SigningCertURL || '';
  const signature = msg.Signature || '';
  const sigVersion = msg.SignatureVersion || '1';

  if (!isSnsAwsUrl(certUrl)) {
    console.warn('[SES-SNS] Untrusted SigningCertURL:', certUrl);
    return false;
  }

  try {
    let cert = certCache.get(certUrl);
    if (!cert) {
      cert = await fetchHttpsBody(certUrl);
      certCache.set(certUrl, cert);
    }
    const algorithm = sigVersion === '2' ? 'RSA-SHA256' : 'RSA-SHA1';
    const verifier = crypto.createVerify(algorithm);
    verifier.update(buildStringToSign(msg));
    return verifier.verify(cert, signature, 'base64');
  } catch (err) {
    console.error('[SES-SNS] Signature verification error:', err);
    return false;
  }
}

// POST /api/webhooks/ses-notifications
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const messageType = req.headers['x-amz-sns-message-type'] as string | undefined;

  // Parse body — SNS sends Content-Type: text/plain with JSON body
  let body: any;
  try {
    body =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ success: false, error: 'Invalid JSON body' });
    return;
  }

  // Verify SNS message PKCS#1 signature before any processing
  if (!(await verifySnsSignature(body))) {
    console.warn('[SES-SNS] Rejected: signature verification failed');
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }

  // Reject messages from unexpected topics (if configured)
  if (EXPECTED_TOPIC_ARN && body?.TopicArn !== EXPECTED_TOPIC_ARN) {
    console.warn('[SES-SNS] Rejected: unexpected TopicArn:', body?.TopicArn);
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }

  // ── Subscription confirmation ──
  if (messageType === 'SubscriptionConfirmation') {
    const subscribeUrl = body.SubscribeURL || '';
    if (!isSnsAwsUrl(subscribeUrl)) {
      console.warn('[SES-SNS] Rejected: untrusted SubscribeURL:', subscribeUrl);
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }
    try {
      await fetchHttpsBody(subscribeUrl);
      console.info('[SES-SNS] SNS subscription confirmed for topic:', body.TopicArn);
    } catch (err) {
      console.error('[SES-SNS] Failed to confirm SNS subscription:', err);
    }
    res.status(200).json({ success: true });
    return;
  }

  // ── Notification ──
  if (messageType === 'Notification') {
    let sesEvent: any;
    try {
      sesEvent = JSON.parse(body.Message);
    } catch {
      console.error('[SES-SNS] Could not parse SES event from SNS Message field');
      res.status(200).json({ success: true }); // 200 so SNS does not retry
      return;
    }

    const eventType: string =
      sesEvent?.notificationType || sesEvent?.eventType || '';
    console.info('[SES-SNS] Event received:', eventType);

    try {
      if (eventType === 'Bounce') {
        await handleBounce(sesEvent.bounce);
      } else if (eventType === 'Complaint') {
        await handleComplaint(sesEvent.complaint);
      }
    } catch (err) {
      // Log but return 200 so SNS does not retry indefinitely
      console.error('[SES-SNS] Error processing event:', err);
    }

    res.status(200).json({ success: true });
    return;
  }

  // UnsubscribeConfirmation or unknown type — acknowledge
  res.status(200).json({ success: true });
});

// ── Bounce handler ──
async function handleBounce(bounce: any): Promise<void> {
  const bounceType: string = bounce?.bounceType || '';
  const bounceSubType: string = bounce?.bounceSubType || '';

  // Only suppress Permanent hard bounces
  if (bounceType !== 'Permanent') {
    console.info(
      `[SES-SNS] Transient bounce (${bounceSubType}) — not suppressing`,
    );
    return;
  }

  const recipients: any[] = bounce?.bouncedRecipients ?? [];
  const now = new Date().toISOString();

  for (const r of recipients) {
    const email = r?.emailAddress?.toLowerCase().trim();
    if (!email) continue;

    const record: EmailSuppression = {
      id: `suppressed-${email}`,
      email,
      reason: 'bounce',
      bounce_type: bounceType,
      bounce_subtype: bounceSubType || undefined,
      detail: r.diagnosticCode || undefined,
      suppressed_at: now,
      created_at: now,
    };

    await db.put('emailSuppressions', record);
    console.warn(
      `[SES-SNS] Hard-bounce — suppressed: ${email} (${bounceSubType})`,
    );
  }
}

// ── Complaint handler ──
async function handleComplaint(complaint: any): Promise<void> {
  const recipients: any[] = complaint?.complainedRecipients ?? [];
  const feedbackType: string = complaint?.complaintFeedbackType || '';
  const now = new Date().toISOString();

  for (const r of recipients) {
    const email = r?.emailAddress?.toLowerCase().trim();
    if (!email) continue;

    const record: EmailSuppression = {
      id: `suppressed-${email}`,
      email,
      reason: 'complaint',
      detail: feedbackType || undefined,
      suppressed_at: now,
      created_at: now,
    };

    await db.put('emailSuppressions', record);
    console.warn(
      `[SES-SNS] Complaint — suppressed: ${email} (${feedbackType || 'unknown type'})`,
    );
  }
}

export default router;
