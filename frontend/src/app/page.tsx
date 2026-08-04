import type { Metadata } from 'next';
import Link from 'next/link';
import { getEventsSSR, getGallerySSR, getSettingsSSR } from '@/lib/server-api';
import { SITE_CONFIG } from '@/lib/site-config';
import { organizationJsonLd, JsonLd } from '@/lib/json-ld';
import EventGrid from '@/components/ui/EventGrid';

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

  return (
    <>
      <JsonLd data={organizationJsonLd()} />

      {settings?.heroImageUrl ? (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
          <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-bb-text">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.heroImageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" aria-hidden />
            <div className="relative h-full flex flex-col justify-center px-6 sm:px-12 max-w-xl">
              <h1 className="font-display font-bold text-3xl sm:text-5xl text-white leading-tight">
                {SITE_CONFIG.tagline}
              </h1>
              <p className="mt-4 text-base sm:text-lg text-white/90">
                Discover and book tickets for the best live music, community gatherings, and
                celebrations near you.
              </p>
              <Link
                href="/events"
                className="mt-6 inline-block w-fit bg-white text-bb-text font-semibold px-6 py-3 rounded-full hover:bg-bb-lime transition-colors"
              >
                Explore Events
              </Link>
            </div>
          </div>
        </section>
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
          <Link href="/events" className="text-sm font-semibold text-bb-green hover:text-bb-green-dark">
            View all &rarr;
          </Link>
        </div>
        <EventGrid events={upcoming} />
      </section>

      {gallery.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-bb-text">Event memories</h2>
            <Link href="/gallery" className="text-sm font-semibold text-bb-green hover:text-bb-green-dark">
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.type === 'IMAGE' ? item.imageUrl : `https://img.youtube.com/vi/${item.youtubeVideoId}/hqdefault.jpg`}
                  alt={item.altText || item.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="bg-bb-green">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h2 className="font-display font-bold text-3xl text-white">Planning a private event?</h2>
          <p className="mt-3 text-white/85 max-w-xl mx-auto">
            Brothers Beats can plan and manage your wedding, birthday, or corporate celebration as a paid,
            fully-organised private-event service.
          </p>
          <Link
            href="/services"
            className="mt-6 inline-block bg-white text-bb-green font-semibold px-6 py-3 rounded-full hover:bg-bb-lime transition-colors"
          >
            Plan a Private Event With Us
          </Link>
        </div>
      </section>
    </>
  );
}
