'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

const NAV_ITEMS = [
  { href: '/account', label: 'Overview' },
  { href: '/account/tickets', label: 'My tickets' },
  { href: '/account/profile', label: 'Profile' },
  { href: '/account/preferences', label: 'Preferences' },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const ticketMatch = pathname?.match(/^\/account\/tickets\/([a-zA-Z0-9-]+)\/?$/);
      if (ticketMatch) {
        router.replace(`/booking/lookup?bookingReference=${encodeURIComponent(ticketMatch[1])}`);
        return;
      }
      router.replace(`/auth/sign-in?next=${encodeURIComponent(pathname || '/account')}`);
    } else if (isAdmin) {
      // Admins manage the platform, not customer bookings — send them to the admin panel instead
      router.replace('/admin');
    }
  }, [loading, user, isAdmin, pathname, router]);

  if (loading || !user || isAdmin) {
    return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-bb-text-secondary">Loading…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-8">
        <nav aria-label="Account navigation" className="lg:w-48 shrink-0 flex lg:flex-col gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 px-4 py-2 rounded-full lg:rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  active ? 'bg-bb-gold text-bb-ink' : 'text-bb-text-secondary hover:bg-bb-neutral'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
