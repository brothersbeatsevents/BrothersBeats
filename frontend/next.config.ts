import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

const nextConfig = (phase: string): NextConfig => ({
  // Keep `next dev` artifacts separate from production builds. Next otherwise
  // writes both processes to `.next`, so running `npm run build` while the dev
  // server is open can remove manifests that the dev server is actively using.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // Applies to all pages: restrict embeddable frames to the privacy-enhanced
        // YouTube player used by the gallery — never allow arbitrary iframe sources.
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-src 'self' https://www.youtube-nocookie.com;",
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
