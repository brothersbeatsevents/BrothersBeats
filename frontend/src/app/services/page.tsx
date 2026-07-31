import type { Metadata } from 'next';
import Link from 'next/link';
import EventServiceEnquiryForm from '@/components/ui/EventServiceEnquiryForm';

export const metadata: Metadata = {
  title: 'Services',
  description: 'Brothers Beats hosts and sells tickets for its own events, and offers paid private-event management for weddings, birthdays, and corporate celebrations.',
  alternates: { canonical: '/services' },
};

const TICKETED_HIGHLIGHTS = [
  'Secure, Stripe-powered checkout with flexible ticket tiers and group bookings.',
  'QR-coded digital tickets delivered by email, with fast check-in on the day.',
  'A searchable public events listing plus subscriber email updates.',
];

const PRIVATE_EVENT_HIGHLIGHTS = [
  'Full planning and on-the-day coordination for weddings, birthdays, and corporate events.',
  'Entertainment booking, venue liaison, and guest experience management.',
  'A dedicated Brothers Beats team handling the details, start to finish.',
];

export default function ServicesPage() {
  return (
    <div>
      <section className="bg-bb-neutral">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h1 className="font-display font-bold text-4xl sm:text-5xl text-bb-text">What Brothers Beats offers</h1>
          <p className="mt-4 text-lg text-bb-text-secondary max-w-2xl mx-auto">
            Brothers Beats is the organiser and ticket seller for every event on this site — and we also plan and
            run paid private events on your behalf.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-bb-surface border border-bb-border rounded-2xl p-6">
          <h2 className="font-display font-bold text-xl text-bb-text mb-2">Brothers Beats ticketed events</h2>
          <p className="text-bb-text-secondary text-sm mb-4">
            We create, host, and sell tickets for our own public events — you buy a ticket, we run the show.
          </p>
          <ul className="space-y-2 text-sm text-bb-text-secondary mb-6">
            {TICKETED_HIGHLIGHTS.map((h) => (
              <li key={h} className="flex gap-2">
                <span className="text-bb-green">•</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/events"
            className="inline-block bg-bb-orange hover:bg-bb-orange-dark text-white font-semibold px-6 py-2.5 rounded-full text-sm transition-colors"
          >
            Browse upcoming events
          </Link>
        </div>

        <div className="bg-bb-surface border border-bb-border rounded-2xl p-6">
          <h2 className="font-display font-bold text-xl text-bb-text mb-2">Paid private-event management</h2>
          <p className="text-bb-text-secondary text-sm mb-4">
            Planning a wedding, birthday, or corporate celebration? Our team can manage it for you as a paid,
            fully-organised service — this is not self-service ticketing, and there is no organiser account or
            dashboard to set up.
          </p>
          <ul className="space-y-2 text-sm text-bb-text-secondary">
            {PRIVATE_EVENT_HIGHLIGHTS.map((h) => (
              <li key={h} className="flex gap-2">
                <span className="text-bb-green">•</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-bb-neutral">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="font-display font-bold text-2xl text-bb-text mb-2 text-center">Enquire about a private event</h2>
          <p className="text-bb-text-secondary text-sm mb-8 text-center">
            Tell us about your event and a member of the Brothers Beats team will be in touch. Submitting an
            enquiry does not create a booking or charge — it starts a conversation with our team.
          </p>
          <EventServiceEnquiryForm source="SERVICES_PAGE" />
        </div>
      </section>
    </div>
  );
}

