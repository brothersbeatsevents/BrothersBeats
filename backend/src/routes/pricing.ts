// POST /api/pricing/quote — non-binding basket price preview before checkout.
import { Router, Response } from 'express';
import { db } from '../store';
import { EventEntity } from '../types';
import { AuthRequest } from '../middleware/auth';
import { parseTicketSelections, quoteTicketOrder, TicketOrderError } from '../services/ticket-order';
import { DiscountCodeError } from '../services/discount-codes';

const router = Router();
router.post('/quote', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const items = parseTicketSelections(req.body);
    const event = await db.get<EventEntity>('events', req.body.eventId);
    if (!event || event.visibility === 'PRIVATE') {
      res.status(404).json({ success: false, error: 'Event not found' });
      return;
    }
    res.json({ success: true, data: await quoteTicketOrder(event, items, req.body.discountCode) });
  } catch (err) {
    if (!(err instanceof TicketOrderError) && !(err instanceof DiscountCodeError)) throw err;
    res.status(err.status).json({ success: false, error: err.message });
  }
});
export default router;
