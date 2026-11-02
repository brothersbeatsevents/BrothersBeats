import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/lib/site-config';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Event Photo & Video Gallery',
  description: `Photos and videos from past ${SITE_CONFIG.name} events in Dublin and across Ireland — relive the music, the crowds and the celebrations.`,
  path: '/gallery',
});

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
