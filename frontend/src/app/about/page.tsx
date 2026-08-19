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
            Your destination for unforgettable live entertainment across Ireland — concerts,
            comedy, private events, sports, and exclusive experiences.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 space-y-8">
        <div>
          <p className="text-bb-text-secondary">
            Brothers Beats Events was born from our passion for creativity and our love for bringing
            people together. We wanted to create something that helps people turn their ideas into
            events that go beyond expectations. We saw that event planning could be easier, more
            professional and less stressful, so we wanted to change that. Our goal is to take the
            pressure out of planning, giving people more time to focus on enjoying the experience.
            For us, it’s about creating events where people can switch off from everyday life, have
            fun and make memories they’ll genuinely remember.
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
