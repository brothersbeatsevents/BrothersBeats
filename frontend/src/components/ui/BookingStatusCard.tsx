import { formatMoney } from '@/lib/format';

const STATUS_STYLES: Record<string, string> = {
  RESERVED_PENDING_PAYMENT: 'bg-[#FFF7DA] text-[#B8860B]',
  CONFIRMED: 'bg-bb-pale-green text-bb-green',
  PAYMENT_FAILED: 'bg-[#FFF0EF] text-bb-red',
  EXPIRED: 'bg-bb-neutral text-bb-text-muted',
  PAYMENT_REVIEW_REQUIRED: 'bg-[#FFF7DA] text-[#B8860B]',
  CANCELLED: 'bg-bb-neutral text-bb-text-muted',
  REFUND_PENDING: 'bg-bb-pale-blue text-bb-blue',
  PARTIALLY_REFUNDED: 'bg-bb-pale-blue text-bb-blue',
  REFUNDED: 'bg-bb-neutral text-bb-text-muted',
};

const STATUS_LABELS: Record<string, string> = {
  RESERVED_PENDING_PAYMENT: 'Pending payment',
  CONFIRMED: 'Confirmed',
  PAYMENT_FAILED: 'Payment failed',
  EXPIRED: 'Expired',
  PAYMENT_REVIEW_REQUIRED: 'Under review',
  CANCELLED: 'Cancelled',
  REFUND_PENDING: 'Refund pending',
  PARTIALLY_REFUNDED: 'Partially refunded',
  REFUNDED: 'Refunded',
};

export interface BookingSummary {
  bookingReference: string;
  eventTitleSnapshot: string;
  eventStartDateTimeSnapshot: string;
  quantity: number;
  totalAmountMinor: number;
  currency: string;
  bookingStatus: string;
  created_at: string;
}

export default function BookingStatusCard({ booking }: { booking: BookingSummary }) {
  const style = STATUS_STYLES[booking.bookingStatus] || 'bg-bb-neutral text-bb-text-muted';
  return (
    <div className="bg-bb-surface border border-bb-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <p className="font-semibold text-bb-text">{booking.eventTitleSnapshot}</p>
        <p className="text-sm text-bb-text-secondary mt-0.5">
          {new Date(booking.eventStartDateTimeSnapshot).toLocaleDateString('en-IE', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
          {' · '}
          {booking.quantity} ticket{booking.quantity > 1 ? 's' : ''}
        </p>
        <p className="text-xs text-bb-text-muted mt-1">Ref: {booking.bookingReference}</p>
      </div>
      <div className="flex items-center gap-4">
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${style}`}>
          {STATUS_LABELS[booking.bookingStatus] || booking.bookingStatus}
        </span>
        <span className="font-bold text-bb-text">{formatMoney(booking.totalAmountMinor, booking.currency)}</span>
      </div>
    </div>
  );
}
