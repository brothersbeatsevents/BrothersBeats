import type { Metadata } from 'next';
import Link from 'next/link';
import { getEventsSSR } from '@/lib/server-api';
import { SITE_CONFIG } from '@/lib/site-config';
import { pageMetadata } from '@/lib/seo';
import { JsonLd, breadcrumbJsonLd, itemListJsonLd } from '@/lib/json-ld';
import EventGrid from '@/components/ui/EventGrid';
import type { EventCardData } from '@/components/ui/EventCard';
import EventsFilterBar from './EventsFilterBar';

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function readParams(sp: SearchParams) {
  return {
    category: first(sp.category) || undefined,
    city: first(sp.city) || undefined,
    q: first(sp.q) || undefined,
    sort: first(sp.sort) || undefined,
    past: first(sp.view) === 'past',
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { category, city, q, sort, past } = readParams(await searchParams);
  const filtered = !!(category || city || q || sort);

  const meta = past
    ? pageMetadata({
        title: 'Past events',
        description: `Look back at past events hosted by ${SITE_CONFIG.name} in Dublin and across Ireland.`,
        path: '/events?view=past',
      })
    : pageMetadata({
        title: 'Upcoming Events & Tickets, Dublin',
        description: `Browse upcoming live music, comedy, community and cultural events from ${SITE_CONFIG.name} and book your tickets online.`,
        path: '/events',
      });

  // Filtered/search result URLs are thin duplicates of the main listing.
  return filtered ? { ...meta, robots: { index: false, follow: true } } : meta;
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { category, city, q, sort, past } = readParams(await searchParams);
  const filtered = !!(category || city || q || sort);

  const [all, events]: [EventCardData[], EventCardData[]] = await Promise.all([
    getEventsSSR({ past }),
    filtered ? getEventsSSR({ category, city, q, sort, past }) : getEventsSSR({ past }),
  ]);
  const cities = Array.from(new Set(all.map((e) => e.city))).sort();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: '/' },
          { name: 'Events', url: '/events' },
        ])}
      />
      {events.length > 0 && !filtered && (
        <JsonLd
          data={itemListJsonLd(events.map((e) => ({ name: e.title, url: `/events/${e.slug}` })))}
        />
      )}

      <h1 className="font-display font-bold text-3xl sm:text-4xl text-bb-text mb-6">
        {past ? 'Past events' : 'Upcoming events'}
      </h1>
      <nav className="flex gap-2 mb-6" aria-label="Event views">
        <Link
          href="/events"
          aria-current={!past ? 'page' : undefined}
          className={`px-4 py-2 rounded-full text-sm font-semibold ${!past ? 'bg-bb-gold text-bb-ink' : 'border border-bb-border text-bb-text-secondary'}`}
        >
          Upcoming
        </Link>
        <Link
          href="/events?view=past"
          aria-current={past ? 'page' : undefined}
          className={`px-4 py-2 rounded-full text-sm font-semibold ${past ? 'bg-bb-gold text-bb-ink' : 'border border-bb-border text-bb-text-secondary'}`}
        >
          Past events
        </Link>
      </nav>
      <EventsFilterBar values={{ category, city, q, sort }} cities={cities} past={past} />
      <EventGrid events={events} />
    </div>
  );
}
