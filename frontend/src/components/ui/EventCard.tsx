import Link from 'next/link';
import CategoryPill from './CategoryPill';
import { formatEventDate } from '@/lib/format';

export interface EventCardData {
  id: string;
  slug: string;
  title: string;
  category: string;
  shortDescription: string;
  city: string;
  venueName: string;
  startDateTime: string;
  timezone: string;
  status: string;
  heroImageUrl?: string;
}

export default function EventCard({ event }: { event: EventCardData }) {
  const soldOut = event.status === 'SOLD_OUT';
  const cancelled = event.status === 'CANCELLED';

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group block bg-bb-surface rounded-2xl border border-bb-border overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="relative aspect-[4/3] bg-bb-neutral overflow-hidden">
        {event.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.heroImageUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-bb-text-muted text-sm">
            No image
          </div>
        )}
        {(soldOut || cancelled) && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold uppercase tracking-wide text-sm">
              {cancelled ? 'Cancelled' : 'Sold out'}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <CategoryPill category={event.category} />
        <h3 className="mt-2 font-display font-bold text-bb-text text-lg leading-snug group-hover:text-bb-green transition-colors line-clamp-2">
          {event.title}
        </h3>
        <p className="mt-1 text-sm text-bb-text-secondary">
          {formatEventDate(event.startDateTime, event.timezone)}
        </p>
        <p className="text-sm text-bb-text-muted">
          {event.venueName}, {event.city}
        </p>
      </div>
    </Link>
  );
}
