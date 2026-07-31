import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Brothers Beats Events',
    short_name: 'Brothers Beats',
    description:
      'Discover and book tickets for memorable events created by Brothers Beats.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFDF8',
    theme_color: '#087A3E',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
