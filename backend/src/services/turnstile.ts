const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 5000;

// ── Turnstile secret key — fetched from the Parameters & Secrets Lambda
//    extension when running in Lambda (same pattern as services/stripe.ts),
//    otherwise read directly from an env var for local dev. ──
let _cachedSecret: string | null = null;
let _secretExpiry = 0;
const SECRET_CACHE_TTL = 60 * 60 * 1000;

async function getTurnstileSecret(): Promise<string> {
  if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return process.env.TURNSTILE_SECRET_KEY || '';
  }
  if (_cachedSecret !== null && Date.now() < _secretExpiry) return _cachedSecret;

  const isProd = process.env.NODE_ENV === 'production';
  const paramName = encodeURIComponent(
    `/brothers-beats/${isProd ? 'prod' : 'dev'}/turnstile-secret-key`,
  );
  const url = `http://localhost:2773/systemsmanager/parameters/get?name=${paramName}&withDecryption=true`;

  try {
    const res = await fetch(url, {
      headers: { 'X-Aws-Parameters-Secrets-Token': process.env.AWS_SESSION_TOKEN || '' },
    });
    if (!res.ok) {
      console.warn(`[Turnstile] Could not fetch secret key from SSM: ${res.status}`);
      _cachedSecret = '';
    } else {
      const body = (await res.json()) as { Parameter: { Value: string } };
      _cachedSecret = body.Parameter.Value;
    }
  } catch {
    _cachedSecret = '';
  }
  _secretExpiry = Date.now() + SECRET_CACHE_TTL;
  return _cachedSecret;
}

/**
 * Cloudflare Turnstile token verification. When no secret key is available
 * (local/dev), tokens are not required and verification always passes. When a
 * secret is configured, the form's token is mandatory and must be valid.
 */
export async function verifyTurnstileToken(token: unknown): Promise<boolean> {
  const secret = await getTurnstileSecret();
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
