import { SITE_CONFIG } from './site-config';
import { absoluteUrl } from './seo';

const ORG_ID = () => `${absoluteUrl('/')}#organization`;
const SITE_ID = () => `${absoluteUrl('/')}#website`;

/** Generate Organization JSON-LD */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID(),
    name: SITE_CONFIG.name,
    url: absoluteUrl('/'),
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl(SITE_CONFIG.logo),
      width: 512,
      height: 512,
    },
    image: absoluteUrl(SITE_CONFIG.ogImage),
    description: SITE_CONFIG.description,
    email: SITE_CONFIG.supportEmail,
    address: {
      '@type': 'PostalAddress',
      addressLocality: SITE_CONFIG.address.city,
      addressCountry: SITE_CONFIG.address.country,
    },
    areaServed: { '@type': 'Country', name: 'Ireland' },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: SITE_CONFIG.supportEmail,
      areaServed: 'IE',
      availableLanguage: 'English',
    },
    sameAs: Object.values(SITE_CONFIG.socials).filter(Boolean),
  };
}

/** Generate WebSite JSON-LD (links the site to its publishing organisation) */
export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': SITE_ID(),
    url: absoluteUrl('/'),
    name: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    inLanguage: 'en-IE',
    publisher: { '@id': ORG_ID() },
  };
}

interface EventJsonLdInput {
  title: string;
  slug: string;
  shortDescription?: string;
  longDescription?: string;
  status?: string;
  startDateTime: string;
  endDateTime?: string;
  doorsOpenAt?: string;
  venueName?: string;
  venueAddress?: string;
  city?: string;
  countyOrRegion?: string;
  country?: string;
  heroImageUrl?: string;
  socialImageUrl?: string;
  galleryImageUrls?: string[];
  ticketTiers?: {
    id: string;
    name: string;
    description?: string;
    priceAmountMinor: number;
    currency: string;
    available: number;
    onSale: boolean;
    salesStartAt?: string;
    salesEndAt?: string;
  }[];
}

function eventStatusUrl(status?: string) {
  if (status === 'CANCELLED') return 'https://schema.org/EventCancelled';
  if (status === 'POSTPONED') return 'https://schema.org/EventPostponed';
  return 'https://schema.org/EventScheduled';
}

function offerAvailability(
  tier: NonNullable<EventJsonLdInput['ticketTiers']>[number],
  eventStatus?: string,
) {
  if (eventStatus === 'SOLD_OUT' || tier.available <= 0) return 'https://schema.org/SoldOut';
  if (tier.onSale) return 'https://schema.org/InStock';
  if (tier.salesStartAt && new Date(tier.salesStartAt).getTime() > Date.now()) {
    return 'https://schema.org/PreOrder';
  }
  return 'https://schema.org/OutOfStock';
}

/** Generate Event JSON-LD for a single event (eligible for Google event rich results) */
export function eventJsonLd(event: EventJsonLdInput) {
  const url = absoluteUrl(`/events/${event.slug}`);
  const images = [event.heroImageUrl, event.socialImageUrl, ...(event.galleryImageUrls || [])]
    .filter((u): u is string => !!u)
    .map((u) => absoluteUrl(u));
  const offers = (event.ticketTiers || []).map((tier) => ({
    '@type': 'Offer',
    name: tier.name,
    description: tier.description || undefined,
    url,
    price: (tier.priceAmountMinor / 100).toFixed(2),
    priceCurrency: tier.currency || 'EUR',
    availability: offerAvailability(tier, event.status),
    validFrom: tier.salesStartAt,
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `${url}#event`,
    name: event.title,
    description: event.shortDescription || event.longDescription,
    startDate: event.startDateTime,
    endDate: event.endDateTime,
    doorTime: event.doorsOpenAt,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: eventStatusUrl(event.status),
    location: {
      '@type': 'Place',
      name: event.venueName || event.city || SITE_CONFIG.address.city,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.venueAddress,
        addressLocality: event.city || SITE_CONFIG.address.city,
        addressRegion: event.countyOrRegion,
        addressCountry: event.country || SITE_CONFIG.address.country,
      },
    },
    organizer: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      url: absoluteUrl('/'),
    },
    image: images.length ? images : [absoluteUrl(SITE_CONFIG.ogImage)],
    url,
    ...(offers.length > 0 && { offers }),
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
      item: absoluteUrl(item.url),
    })),
  };
}

/** Generate ItemList JSON-LD for a listing page (e.g. upcoming events) */
export function itemListJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteUrl(item.url),
      name: item.name,
    })),
  };
}

/** Generate Service JSON-LD for the paid private-event management offering */
export function serviceJsonLd(service: { name: string; description: string; path: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.description,
    url: absoluteUrl(service.path),
    serviceType: 'Event planning and management',
    provider: { '@id': ORG_ID() },
    areaServed: { '@type': 'Country', name: 'Ireland' },
  };
}

/** Render JSON-LD; `<` is escaped so user-authored text can't close the script tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
