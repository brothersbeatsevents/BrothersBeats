'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SITE_CONFIG } from '@/lib/site-config';

const FILLED = {
  facebook: 'M13.5 22v-9h3l.5-3.5h-3.5V7.25c0-1 .28-1.75 1.78-1.75H17.2V2.38A25.8 25.8 0 0 0 14.4 2C11.63 2 9.75 3.68 9.75 6.78V9.5H6.6V13h3.15v9h3.75Z',
  instagram:
    'M7.75 2h8.5A5.76 5.76 0 0 1 22 7.75v8.5A5.76 5.76 0 0 1 16.25 22h-8.5A5.76 5.76 0 0 1 2 16.25v-8.5A5.76 5.76 0 0 1 7.75 2Zm0 2A3.75 3.75 0 0 0 4 7.75v8.5A3.75 3.75 0 0 0 7.75 20h8.5A3.75 3.75 0 0 0 20 16.25v-8.5A3.75 3.75 0 0 0 16.25 4h-8.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.25-3.1a1.17 1.17 0 1 1 0 2.34 1.17 1.17 0 0 1 0-2.34Z',
  youtube:
    'M23.5 6.2a3 3 0 0 0-2.1-2.12C19.55 3.58 12 3.58 12 3.58s-7.55 0-9.4.5A3 3 0 0 0 .5 6.2 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.12c1.85.5 9.4.5 9.4.5s7.55 0 9.4-.5a3 3 0 0 0 2.1-2.12A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.5-5.8ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z',
  tiktok:
    'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
};

interface TopBarLink {
  name: string;
  href: string;
  icon: React.ReactNode;
  external: boolean;
}

function filledIcon(path: string) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d={path} />
    </svg>
  );
}

function strokeIcon(children: React.ReactNode) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export default function HeaderTopBar({ whatsappUrl }: { whatsappUrl?: string | null }) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const links: TopBarLink[] = [
    { name: 'Facebook', href: SITE_CONFIG.socials.facebook, icon: filledIcon(FILLED.facebook), external: true },
    { name: 'Instagram', href: SITE_CONFIG.socials.instagram, icon: filledIcon(FILLED.instagram), external: true },
    { name: 'YouTube', href: SITE_CONFIG.socials.youtube, icon: filledIcon(FILLED.youtube), external: true },
    { name: 'TikTok', href: SITE_CONFIG.socials.tiktok, icon: filledIcon(FILLED.tiktok), external: true },
    {
      name: 'Email',
      href: `mailto:${SITE_CONFIG.supportEmail}`,
      icon: strokeIcon(
        <>
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <path d="m22 6-10 7L2 6" />
        </>,
      ),
      external: false,
    },
    {
      name: 'WhatsApp',
      href: whatsappUrl || '',
      icon: strokeIcon(
        <>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          <g transform="translate(6.6 6.6) scale(0.45)" strokeWidth={3.5}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </g>
        </>,
      ),
      external: true,
    },
  ].filter((l) => l.href);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/events?q=${encodeURIComponent(q)}` : '/events');
  }

  return (
    <div className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-1 flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 sm:gap-6">
        <form onSubmit={handleSearch} role="search" className="flex min-w-0 basis-full sm:basis-auto sm:flex-1 sm:max-w-96 lg:flex-none lg:w-[28rem] lg:max-w-none">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Events"
            aria-label="Search events"
            className="min-w-0 flex-1 rounded-l-sm border border-white bg-white px-3 py-1.5 text-sm text-bb-ink placeholder:text-bb-ink/70 focus:outline-none focus:ring-2 focus:ring-bb-gold"
          />
          <button type="submit" aria-label="Search" className="rounded-r-sm bg-white px-3 text-bb-ink hover:text-bb-gold-dark">
            {strokeIcon(
              <>
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35" />
              </>,
            )}
          </button>
        </form>
        <div className="flex shrink-0 items-center gap-4">
          {links.map((link) => (
            <a
              key={link.name}
              href={link.href}
              {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              aria-label={link.name}
              title={link.name}
              className="text-white transition-colors hover:text-bb-gold focus:outline-none focus:ring-2 focus:ring-bb-gold rounded"
            >
              {link.icon}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
