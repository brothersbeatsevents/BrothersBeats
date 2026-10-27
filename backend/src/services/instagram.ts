// Store only a canonical Reel URL and shortcode, never user-supplied embed HTML.
const ALLOWED_HOSTNAMES = new Set(['instagram.com', 'www.instagram.com', 'm.instagram.com']);
const SHORTCODE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function normalizeInstagramReelUrl(rawUrl: string): { shortcode: string; canonicalUrl: string } | null {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;

  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  if (!['https:', 'http:'].includes(url.protocol) || !ALLOWED_HOSTNAMES.has(url.hostname.toLowerCase())) return null;
  if (url.username || url.password || url.port) return null;

  const match = /^\/(?:reel|reels)\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname);
  if (!match || !SHORTCODE_PATTERN.test(match[1])) return null;

  return { shortcode: match[1], canonicalUrl: `https://www.instagram.com/reel/${match[1]}/` };
}
