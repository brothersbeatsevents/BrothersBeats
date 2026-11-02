'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import EventFilters, { EventFilterValues } from '@/components/ui/EventFilters';

/** Syncs the filter controls with the URL; the server page renders the results. */
export default function EventsFilterBar({
  values,
  cities,
  past,
}: {
  values: EventFilterValues;
  cities: string[];
  past: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [local, setLocal] = useState(values);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setLocal(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.category, values.city, values.q, values.sort]);

  useEffect(() => () => clearTimeout(timer.current), []);

  function navigate(next: EventFilterValues) {
    const qs = new URLSearchParams();
    if (past) qs.set('view', 'past');
    if (next.category) qs.set('category', next.category);
    if (next.city) qs.set('city', next.city);
    if (next.q) qs.set('q', next.q);
    if (next.sort) qs.set('sort', next.sort);
    const query = qs.toString();
    startTransition(() => router.push(`/events${query ? `?${query}` : ''}`));
  }

  function handleChange(next: EventFilterValues) {
    setLocal(next);
    clearTimeout(timer.current);
    // Debounce typing so each keystroke doesn't trigger a server render.
    if (next.q !== local.q) {
      timer.current = setTimeout(() => navigate(next), 350);
    } else {
      navigate(next);
    }
  }

  return <EventFilters values={local} onChange={handleChange} cities={cities} />;
}
