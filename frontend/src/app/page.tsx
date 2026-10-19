import type { Metadata } from 'next';
import Link from 'next/link';
import { getEventsSSR, getGallerySSR, getSettingsSSR, getSponsorsSSR } from '@/lib/server-api';
import { SITE_CONFIG } from '@/lib/site-config';
import { organizationJsonLd, JsonLd } from '@/lib/json-ld';
import EventGrid from '@/components/ui/EventGrid';
import SponsorGrid from '@/components/ui/SponsorGrid';
import HeroCarousel from '@/components/ui/HeroCarousel';
import GalleryMediaThumbnail from '@/components/ui/GalleryMediaThumbnail';
import { getHeroImages } from '@/lib/hero-images';

export const metadata: Metadata = {
  title: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
  description: SITE_CONFIG.description,
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const events = await getEventsSSR();
  const upcoming = events.filter((e: any) => e.status === 'PUBLISHED' || e.status === 'SALES_PAUSED').slice(0, 6);
  const gallery = (await getGallerySSR()).slice(0, 8);
  const settings = await getSettingsSSR();
  const heroImages = getHeroImages(settings);
  const sponsors = await getSponsorsSSR();
  return (
    <>
      <JsonLd data={organizationJsonLd()} />

      {heroImages.length > 0 ? (
        <HeroCarousel images={heroImages} />
      ) : (
        <section className="bg-bb-neutral">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
            <h1 className="font-display font-bold text-4xl sm:text-6xl text-bb-text leading-tight">
              {SITE_CONFIG.tagline}
            </h1>
            <p className="mt-4 text-lg text-bb-text-secondary max-w-2xl mx-auto">
              Discover and book tickets for the best live music, community gatherings, and
              celebrations near you.
            </p>
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-bb-text">Upcoming events</h2>
          <Link href="/events" className="text-sm font-semibold text-bb-gold hover:text-bb-gold-dark">
            View all &rarr;
          </Link>
        </div>
        <EventGrid events={upcoming} />
      </section>

      {gallery.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-bb-text">Event memories</h2>
            <Link href="/gallery" className="text-sm font-semibold text-bb-gold hover:text-bb-gold-dark">
              View gallery &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {gallery.map((item: any) => (
              <Link
                key={item.id}
                href="/gallery"
                className="group relative block aspect-[4/3] overflow-hidden rounded-2xl border border-bb-border bg-bb-neutral"
              >
                <GalleryMediaThumbnail item={item} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {sponsors.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-bb-text text-center mb-8">Our Sponsors</h2>
          <SponsorGrid sponsors={sponsors} />
        </section>
      )}

      {settings?.whatsappGroupUrl && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-bb-text-secondary">Join Our</p>
          <h2 className="mt-1 font-display font-bold text-2xl sm:text-3xl text-bb-text">WhatsApp Announcement Group</h2>
          <p className="mt-3 text-bb-text-secondary max-w-xl mx-auto">
            Get instant updates on upcoming events, ticket releases, and exclusive offers.
          </p>
          <a
            href={settings.whatsappGroupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block bg-bb-gold text-bb-ink font-semibold px-6 py-3 rounded-full hover:bg-bb-gold-dark transition-colors"
          >
            Join Now
          </a>
        </section>
      )}

      <section className="bg-bb-gold">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h2 className="font-display font-bold text-3xl text-bb-ink">Planning a private event?</h2>
          <p className="mt-3 text-bb-ink/80 max-w-xl mx-auto">
            Brothers Beats can plan and manage your wedding, birthday, or corporate celebration as a paid,
            fully-organised private-event service.
          </p>
          <Link
            href="/services"
            className="mt-6 inline-block bg-bb-ink text-bb-gold font-semibold px-6 py-3 rounded-full hover:bg-bb-ink/80 transition-colors"
          >
            Plan a Private Event With Us
          </Link>
        </div>
      </section>
    </>
  );
}
