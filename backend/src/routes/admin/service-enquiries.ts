// ──────────────────────────────────────────
// Admin: Event-service enquiries — paid private-event management inbox.
// An enquiry is informational/sales-operational only; it never creates a
// public event, ticket tier, booking, or payment automatically.
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { db } from '../../store';
import { AuthRequest, authenticate, requireAdmin } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { EventServiceEnquiryEntity, EventServiceEnquiryStatus } from '../../types';

const router = Router();
router.use(authenticate, requireAdmin);

const VALID_STATUSES: EventServiceEnquiryStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'SPAM'];

function matchesQuery(e: EventServiceEnquiryEntity, q: string): boolean {
  const needle = q.toLowerCase();
  return (
    e.fullName.toLowerCase().includes(needle) ||
    e.normalizedEmail.includes(needle) ||
    (e.phone || '').toLowerCase().includes(needle) ||
    (e.venueOrCity || '').toLowerCase().includes(needle)
  );
}

// GET /api/admin/service-enquiries
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, eventServiceType, q } = req.query as Record<string, string>;
  let items = await db.getAll<EventServiceEnquiryEntity>('serviceEnquiries');

  if (status) items = items.filter((e) => e.status === status);
  if (eventServiceType) items = items.filter((e) => e.eventServiceType === eventServiceType);
  if (q) items = items.filter((e) => matchesQuery(e, q));

  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json({ success: true, data: items });
});

// GET /api/admin/service-enquiries/export — CSV of filtered enquiries
router.get('/export', async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, eventServiceType, q } = req.query as Record<string, string>;
  let items = await db.getAll<EventServiceEnquiryEntity>('serviceEnquiries');

  if (status) items = items.filter((e) => e.status === status);
  if (eventServiceType) items = items.filter((e) => e.eventServiceType === eventServiceType);
  if (q) items = items.filter((e) => matchesQuery(e, q));
  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const header = ['Date', 'Type', 'Status', 'Full name', 'Email', 'Phone', 'Preferred date', 'Venue/city', 'Guests', 'Budget', 'Message'];
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = items.map((e) =>
    [e.created_at, e.eventServiceType, e.status, e.fullName, e.email, e.phone, e.preferredDate, e.venueOrCity, e.estimatedGuestCount, e.budgetRange, e.message]
      .map(escape)
      .join(','),
  );
  const csv = [header.map(escape).join(','), ...rows].join('\n');

  auditLog(req.user!.id, 'EXPORT_SERVICE_ENQUIRIES', 'EVENT_SERVICE_ENQUIRY', '*', {
    actorRole: req.user!.role as any,
    summary: `Exported ${items.length} service enquiry record(s)`,
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="service-enquiries-export.csv"');
  res.send(csv);
});

// GET /api/admin/service-enquiries/:enquiryId
router.get('/:enquiryId', async (req: AuthRequest, res: Response): Promise<void> => {
  const enquiry = await db.get<EventServiceEnquiryEntity>('serviceEnquiries', req.params.enquiryId);
  if (!enquiry) {
    res.status(404).json({ success: false, error: 'Enquiry not found' });
    return;
  }
  res.json({ success: true, data: enquiry });
});

// PATCH /api/admin/service-enquiries/:enquiryId — status, notes, assignment
router.patch('/:enquiryId', async (req: AuthRequest, res: Response): Promise<void> => {
  const enquiry = await db.get<EventServiceEnquiryEntity>('serviceEnquiries', req.params.enquiryId);
  if (!enquiry) {
    res.status(404).json({ success: false, error: 'Enquiry not found' });
    return;
  }

  const { status, internalNotes, assignedAdminUserId } = req.body;
  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      res.status(400).json({ success: false, error: `status must be one of ${VALID_STATUSES.join(', ')}` });
      return;
    }
    enquiry.status = status;
  }
  if (internalNotes !== undefined) enquiry.internalNotes = internalNotes;
  if (assignedAdminUserId !== undefined) enquiry.assignedAdminUserId = assignedAdminUserId;

  enquiry.updated_at = new Date().toISOString();
  await db.put('serviceEnquiries', enquiry);

  auditLog(req.user!.id, 'UPDATE_SERVICE_ENQUIRY', 'EVENT_SERVICE_ENQUIRY', enquiry.id, {
    actorRole: req.user!.role as any,
    summary: `Updated enquiry from "${enquiry.fullName}"${status ? ` to ${status}` : ''}`,
  });

  res.json({ success: true, data: enquiry });
});

export default router;
