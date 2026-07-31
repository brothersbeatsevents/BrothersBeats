'use client';

import Link from 'next/link';
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
    <header className="sticky top-0 z-50 bg-bb-surface/95 backdrop-blur border-b border-bb-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="font-display text-xl font-bold text-bb-text">
              Brothers <span className="text-bb-orange">Beats</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  pathname === link.href
                    ? 'text-bb-green bg-bb-pale-green'
                    : 'text-bb-text-secondary hover:text-bb-green hover:bg-bb-neutral'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="text-sm font-medium text-bb-text-secondary hover:text-bb-green transition-colors"
                  >
                    Admin
                  </Link>
                )}
                <Link
                  href="/account"
                  className="text-sm font-medium text-bb-text-secondary hover:text-bb-green transition-colors"
                >
                  {user.display_name}
                </Link>
                <button
                  onClick={logout}
                  className="text-sm font-medium text-bb-text-secondary hover:text-bb-text transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/auth/sign-in"
                className="text-sm font-medium text-bb-text-secondary hover:text-bb-green transition-colors"
              >
                Sign in
              </Link>
            )}
            <Link
              href="/events"
              className="bg-bb-orange hover:bg-bb-orange-dark text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-colors"
            >
              Explore Events
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-bb-text"
            aria-label="Toggle menu"
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

        {mobileOpen && (
          <nav className="lg:hidden pb-6 pt-2 space-y-1 border-t border-bb-border">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-2.5 px-3 rounded-lg font-medium text-bb-text-secondary hover:bg-bb-neutral"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 mt-2 border-t border-bb-border space-y-1">
              {user ? (
                <>
                  {isAdmin && (
                    <Link href="/admin" className="block py-2.5 px-3 rounded-lg font-medium text-bb-text-secondary hover:bg-bb-neutral" onClick={() => setMobileOpen(false)}>
                      Admin
                    </Link>
                  )}
                  <Link href="/account" className="block py-2.5 px-3 rounded-lg font-medium text-bb-text-secondary hover:bg-bb-neutral" onClick={() => setMobileOpen(false)}>
                    My account
                  </Link>
                  <button onClick={logout} className="block w-full text-left py-2.5 px-3 rounded-lg font-medium text-bb-text-secondary hover:bg-bb-neutral">
                    Sign out
                  </button>
                </>
              ) : (
                <Link href="/auth/sign-in" className="block py-2.5 px-3 rounded-lg font-medium text-bb-text-secondary hover:bg-bb-neutral" onClick={() => setMobileOpen(false)}>
                  Sign in
                </Link>
              )}
              <Link
                href="/events"
                className="block text-center bg-bb-orange text-white font-semibold px-5 py-2.5 rounded-full"
                onClick={() => setMobileOpen(false)}
              >
                Explore Events
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
