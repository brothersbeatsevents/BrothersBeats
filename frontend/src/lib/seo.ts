import type { Metadata } from 'next';
import { SITE_CONFIG } from './site-config';

/** Resolve a site-relative path to an absolute URL on the canonical origin. */
export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = SITE_CONFIG.url.replace(/\/+$/, '');
  return path === '/' || path === '' ? base : `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Trim copy to a search-snippet friendly length without cutting mid-word. */
export function truncate(text: string | undefined, max = 158): string | undefined {
  if (!text) return undefined;
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 40)).replace(/[.,;:\-–—\s]+$/, '')}…`;
}

interface PageMetadataInput {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  noIndex?: boolean;
}

/**
 * Build complete per-page metadata. Next.js shallow-merges metadata, so a page
 * that sets only `title` would otherwise inherit the homepage's og:url and
 * og:title; this keeps canonical, Open Graph and Twitter tags page-specific.
 */
export function pageMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  noIndex,
}: PageMetadataInput): Metadata {
  const socialTitle = `${title} | ${SITE_CONFIG.name}`;
  const images = [
    image
      ? { url: image, alt: imageAlt || title }
      : { url: SITE_CONFIG.ogImage, width: 1200, height: 630, alt: SITE_CONFIG.name },
  ];

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: SITE_CONFIG.locale,
      siteName: SITE_CONFIG.name,
      url: absoluteUrl(path),
      title: socialTitle,
      description,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      site: SITE_CONFIG.twitter,
      title: socialTitle,
      description,
      images: images.map((i) => i.url),
    },
    ...(noIndex && { robots: { index: false, follow: true } }),
  };
}
