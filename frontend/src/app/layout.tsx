import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import Header from '@/components/Header';
import { getSettingsSSR } from '@/lib/server-api';
import Footer from '@/components/Footer';
import { SITE_CONFIG } from '@/lib/site-config';
import { organizationJsonLd, websiteJsonLd, JsonLd } from '@/lib/json-ld';
import CookieBanner from '@/components/CookieBanner';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
  variable: '--font-display',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#087A3E',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: SITE_CONFIG.description,
  applicationName: SITE_CONFIG.name,
  authors: [{ name: SITE_CONFIG.name, url: SITE_CONFIG.url }],
  creator: SITE_CONFIG.name,
  publisher: SITE_CONFIG.name,
  category: 'events',
  formatDetection: { telephone: false, email: false, address: false },
  keywords: [
    'Brothers Beats Events',
    'event tickets Dublin',
    'buy tickets Ireland',
    'live music Dublin',
    'comedy shows Dublin',
    'event management Ireland',
    'wedding planner Dublin',
    'corporate events Dublin',
    'community events Ireland',
  ],
  icons: {
    icon: [
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.png', sizes: '128x128', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: '/favicon.png',
  },
  openGraph: {
    type: 'website',
    locale: SITE_CONFIG.locale,
    url: '/',
    siteName: SITE_CONFIG.name,
    title: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
    description: SITE_CONFIG.description,
    images: [
      { url: SITE_CONFIG.ogImage, width: 1200, height: 630, alt: SITE_CONFIG.name },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: SITE_CONFIG.twitter,
    title: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
    description: SITE_CONFIG.description,
    images: [SITE_CONFIG.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettingsSSR();
  return (
    <html lang="en-IE" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen flex flex-col bg-bb-bg text-bb-text font-body">
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
        <CookieBanner />
        <AuthProvider>
          <Header whatsappUrl={settings?.whatsappGroupUrl} />
          <main className="min-w-0 w-full flex-1">{children}</main>
          <Footer whatsappUrl={settings?.whatsappGroupUrl} />
        </AuthProvider>
      </body>
    </html>
  );
}
