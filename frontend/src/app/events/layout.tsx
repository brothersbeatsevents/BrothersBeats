import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Events',
  description: `Browse upcoming events on ${SITE_CONFIG.name} — live music, community gatherings, corporate events, and celebrations.`,
  alternates: { canonical: '/events' },
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
