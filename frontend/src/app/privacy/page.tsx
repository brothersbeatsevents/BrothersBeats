import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: `Privacy policy for ${SITE_CONFIG.name} — how we collect, use, and protect your personal information.`,
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-display font-bold text-4xl text-bb-text mb-2">Privacy policy</h1>
      <p className="text-sm text-bb-text-muted mb-8">Last updated: {new Date().getFullYear()}</p>

      <div className="prose prose-sm max-w-none text-bb-text-secondary space-y-6">
        <p>
          {SITE_CONFIG.name} (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) is committed to
          protecting your privacy. This policy explains how we collect, use, and safeguard your
          personal information when you use {SITE_CONFIG.url}.
        </p>
        <div>
          <h2 className="font-display font-bold text-lg text-bb-text mb-2">Information we collect</h2>
          <p>
            When you book tickets, subscribe to updates, or contact us, we collect your name, email
            address, phone number (optional), and payment details (processed securely by Stripe — we
            never store your card details).
          </p>
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-bb-text mb-2">How we use your information</h2>
          <p>
            We use your information to process bookings, deliver tickets, send booking-related
            communications, and — with your consent — share updates about future events.
          </p>
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-bb-text mb-2">Your rights</h2>
          <p>
            You may request access to, correction of, or deletion of your personal data at any time
            by contacting {SITE_CONFIG.supportEmail}. You can unsubscribe from marketing emails at any
            time using the link in any email or via our unsubscribe page.
          </p>
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-bb-text mb-2">Contact us</h2>
          <p>
            For any privacy-related questions, contact us at {SITE_CONFIG.supportEmail}.
          </p>
        </div>
      </div>
    </div>
  );
}
