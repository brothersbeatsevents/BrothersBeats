import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Refund policy',
  description: `Refund policy for ${SITE_CONFIG.name}.`,
  alternates: { canonical: '/refund-policy' },
};

export default function RefundPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-display font-bold text-4xl text-bb-text mb-2">Refund policy</h1>
      <p className="text-sm text-bb-text-muted mb-8">Last updated: {new Date().getFullYear()}</p>

      <div className="prose prose-sm max-w-none text-bb-text-secondary space-y-6">
        <p>
          Refund eligibility depends on the specific event and the reason for the refund request. Please
          review the refund policy listed on each event page before purchasing.
        </p>
        <div>
          <h2 className="font-display font-bold text-lg text-bb-text mb-2">Organizer-cancelled events</h2>
          <p>
            If an event is cancelled by the organizer, ticket holders are entitled to a full refund of
            the ticket price. Refunds are processed back to the original payment method and may take
            5-10 business days to appear.
          </p>
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-bb-text mb-2">Customer-requested refunds</h2>
          <p>
            Refund requests for reasons other than event cancellation are handled on a case-by-case
            basis by the event organizer. Ticket holders cannot self-serve cancellations or refunds —
            please contact us at {SITE_CONFIG.supportEmail} with your booking reference and we&apos;ll
            review your request.
          </p>
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-bb-text mb-2">Processing fees</h2>
          <p>
            Any payment processing fees may be non-refundable depending on the circumstances of the
            refund.
          </p>
        </div>
      </div>
    </div>
  );
}
