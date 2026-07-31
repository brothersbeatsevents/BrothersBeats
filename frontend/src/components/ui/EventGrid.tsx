import EventCard, { EventCardData } from './EventCard';
import EmptyState from './EmptyState';

export default function EventGrid({ events }: { events: EventCardData[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No events found"
        message="Try adjusting your filters or check back soon for new events."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
