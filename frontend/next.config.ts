import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

const nextConfig = (phase: string): NextConfig => ({
  // Keep `next dev` artifacts separate from production builds. Next otherwise
  // writes both processes to `.next`, so running `npm run build` while the dev
  // server is open can remove manifests that the dev server is actively using.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // Private/transactional areas must never appear in search results.
        source: '/:section(admin|account|auth|checkout|booking|unsubscribe)/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/unsubscribe',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        // Brand assets rarely change; let browsers and CDNs cache them.
        source: '/:file(icon-32.png|icon-192.png|icon-512.png|favicon.png|favicon.ico|apple-touch-icon.png)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
      {
        source: '/images/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
      {
        // Applies to all pages: restrict embeddable frames to the privacy-enhanced
        // YouTube player and Instagram Reels used by the gallery, plus the
        // Cloudflare Turnstile challenge iframe on the enquiry forms.
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "frame-src 'self' https://www.youtube-nocookie.com https://www.instagram.com https://challenges.cloudflare.com;",
          },
        ],
      },
      {
        // Scoped to payment pages that use Square/Google Pay.
        // same-origin-allow-popups is required for Google Pay popup (Square docs).
        // Do NOT use same-origin here — it breaks Google Pay on iOS (OR_BIBED_15).
        source: '/donate',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
      {
        source: '/events/:slug*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
});

export default nextConfig;
