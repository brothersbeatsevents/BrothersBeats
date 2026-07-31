// ──────────────────────────────────────────
// POST /api/pricing/quote — non-binding price preview before checkout
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../store';
import { EventEntity, TicketTierEntity, PriceQuote } from '../types';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/quote', async (req: AuthRequest, res: Response): Promise<void> => {
  const { eventId, ticketTierId, quantity } = req.body;
  const qty = Number(quantity);

  if (!eventId || !ticketTierId || !Number.isInteger(qty) || qty < 1) {
    res.status(400).json({
      success: false,
      error: 'eventId, ticketTierId, and a positive integer quantity are required',
    });
    return;
  }

  const event = await db.get<EventEntity>('events', eventId);
  if (!event || event.visibility === 'PRIVATE') {
    res.status(404).json({ success: false, error: 'Event not found' });
    return;
  }
  if (!['PUBLISHED', 'SALES_PAUSED'].includes(event.status)) {
    res.status(409).json({ success: false, error: 'Tickets are not on sale for this event' });
    return;
  }
  if (event.status === 'SALES_PAUSED') {
    res.status(409).json({ success: false, error: 'Ticket sales are temporarily paused' });
    return;
  }

  const tier = await db.get<TicketTierEntity>('ticketTiers', ticketTierId);
  if (!tier || tier.eventId !== eventId || !tier.visible) {
    res.status(404).json({ success: false, error: 'Ticket type not found' });
    return;
  }

  const now = Date.now();
  if (
    !tier.active ||
    new Date(tier.salesStartAt).getTime() > now ||
    new Date(tier.salesEndAt).getTime() < now
  ) {
    res.status(409).json({ success: false, error: 'This ticket type is not currently on sale' });
    return;
  }

  if (qty < tier.minPerOrder || qty > tier.maxPerOrder) {
    res.status(400).json({
      success: false,
      error: `Quantity must be between ${tier.minPerOrder} and ${tier.maxPerOrder} for this ticket type`,
    });
    return;
  }
  if (tier.type === 'GROUP' && tier.groupMinSize && qty < tier.groupMinSize) {
    res.status(400).json({
      success: false,
      error: `Group tickets require a minimum of ${tier.groupMinSize} tickets`,
    });
    return;
  }
  if (qty > event.perOrderLimit) {
    res.status(400).json({
      success: false,
      error: `A maximum of ${event.perOrderLimit} tickets may be purchased per order`,
    });
    return;
  }

  const available = tier.maxQuantity - tier.quantitySold - tier.quantityReserved;
  if (qty > available) {
    res.status(409).json({ success: false, error: 'Not enough tickets available' });
    return;
  }

  const subtotal = tier.priceAmountMinor * qty;
  const fees = 0; // No platform service fee in this deployment.
  const quote: PriceQuote = {
    quoteId: `quote-${uuid()}`,
    eventId,
    ticketTierId,
    ticketTierName: tier.name,
    quantity: qty,
    unitPriceAmountMinor: tier.priceAmountMinor,
    subtotalAmountMinor: subtotal,
    feesAmountMinor: fees,
    totalAmountMinor: subtotal + fees,
    currency: tier.currency,
    expiresAt: new Date(now + 10 * 60 * 1000).toISOString(),
  };

  res.json({ success: true, data: quote });
});

export default router;
