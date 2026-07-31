import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Terms of service',
  description: `Terms of service for ${SITE_CONFIG.name}.`,
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-display font-bold text-4xl text-bb-text mb-2">Terms of service</h1>
      <p className="text-sm text-bb-text-muted mb-8">Last updated: {new Date().getFullYear()}</p>

      <div className="prose prose-sm max-w-none text-bb-text-secondary space-y-6">
        <p>
          These terms govern your use of {SITE_CONFIG.url} and the purchase of tickets through our
          platform. By creating an account or purchasing tickets, you agree to these terms.
        </p>
        <div>
          <h2 className="font-display font-bold text-lg text-bb-text mb-2">Ticket purchases</h2>
          <p>
            All ticket sales are processed securely via Stripe. Tickets are non-transferable unless
            explicitly stated by the event organizer. Please review each event&apos;s specific refund
            policy before purchasing.
          </p>
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-bb-text mb-2">Cancellations by organizers</h2>
          <p>
            If an event is cancelled by the organizer, ticket holders will be notified by email and
            refunds will be processed according to our{' '}
            <a href="/refund-policy" className="text-bb-green underline">refund policy</a>.
          </p>
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-bb-text mb-2">Account responsibilities</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and
            for all activity under your account.
          </p>
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-bb-text mb-2">Contact</h2>
          <p>Questions about these terms can be sent to {SITE_CONFIG.supportEmail}.</p>
        </div>
      </div>
    </div>
  );
}
