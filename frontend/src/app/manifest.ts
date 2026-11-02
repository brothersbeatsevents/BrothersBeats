import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/lib/site-config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: SITE_CONFIG.name,
    short_name: 'Brothers Beats',
    description: SITE_CONFIG.description,
    lang: 'en-IE',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FFFDF8',
    theme_color: '#087A3E',
    categories: ['entertainment', 'events', 'lifestyle'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
