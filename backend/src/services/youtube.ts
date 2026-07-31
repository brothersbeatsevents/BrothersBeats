// ──────────────────────────────────────────
// YouTube URL validation & normalisation
// Extracts a validated video ID from an allow-listed YouTube URL shape.
// Never accepts or stores arbitrary iframe/embed HTML — only a canonical
// URL + video ID that the frontend renders through a controlled component.
// ──────────────────────────────────────────

const ALLOWED_HOSTNAMES = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
]);

// A YouTube video ID is exactly 11 URL-safe base64 characters.
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export interface NormalizedYouTubeVideo {
  videoId: string;
  canonicalUrl: string;
}

/**
 * Validate and normalise a YouTube URL.
 * Returns null if the URL is malformed, uses an unsupported hostname, or
 * points at a playlist/channel/shorts/live URL shape rather than a single
 * standard video.
 */
export function normalizeYouTubeUrl(rawUrl: string): NormalizedYouTubeVideo | null {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;

  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const hostname = url.hostname.toLowerCase();
  if (!ALLOWED_HOSTNAMES.has(hostname)) return null;

  let videoId: string | null = null;

  if (hostname === 'youtu.be') {
    // youtu.be/<id> — reject anything with extra path segments
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length === 1) videoId = segments[0];
  } else {
    // youtube.com / www.youtube.com / m.youtube.com
    const segments = url.pathname.split('/').filter(Boolean);

    if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v');
    } else if (segments[0] === 'embed' && segments.length === 2) {
      videoId = segments[1];
    } else {
      // Reject playlists (/playlist), channels (/channel, /c, /@handle),
      // shorts (/shorts/...), live (/live/...), and any other URL shape.
      return null;
    }
  }

  if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) return null;

  return {
    videoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}
