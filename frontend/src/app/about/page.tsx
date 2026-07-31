import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'About us',
  description: `Learn about ${SITE_CONFIG.name} and our mission to bring memorable events to life.`,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <div>
      <section className="bg-bb-neutral">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h1 className="font-display font-bold text-4xl sm:text-5xl text-bb-text">About Brothers Beats</h1>
          <p className="mt-4 text-lg text-bb-text-secondary max-w-2xl mx-auto">
            Brothers Beats creates and hosts unforgettable events — from live music to community
            gatherings and corporate celebrations — and sells the tickets to attend them.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 space-y-8">
        <div>
          <h2 className="font-display font-bold text-2xl text-bb-text mb-3">Our mission</h2>
          <p className="text-bb-text-secondary">
            Brothers Beats Events was founded to make attending events simple, transparent, and
            enjoyable. As the organiser behind every event on this site, we handle the
            logistics — secure payments, digital tickets, and communications — so attendees can
            focus on enjoying great experiences. We also offer paid private-event management for
            weddings, birthdays, and corporate celebrations.
          </p>
        </div>
        <div>
          <h2 className="font-display font-bold text-2xl text-bb-text mb-3">What we offer</h2>
          <ul className="text-bb-text-secondary space-y-2 list-disc list-inside">
            <li>Secure, mobile-friendly ticket checkout powered by Stripe</li>
            <li>Digital tickets with QR codes for fast entry</li>
            <li>Flexible ticket tiers — early bird, group, VIP, and more</li>
            <li>Email updates for subscribers about upcoming events</li>
            <li>Paid private-event planning and management, on enquiry</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
