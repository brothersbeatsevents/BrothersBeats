'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getEvents } from '@/lib/api';

export default function GlobalEventSearch({ className }: { className?: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await getEvents({ q: query });
        setResults(res.data.slice(0, 6));
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function goToEvents() {
    router.push(`/events?q=${encodeURIComponent(query)}`);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => e.key === 'Enter' && goToEvents()}
        placeholder="Search events, venues, cities…"
        className="w-full rounded-full border border-bb-border bg-bb-surface px-5 py-3 text-sm text-bb-text focus:outline-none focus:ring-2 focus:ring-bb-green"
      />
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-bb-surface border border-bb-border rounded-2xl shadow-xl overflow-hidden z-20">
          {results.map((event) => (
            <button
              key={event.id}
              onClick={() => {
                router.push(`/events/${event.slug}`);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-bb-neutral transition-colors text-sm text-bb-text border-b border-bb-border last:border-none"
            >
              {event.title} <span className="text-bb-text-muted">· {event.city}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
