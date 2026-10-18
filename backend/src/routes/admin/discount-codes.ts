import { Router, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { db } from '../../store';
import { authenticate, requireAdmin, AuthRequest } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { DiscountCodeEntity, EventEntity, TicketTierEntity } from '../../types';
import { DiscountCodeError, normalizeDiscountCode } from '../../services/discount-codes';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/', async (req: AuthRequest, res: Response) => {
  const codes = await db.getAll<DiscountCodeEntity>('discountCodes');
  res.json({ success: true, data: codes.filter((code) => !req.query.eventId || code.eventId === req.query.eventId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at)) });
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { eventId, discountType, value, expiresAt } = req.body;
    const code = req.body.code === undefined || req.body.code === ''
      ? `BB-${randomBytes(6).toString('hex').toUpperCase()}` : normalizeDiscountCode(req.body.code);
    if (typeof eventId !== 'string') throw new DiscountCodeError('Select an event');
    const event = await db.get<EventEntity>('events', eventId);
    if (!event) throw new DiscountCodeError('Event not found');
    if ((discountType !== 'PERCENTAGE' && discountType !== 'FIXED') || typeof value !== 'number' ||
        !Number.isFinite(value) || value <= 0 ||
        (discountType === 'PERCENTAGE' ? value > 100 || Math.round(value * 100) / 100 !== value : !Number.isSafeInteger(value))) {
      throw new DiscountCodeError('Enter a percentage above 0 and up to 100 (at most two decimals), or a positive fixed amount in minor units');
    }
    const ticketTierIds = req.body.ticketTierIds ?? [];
    if (!Array.isArray(ticketTierIds) || ticketTierIds.some((id: unknown) => typeof id !== 'string') ||
        new Set(ticketTierIds).size !== ticketTierIds.length) throw new DiscountCodeError('Select valid ticket types');
    const tiers = await db.filterBy<TicketTierEntity>('ticketTiers', 'eventId', eventId);
    const eligible = tiers.filter((tier) => tier.type !== 'EARLY_BIRD' && (!ticketTierIds.length || ticketTierIds.includes(tier.id)));
    if (!eligible.length || ticketTierIds.some((id: string) => !eligible.some((tier) => tier.id === id))) {
      throw new DiscountCodeError('Ticket types must belong to this event; Early Bird pricing is automatic');
    }
    const currency = eligible[0].currency;
    if (discountType === 'FIXED' && eligible.some((tier) => tier.currency !== currency)) {
      throw new DiscountCodeError('Fixed discounts require ticket types with the same currency');
    }
    if (expiresAt !== undefined && (typeof expiresAt !== 'string' || !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now())) {
      throw new DiscountCodeError('Choose a future expiry date');
    }
    const now = new Date().toISOString();
    const discount: DiscountCodeEntity = { id: code, code, eventId, ticketTierIds, discountType, value,
      currency, active: true, expiresAt, createdBy: req.user!.id, created_at: now, updated_at: now };
    if (!await db.putIfAbsent('discountCodes', discount)) throw new DiscountCodeError('This code already exists. Choose another code.', 409);
    auditLog(req.user!.id, 'CREATE_DISCOUNT_CODE', 'DISCOUNT_CODE', code,
      { actorRole: req.user!.role as 'ADMIN' | 'SUPER_ADMIN', eventId, summary: `Created discount code ${code}` });
    res.status(201).json({ success: true, data: discount });
  } catch (err) {
    if (!(err instanceof DiscountCodeError)) throw err;
    res.status(err.status).json({ success: false, error: err.message });
  }
});

router.patch('/:code', async (req: AuthRequest, res: Response): Promise<void> => {
  if (typeof req.body.active !== 'boolean') {
    res.status(400).json({ success: false, error: 'active must be true or false' });
    return;
  }
  const discount = await db.get<DiscountCodeEntity>('discountCodes', req.params.code.toUpperCase());
  if (!discount) {
    res.status(404).json({ success: false, error: 'Discount code not found' });
    return;
  }
  const updated = { ...discount, active: req.body.active, updated_at: new Date().toISOString() };
  await db.put('discountCodes', updated);
  auditLog(req.user!.id, 'UPDATE_DISCOUNT_CODE', 'DISCOUNT_CODE', discount.id,
    { actorRole: req.user!.role as 'ADMIN' | 'SUPER_ADMIN', eventId: discount.eventId,
      summary: `${updated.active ? 'Enabled' : 'Disabled'} discount code ${discount.code}` });
  res.json({ success: true, data: updated });
});

export default router;
