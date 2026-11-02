const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 5000;

/**
 * Cloudflare Turnstile token verification. When TURNSTILE_SECRET_KEY is unset
 * (local/dev), tokens are not required and verification always passes. When a
 * secret is configured, the form's token is mandatory and must be valid.
 */
export async function verifyTurnstileToken(token: unknown): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY || '';
  if (!secret) return true;
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
