'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getEvents } from '@/lib/api';
import EventGrid from '@/components/ui/EventGrid';
import EventFilters, { EventFilterValues } from '@/components/ui/EventFilters';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import ErrorState from '@/components/ui/ErrorState';

function EventsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const filters: EventFilterValues = {
    category: searchParams.get('category') || undefined,
    city: searchParams.get('city') || undefined,
    q: searchParams.get('q') || undefined,
    sort: searchParams.get('sort') || undefined,
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await getEvents(filters);
      setEvents(res.data);
    } catch {
      setError(true);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    load();
  }, [load]);

  function handleFilterChange(values: EventFilterValues) {
    const qs = new URLSearchParams();
    if (values.category) qs.set('category', values.category);
    if (values.city) qs.set('city', values.city);
    if (values.q) qs.set('q', values.q);
    if (values.sort) qs.set('sort', values.sort);
    router.push(`/events${qs.toString() ? `?${qs.toString()}` : ''}`);
  }

  const cities = Array.from(new Set(events.map((e) => e.city))).sort();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display font-bold text-3xl sm:text-4xl text-bb-text mb-6">All events</h1>
      <EventFilters values={filters} onChange={handleFilterChange} cities={cities} />
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState message="We couldn't load events right now." onRetry={load} />
      ) : (
        <EventGrid events={events} />
      )}
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 sm:px-6 py-10"><LoadingSkeleton /></div>}>
      <EventsPageContent />
    </Suspense>
  );
}
