import CategoryPill from './CategoryPill';
import { formatEventDate, formatEventTime } from '@/lib/format';

export interface EventHeroData {
  title: string;
  category: string;
  shortDescription: string;
  city: string;
  venueName: string;
  venueAddress?: string;
  startDateTime: string;
  endDateTime: string;
  doorsOpenAt?: string;
  timezone: string;
  status: string;
  heroImageUrl?: string;
  cancellationMessage?: string;
}

export default function EventHero({ event }: { event: EventHeroData }) {
  return (
    <div className="bg-bb-neutral">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {event.status === 'CANCELLED' && (
          <div className="mb-6 bg-[#FFF0EF] border border-bb-red/30 text-bb-red rounded-xl p-4 text-sm font-medium">
            This event has been cancelled. {event.cancellationMessage}
          </div>
        )}
        <div className="rounded-2xl overflow-hidden bg-bb-bg-surface aspect-[16/7] mb-6">
          {event.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.heroImageUrl} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-bb-text-muted bg-bb-pale-green" />
          )}
        </div>
        <CategoryPill category={event.category} />
        <h1 className="mt-3 font-display font-bold text-3xl sm:text-4xl text-bb-text">{event.title}</h1>
        <p className="mt-3 text-bb-text-secondary max-w-2xl">{event.shortDescription}</p>

        <div className="mt-6 flex flex-wrap gap-6 text-sm">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-bb-green shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <div>
              <p className="font-semibold text-bb-text">{formatEventDate(event.startDateTime, event.timezone)}</p>
              <p className="text-bb-text-secondary">
                {formatEventTime(event.startDateTime, event.timezone)} – {formatEventTime(event.endDateTime, event.timezone)}
                {event.doorsOpenAt && ` · Doors ${formatEventTime(event.doorsOpenAt, event.timezone)}`}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-bb-green shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <div>
              <p className="font-semibold text-bb-text">{event.venueName}</p>
              <p className="text-bb-text-secondary">{event.venueAddress ? `${event.venueAddress}, ` : ''}{event.city}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
