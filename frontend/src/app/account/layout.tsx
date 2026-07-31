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
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/auth/sign-in?next=${encodeURIComponent(pathname || '/account')}`);
    }
  }, [loading, user, pathname, router]);

  if (loading || !user) {
    return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-bb-text-secondary">Loading…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex flex-col sm:flex-row gap-8">
        <nav className="sm:w-48 shrink-0 flex sm:flex-col gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-full sm:rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  active ? 'bg-bb-green text-white' : 'text-bb-text-secondary hover:bg-bb-neutral'
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
