import { SITE_CONFIG } from './site-config';

/** Generate Organization JSON-LD */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    logo: `${SITE_CONFIG.url}/images/logo.png`,
    description: SITE_CONFIG.description,
    address: {
      '@type': 'PostalAddress',
      addressLocality: SITE_CONFIG.address.city,
      addressCountry: SITE_CONFIG.address.country,
    },
    sameAs: [SITE_CONFIG.socials.facebook, SITE_CONFIG.socials.instagram],
  };
}

/** Generate Event JSON-LD for a single event */
export function eventJsonLd(event: {
  title: string;
  shortDescription?: string;
  startDateTime: string;
  endDateTime?: string;
  venueName?: string;
  city?: string;
  heroImageUrl?: string;
  slug: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.shortDescription,
    startDate: event.startDateTime,
    endDate: event.endDateTime,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: event.venueName || event.city || 'Dublin',
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.city || 'Dublin',
        addressCountry: 'IE',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
    image: event.heroImageUrl || `${SITE_CONFIG.url}${SITE_CONFIG.ogImage}`,
    url: `${SITE_CONFIG.url}/events/${event.slug}`,
  };
}

/** Generate BreadcrumbList JSON-LD */
export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_CONFIG.url}${item.url}`,
    })),
  };
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
