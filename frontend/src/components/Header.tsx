'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/events', label: 'Events' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function Header() {
  const { user, logout, isAdmin } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname?.startsWith('/admin')) return null;

  return (
    <header className="sticky top-0 z-50 bg-bb-ink/95 text-white backdrop-blur border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/images/BBlogo.png" alt="Brothers Beats logo" width={56} height={56} className="h-14 w-14 shrink-0 object-contain" priority />
            <span className="hidden sm:inline font-display text-xl font-bold text-white">
              Brothers <span className="text-bb-gold">Beats Events</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  pathname === link.href
                    ? 'text-bb-gold bg-bb-gold/10'
                    : 'text-white/75 hover:text-bb-gold hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className="text-sm font-medium text-white/75 hover:text-bb-gold transition-colors"
                  >
                    Admin panel
                  </Link>
                ) : (
                  <Link
                    href="/account"
                    className="text-sm font-medium text-white/75 hover:text-bb-gold transition-colors"
                  >
                    {user.display_name}
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="text-sm font-medium text-white/75 hover:text-white transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/auth/sign-in"
                className="text-sm font-medium text-white/75 hover:text-bb-gold transition-colors"
              >
                Sign in
              </Link>
            )}
            {!isAdmin && (
              <Link
                href="/events"
                className="bg-bb-gold hover:bg-bb-gold-dark text-bb-ink font-semibold text-sm px-5 py-2.5 rounded-full transition-colors"
              >
                Explore Events
              </Link>
            )}
          </div>

          <div className="lg:hidden flex items-center gap-1">
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className="rounded-full bg-bb-gold px-3 py-2 text-sm font-semibold text-bb-ink transition-colors hover:bg-bb-gold-dark"
              >
                Admin
              </Link>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-white"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav id="mobile-navigation" className="lg:hidden pb-6 pt-2 space-y-1 border-t border-white/10">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-2.5 px-3 rounded-lg font-medium text-white/75 hover:bg-white/10"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 mt-2 border-t border-white/10 space-y-1">
              {user ? (
                <>
                  {isAdmin ? (
                    <Link href="/admin" className="block py-2.5 px-3 rounded-lg font-medium text-white/75 hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                      Admin panel
                    </Link>
                  ) : (
                    <Link href="/account" className="block py-2.5 px-3 rounded-lg font-medium text-white/75 hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                      My account
                    </Link>
                  )}
                  <button onClick={logout} className="block w-full text-left py-2.5 px-3 rounded-lg font-medium text-white/75 hover:bg-white/10">
                    Sign out
                  </button>
                </>
              ) : (
                <Link href="/auth/sign-in" className="block py-2.5 px-3 rounded-lg font-medium text-white/75 hover:bg-white/10" onClick={() => setMobileOpen(false)}>
                  Sign in
                </Link>
              )}
              {!isAdmin && (
                <Link
                  href="/events"
                  className="block text-center bg-bb-gold text-bb-ink font-semibold px-5 py-2.5 rounded-full"
                  onClick={() => setMobileOpen(false)}
                >
                  Explore Events
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
