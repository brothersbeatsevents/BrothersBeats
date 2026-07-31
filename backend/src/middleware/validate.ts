// ──────────────────────────────────────────
// Input Validation & Sanitization Middleware
// Prevents XSS, SQL injection, NoSQL injection, oversized payloads
// ──────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';

// ── Sanitize string values (strip potential XSS vectors) ──
function sanitizeString(value: string): string {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript\s*:/gi, '')
    .trim();
}

// ── Deep sanitize object values ──
function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Block NoSQL injection operators
      if (key.startsWith('$')) continue;
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
}

// ── Middleware: sanitize request body ──
export function sanitizeInput(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

// ── Middleware: validate common field patterns ──
export function validateEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function validateSlug(slug: unknown): boolean {
  if (typeof slug !== 'string') return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 200;
}

export function validateUUID(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 100;
}

export function validateAmount(amount: unknown): boolean {
  if (typeof amount !== 'number') return false;
  return amount > 0 && amount <= 1_000_000 && Number.isFinite(amount);
}

// ── Middleware: reject suspicious patterns ──
export function blockSuspiciousPayloads(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const body = JSON.stringify(req.body || {});

  // Block common injection patterns
  const suspicious = [
    /\$(?:gt|gte|lt|lte|ne|in|nin|regex|where|exists)/i,
    /(?:union\s+select|drop\s+table|insert\s+into|delete\s+from)/i,
    /<iframe/i,
    /data:\s*text\/html/i,
  ];

  for (const pattern of suspicious) {
    if (pattern.test(body)) {
      res
        .status(400)
        .json({ success: false, error: 'Invalid request payload' });
      return;
    }
  }

  next();
}

// ── Request size guard (defense-in-depth beyond express.json limit) ──
export function maxBodySize(maxBytes: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > maxBytes) {
      res
        .status(413)
        .json({ success: false, error: 'Request payload too large' });
      return;
    }
    next();
  };
}
