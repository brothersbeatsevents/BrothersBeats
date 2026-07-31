import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEventSSR } from '@/lib/server-api';
import { SITE_CONFIG } from '@/lib/site-config';
import { eventJsonLd, breadcrumbJsonLd, JsonLd } from '@/lib/json-ld';
import EventHero from '@/components/ui/EventHero';
import EventDetailTiers from './EventDetailTiers';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventSSR(slug);
  if (!event) return { title: 'Event not found' };

  return {
    title: event.title,
    description: event.shortDescription,
    openGraph: {
      title: event.title,
      description: event.shortDescription,
      url: `${SITE_CONFIG.url}/events/${slug}`,
      images: event.heroImageUrl ? [{ url: event.heroImageUrl, alt: event.title }] : undefined,
    },
    alternates: { canonical: `/events/${slug}` },
  };
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
  const event = await getEventSSR(slug);
  if (!event) notFound();

  return (
    <div className="pb-16">
      <JsonLd data={eventJsonLd(event)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: '/' },
          { name: 'Events', url: '/events' },
          { name: event.title, url: `/events/${slug}` },
        ])}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4">
        <Link href="/events" className="text-sm text-bb-text-secondary hover:text-bb-green">
          &larr; Back to events
        </Link>
      </div>

      <EventHero event={event} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="font-display font-bold text-xl text-bb-text mb-3">About this event</h2>
            <p className="text-bb-text-secondary whitespace-pre-line">{event.longDescription}</p>
          </div>
          {event.refundPolicy && (
            <div>
              <h2 className="font-display font-bold text-lg text-bb-text mb-2">Refund policy</h2>
              <p className="text-sm text-bb-text-secondary whitespace-pre-line">{event.refundPolicy}</p>
            </div>
          )}
        </div>

        <div>
          <EventDetailTiers event={event} />
        </div>
      </div>
    </div>
  );
}
