'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { subscribe } from '@/lib/api';
import { SITE_CONFIG } from '@/lib/site-config';

export default function Footer() {
  const pathname = usePathname();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  if (pathname?.startsWith('/admin')) return null;

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      await subscribe({ email, source: 'WEBSITE_FOOTER' });
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
    }
  }

  return (
    <footer className="bg-bb-text text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <span className="font-display text-xl font-bold">
              Brothers <span className="text-bb-orange">Beats</span>
            </span>
            <p className="mt-3 text-sm text-white/70 max-w-sm">
              {SITE_CONFIG.description}
            </p>
            <form onSubmit={handleSubscribe} className="mt-5 flex gap-2 max-w-sm">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="flex-1 rounded-full px-4 py-2 text-sm text-bb-text bg-white focus:outline-none focus:ring-2 focus:ring-bb-lime"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="bg-bb-orange hover:bg-bb-orange-dark disabled:opacity-60 text-white font-semibold text-sm px-4 py-2 rounded-full transition-colors"
              >
                {status === 'loading' ? 'Joining…' : 'Subscribe'}
              </button>
            </form>
            {status === 'success' && (
              <p className="mt-2 text-xs text-bb-lime">You are subscribed! Watch your inbox for upcoming events.</p>
            )}
            {status === 'error' && (
              <p className="mt-2 text-xs text-bb-red">Something went wrong. Please try again.</p>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-white/60 mb-3">Explore</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li><Link href="/events" className="hover:text-bb-lime">All events</Link></li>
              <li><Link href="/gallery" className="hover:text-bb-lime">Gallery</Link></li>
              <li><Link href="/services" className="hover:text-bb-lime">Services</Link></li>
              <li><Link href="/about" className="hover:text-bb-lime">About us</Link></li>
              <li><Link href="/contact" className="hover:text-bb-lime">Contact</Link></li>
              <li><Link href="/booking/lookup" className="hover:text-bb-lime">Find my booking</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-white/60 mb-3">Legal</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li><Link href="/terms" className="hover:text-bb-lime">Terms of service</Link></li>
              <li><Link href="/privacy" className="hover:text-bb-lime">Privacy policy</Link></li>
              <li><Link href="/refund-policy" className="hover:text-bb-lime">Refund policy</Link></li>
              <li><Link href="/unsubscribe" className="hover:text-bb-lime">Unsubscribe</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-white/50">
          <p>&copy; {new Date().getFullYear()} {SITE_CONFIG.name}. All rights reserved.</p>
          <p>Support: <a href={`mailto:${SITE_CONFIG.supportEmail}`} className="hover:text-bb-lime">{SITE_CONFIG.supportEmail}</a></p>
        </div>
      </div>
    </footer>
  );
}
