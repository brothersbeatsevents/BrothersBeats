'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { HeroImage } from '@/lib/hero-images';

export default function HeroCarousel({ images }: { images: HeroImage[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(true);
  const multiple = images.length > 1;

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPaused(motion.matches);
    const onMotionChange = () => { if (motion.matches) setPaused(true); };
    const onVisibilityChange = () => setVisible(!document.hidden);
    onVisibilityChange();
    motion.addEventListener('change', onMotionChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      motion.removeEventListener('change', onMotionChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!multiple || paused || hovered || !visible) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % images.length), 5000);
    return () => window.clearInterval(timer);
  }, [images.length, multiple, paused, hovered, visible]);

  function goTo(index: number) {
    setPaused(true);
    setActive((index + images.length) % images.length);
  }

  if (!images.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8" aria-label="Featured events">
      <div
        className="relative aspect-video w-full overflow-hidden rounded-3xl bg-bb-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bb-gold"
        role="region"
        aria-roledescription={multiple ? 'carousel' : undefined}
        aria-label="Homepage highlights"
        tabIndex={multiple ? 0 : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClickCapture={(event) => {
          if (!(event.target as HTMLElement).closest('[data-carousel-playback]')) setPaused(true);
        }}
        onFocusCapture={(event) => {
          if (!(event.target as HTMLElement).closest('[data-carousel-playback]')) setPaused(true);
        }}
        onKeyDown={(event) => {
          if (!multiple) return;
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            goTo(active + (event.key === 'ArrowRight' ? 1 : -1));
          }
        }}
      >
        <div className="absolute inset-0" aria-live={paused ? 'polite' : 'off'} aria-atomic="true">
          {images.map((image, index) => (
            <div
              key={`${image.url}-${index}`}
              role="group"
              aria-roledescription={multiple ? 'slide' : undefined}
              aria-label={`${index + 1} of ${images.length}`}
              aria-hidden={index !== active}
              className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${index === active ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.alt || ''}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: image.position || '50% 50%', transform: `scale(${image.zoom || 1})` }}
              />
            </div>
          ))}
        </div>

        {multiple && (
          <>
            <button type="button" onClick={() => goTo(active - 1)} aria-label="Previous slide" className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/65 text-white text-2xl hover:bg-black/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              <span aria-hidden="true">‹</span>
            </button>
            <button type="button" onClick={() => goTo(active + 1)} aria-label="Next slide" className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/65 text-white text-2xl hover:bg-black/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              <span aria-hidden="true">›</span>
            </button>
            <div className="absolute left-2 bottom-2 sm:left-6 sm:bottom-6 flex items-center rounded-full bg-black/70 px-1 text-white">
              <button
                type="button"
                data-carousel-playback
                onClick={() => setPaused((current) => !current)}
                aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                <span aria-hidden="true">{paused ? '▶' : 'Ⅱ'}</span>
              </button>
              <div className="flex" role="group" aria-label="Choose a slide">
                {images.map((image, index) => (
                  <button
                    key={`${image.url}-${index}`}
                    type="button"
                    onClick={() => goTo(index)}
                    aria-label={`Show slide ${index + 1}`}
                    aria-current={index === active ? 'true' : undefined}
                    className="flex h-11 w-6 sm:w-8 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <span className={`h-2 w-2 rounded-full ${index === active ? 'bg-bb-gold' : 'bg-white/60'}`} />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        <Link
          href="/events"
          className={`absolute right-2 ${multiple ? 'bottom-16' : 'bottom-2'} sm:right-8 sm:bottom-8 bg-bb-gold text-bb-ink text-xs sm:text-base font-semibold px-3 sm:px-6 py-3 rounded-full hover:bg-bb-gold-dark transition-colors`}
        >
          Explore Events
        </Link>
      </div>
    </section>
  );
}
