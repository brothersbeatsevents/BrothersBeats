/**
 * Server-side data fetching for SSR/SSG pages.
 * Runs on the server during render and calls the backend API directly.
 */

const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000/api';

async function serverFetch<T>(endpoint: string, revalidate?: number): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      next: { revalidate: revalidate ?? 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function getEventsSSR(params?: { category?: string; city?: string; q?: string; sort?: string }) {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.city) qs.set('city', params.city);
  if (params?.q) qs.set('q', params.q);
  if (params?.sort) qs.set('sort', params.sort);
  const query = qs.toString();
  return (await serverFetch<any[]>(`/events${query ? `?${query}` : ''}`)) ?? [];
}

export async function getEventSSR(slug: string) {
  return serverFetch<any>(`/events/${slug}`);
}

export async function getGallerySSR(params?: { featured?: boolean }) {
  const qs = new URLSearchParams();
  if (params?.featured) qs.set('featured', 'true');
  const query = qs.toString();
  return (await serverFetch<any[]>(`/gallery${query ? `?${query}` : ''}`)) ?? [];
}
