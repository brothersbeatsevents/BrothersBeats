import { Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../store';
import { AuditLogEntity } from '../types';
import { AuthRequest } from './auth';

/* ────────────────────────────────────────────
   Audit Logger
   Logs every sensitive admin action into the store
   (DynamoDB in Lambda, in-memory for local dev).
──────────────────────────────────────────── */

// ── PII masking helpers ──
function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return email ? '***' : 'unknown';
  return email.slice(0, 1) + '***' + email.slice(at);
}
function maskIp(ip: string): string {
  const parts = ip.split('.');
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.*.*` : '***';
}

export function auditLog(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown> & {
    alert?: boolean;
    email?: string;
    ip?: string;
    actorRole?: 'ADMIN' | 'SUPER_ADMIN' | 'SYSTEM';
    eventId?: string;
    bookingId?: string;
    summary?: string;
    reason?: string;
  },
) {
  const log: AuditLogEntity = {
    id: `audit-${uuid()}`,
    actorUserId: userId,
    actorRole: metadata?.actorRole || 'ADMIN',
    action,
    entityType,
    entityId,
    eventId: metadata?.eventId,
    bookingId: metadata?.bookingId,
    summary: metadata?.summary || action,
    reason: metadata?.reason,
    metadata,
    correlationId: uuid(),
    created_at: new Date().toISOString(),
  };
  void db.put('auditLogs', log);

  // Console alert for high-severity events — PII is masked before logging
  if (metadata?.alert) {
    const maskedEmail = maskEmail(String(metadata.email || ''));
    const maskedIp = maskIp(String(metadata.ip || ''));
    const safeMetadata = { ...metadata, email: maskedEmail, ip: maskedIp };
    console.warn(`\n🚨 SECURITY ALERT: ${action}`);
    console.warn(`   User: ${userId.slice(0, 8)}... (${maskedEmail})`);
    console.warn(`   Details: ${JSON.stringify(safeMetadata)}`);
    console.warn(`   Time: ${log.created_at}\n`);
  }

  return log;
}

/* ────────────────────────────────────────────
   Bulk Access / Scraping Detector
   Tracks how often a user hits sensitive list
   endpoints within a rolling window. If they
   exceed the threshold, an alert is triggered
   and the request is blocked.
──────────────────────────────────────────── */

interface AccessRecord {
  timestamps: number[];
}

// Per-user rolling window tracker (in-memory for local dev; DynamoDB-backed in Lambda)
const accessTracker = new Map<string, AccessRecord>();

const WINDOW_MS = 5 * 60 * 1000; // 5-minute rolling window
const MAX_SENSITIVE_REQUESTS = 15; // max requests to sensitive list endpoints per window

/**
 * Middleware: monitors sensitive list endpoints for rapid successive access.
 * In Lambda (USE_DYNAMODB=true), uses an atomic DynamoDB counter so the limit
 * is enforced across all concurrent Lambda containers. In local dev, uses an
 * in-memory Map.
 * Attach to routes like GET /donations/admin, GET /admin/users.
 */
export function bulkAccessGuard(entityType: string) {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id || req.ip || 'unknown';
    const key = `${userId}:${entityType}`;
    const now = Date.now();

    if (process.env.USE_DYNAMODB) {
      // ── DynamoDB-backed atomic counter (works across all Lambda containers) ──
      try {
        const count = await db.atomicRateLimitIncrement(key, WINDOW_MS);
        if (count > MAX_SENSITIVE_REQUESTS) {
          auditLog(userId, `BULK_ACCESS_ALERT:${entityType}`, entityType, '*', {
            alert: true,
            email: req.user?.email,
            ip: req.ip,
            requestCount: count,
            windowMinutes: WINDOW_MS / 60000,
            reason: `User exceeded ${MAX_SENSITIVE_REQUESTS} requests to ${entityType} list in ${WINDOW_MS / 60000} minutes`,
          });
          res.status(429).json({
            success: false,
            error:
              'Unusual access pattern detected. Your access has been temporarily restricted and this incident has been logged.',
          });
          return;
        }
      } catch {
        // If DynamoDB rate limit check fails, allow through (fail open) but log
        console.error('[BulkAccessGuard] DynamoDB rate limit check failed');
      }
    } else {
      // ── In-memory tracker (local dev only) — same rolling-window logic as DynamoDB ──
      let record = accessTracker.get(key);
      if (!record) {
        record = { timestamps: [] };
        accessTracker.set(key, record);
      }

      record.timestamps = record.timestamps.filter((t) => now - t < WINDOW_MS);
      record.timestamps.push(now);

      if (record.timestamps.length > MAX_SENSITIVE_REQUESTS) {
        auditLog(userId, `BULK_ACCESS_ALERT:${entityType}`, entityType, '*', {
          alert: true,
          email: req.user?.email,
          ip: req.ip,
          requestCount: record.timestamps.length,
          windowMinutes: WINDOW_MS / 60000,
          reason: `User exceeded ${MAX_SENSITIVE_REQUESTS} requests to ${entityType} list in ${WINDOW_MS / 60000} minutes`,
        });
        res.status(429).json({
          success: false,
          error:
            'Unusual access pattern detected. Your access has been temporarily restricted and this incident has been logged.',
        });
        return;
      }
    }

    // Log normal access
    auditLog(userId, `ACCESS:${entityType}`, entityType, '*', {
      email: req.user?.email,
      ip: req.ip,
    });

    next();
  };
}

/**
 * Middleware factory: logs a specific action on a sensitive route.
 */
export function auditSensitiveAccess(action: string, entityType: string) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (req.user) {
      auditLog(req.user.id, action, entityType, req.params.id || '*', {
        email: req.user.email,
        ip: req.ip,
        method: req.method,
        path: req.originalUrl,
      });
    }
    next();
  };
}
