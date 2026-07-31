'use client';

import { EVENT_CATEGORIES, CATEGORY_LABELS } from '@/lib/site-config';

export interface EventFilterValues {
  category?: string;
  city?: string;
  q?: string;
  sort?: string;
}

export default function EventFilters({
  values,
  onChange,
  cities,
}: {
  values: EventFilterValues;
  onChange: (values: EventFilterValues) => void;
  cities?: string[];
}) {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
      <input
        type="search"
        value={values.q || ''}
        onChange={(e) => onChange({ ...values, q: e.target.value })}
        placeholder="Search events…"
        className="flex-1 min-w-[200px] rounded-full border border-bb-border bg-bb-surface px-4 py-2.5 text-sm text-bb-text focus:outline-none focus:ring-2 focus:ring-bb-green"
      />
      <select
        value={values.category || ''}
        onChange={(e) => onChange({ ...values, category: e.target.value || undefined })}
        className="rounded-full border border-bb-border bg-bb-surface px-4 py-2.5 text-sm text-bb-text focus:outline-none focus:ring-2 focus:ring-bb-green"
      >
        <option value="">All categories</option>
        {EVENT_CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {CATEGORY_LABELS[cat]}
          </option>
        ))}
      </select>
      {cities && cities.length > 0 && (
        <select
          value={values.city || ''}
          onChange={(e) => onChange({ ...values, city: e.target.value || undefined })}
          className="rounded-full border border-bb-border bg-bb-surface px-4 py-2.5 text-sm text-bb-text focus:outline-none focus:ring-2 focus:ring-bb-green"
        >
          <option value="">All cities</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      )}
      <select
        value={values.sort || ''}
        onChange={(e) => onChange({ ...values, sort: e.target.value || undefined })}
        className="rounded-full border border-bb-border bg-bb-surface px-4 py-2.5 text-sm text-bb-text focus:outline-none focus:ring-2 focus:ring-bb-green"
      >
        <option value="">Soonest first</option>
        <option value="recent">Recently added</option>
      </select>
    </div>
  );
}
