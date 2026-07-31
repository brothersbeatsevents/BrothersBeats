// ──────────────────────────────────────────
// Admin: Customers — read-only lookup for support purposes
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { db } from '../../store';
import { AuthRequest, authenticate, requireAdmin } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { auditSensitiveAccess } from '../../middleware/audit';
import { User, BookingEntity } from '../../types';

const router = Router();
router.use(authenticate, requireAdmin);

// GET /api/admin/customers?q=... — search customers by name/email
router.get('/', auditSensitiveAccess('LIST_CUSTOMERS', 'USER'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { q } = req.query as Record<string, string>;
  let customers = (await db.getAll<User>('users')).filter((u) => u.role === 'CUSTOMER');
  if (q) {
    const needle = q.toLowerCase();
    customers = customers.filter(
      (u) => u.email.toLowerCase().includes(needle) || u.display_name.toLowerCase().includes(needle),
    );
  }
  res.json({
    success: true,
    data: customers.map((u) => ({
      id: u.id, email: u.email, display_name: u.display_name,
      disabled: u.disabled, created_at: u.created_at,
    })),
  });
});

// GET /api/admin/customers/:id — profile + booking history
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const customer = await db.get<User>('users', req.params.id);
  if (!customer || customer.role !== 'CUSTOMER') {
    res.status(404).json({ success: false, error: 'Customer not found' });
    return;
  }
  const bookings = await db.filterBy<BookingEntity>('bookings', 'customerUserId', customer.id);

  auditLog(req.user!.id, 'VIEW_CUSTOMER', 'USER', customer.id, {
    actorRole: req.user!.role as any,
    email: customer.email,
    summary: `Viewed customer profile ${customer.email}`,
  });

  res.json({
    success: true,
    data: {
      id: customer.id,
      email: customer.email,
      display_name: customer.display_name,
      phone: customer.phone,
      disabled: customer.disabled,
      created_at: customer.created_at,
      bookings: bookings
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((b) => ({
          bookingReference: b.bookingReference,
          eventTitleSnapshot: b.eventTitleSnapshot,
          quantity: b.quantity,
          totalAmountMinor: b.totalAmountMinor,
          currency: b.currency,
          bookingStatus: b.bookingStatus,
          created_at: b.created_at,
        })),
    },
  });
});

export default router;
