import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

export const revalidate = 3600;

const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000/api';

interface SitemapEvent {
  slug: string;
  updatedAt?: string;
}

async function fetchEvents(): Promise<SitemapEvent[]> {
  try {
    const res = await fetch(`${API_URL}/events`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).filter((item: SitemapEvent) => item.slug);
  } catch {
    return [];
  }
}

// lastModified is only set when we know it; stamping every URL with "now"
// teaches crawlers to ignore the field.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await fetchEvents();

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/events'), changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/services'), changeFrequency: 'monthly', priority: 0.7 },
    { url: absoluteUrl('/gallery'), changeFrequency: 'weekly', priority: 0.6 },
    { url: absoluteUrl('/about'), changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/contact'), changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/privacy'), changeFrequency: 'yearly', priority: 0.2 },
    { url: absoluteUrl('/terms'), changeFrequency: 'yearly', priority: 0.2 },
    { url: absoluteUrl('/refund-policy'), changeFrequency: 'yearly', priority: 0.2 },
  ];

  const eventPages: MetadataRoute.Sitemap = events.map((event) => ({
    url: absoluteUrl(`/events/${event.slug}`),
    ...(event.updatedAt && { lastModified: new Date(event.updatedAt) }),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...eventPages];
}
