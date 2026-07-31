/** Site-wide constants used in metadata, structured data, and OG tags */
export const SITE_CONFIG = {
  name: 'Brothers Beats Events',
  tagline: 'Fresh Events. Vibrant Energy.',
  description:
    'Discover and book tickets for memorable events created by Brothers Beats — live music, community gatherings, corporate events, and celebrations.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.brothersbeats.events',
  ogImage: '/images/og-default.jpg',
  locale: 'en_IE',
  twitter: '@BrothersBeatsEvents',
  supportEmail: 'support@brothersbeats.events',
  socials: {
    facebook: 'https://www.facebook.com/brothersbeatsevents',
    instagram: 'https://www.instagram.com/brothersbeatsevents',
  },
  address: {
    street: 'Dublin, Ireland',
    city: 'Dublin',
    country: 'IE',
  },
};

export const EVENT_CATEGORIES = [
  'ENTERTAINMENT',
  'COMMUNITY',
  'CORPORATE',
  'WEDDING',
  'BIRTHDAY',
  'OTHER',
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  ENTERTAINMENT: 'Entertainment & Live Shows',
  COMMUNITY: 'Community Events',
  CORPORATE: 'Corporate Events',
  WEDDING: 'Weddings & Celebrations',
  BIRTHDAY: 'Birthdays & Parties',
  OTHER: 'Other',
};

export const EVENT_SERVICE_TYPES = [
  'BIRTHDAY',
  'PRIVATE_PARTY',
  'WEDDING',
  'CORPORATE',
  'COMMUNITY',
  'ENTERTAINMENT',
  'OTHER',
] as const;

export const EVENT_SERVICE_TYPE_LABELS: Record<string, string> = {
  BIRTHDAY: 'Birthday party',
  PRIVATE_PARTY: 'Private party',
  WEDDING: 'Wedding',
  CORPORATE: 'Corporate event',
  COMMUNITY: 'Community event',
  ENTERTAINMENT: 'Entertainment / live show',
  OTHER: 'Other',
};
