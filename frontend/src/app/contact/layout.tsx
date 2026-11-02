import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/lib/site-config';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Contact & Event Enquiries',
  description: `Get in touch with ${SITE_CONFIG.name} for ticket support, sponsorship, or to plan your wedding, birthday or corporate event in Dublin and across Ireland.`,
  path: '/contact',
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
