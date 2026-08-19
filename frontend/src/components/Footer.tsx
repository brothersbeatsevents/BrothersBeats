'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { subscribe } from '@/lib/api';
import { SITE_CONFIG } from '@/lib/site-config';

const socialLinks = [
  {
    name: 'Instagram',
    href: SITE_CONFIG.socials.instagram,
    icon: (
      <path d="M7.75 2h8.5A5.76 5.76 0 0 1 22 7.75v8.5A5.76 5.76 0 0 1 16.25 22h-8.5A5.76 5.76 0 0 1 2 16.25v-8.5A5.76 5.76 0 0 1 7.75 2Zm0 2A3.75 3.75 0 0 0 4 7.75v8.5A3.75 3.75 0 0 0 7.75 20h8.5A3.75 3.75 0 0 0 20 16.25v-8.5A3.75 3.75 0 0 0 16.25 4h-8.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.25-3.1a1.17 1.17 0 1 1 0 2.34 1.17 1.17 0 0 1 0-2.34Z" />
    ),
  },
  {
    name: 'Facebook',
    href: SITE_CONFIG.socials.facebook,
    icon: <path d="M13.5 22v-9h3l.5-3.5h-3.5V7.25c0-1 .28-1.75 1.78-1.75H17.2V2.38A25.8 25.8 0 0 0 14.4 2C11.63 2 9.75 3.68 9.75 6.78V9.5H6.6V13h3.15v9h3.75Z" />,
  },
  {
    name: 'YouTube',
    href: SITE_CONFIG.socials.youtube,
    icon: <path d="M23.5 6.2a3 3 0 0 0-2.1-2.12C19.55 3.58 12 3.58 12 3.58s-7.55 0-9.4.5A3 3 0 0 0 .5 6.2 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.12c1.85.5 9.4.5 9.4.5s7.55 0 9.4-.5a3 3 0 0 0 2.1-2.12A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.5-5.8ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" />,
  },
  {
    name: 'LinkedIn',
    href: SITE_CONFIG.socials.linkedin,
    icon: <path d="M5.34 7.31A2.31 2.31 0 1 1 5.34 2.7a2.31 2.31 0 0 1 0 4.62ZM3.35 21h3.98V9H3.35v12Zm6.35-12h3.82v1.64h.05c.53-1.01 1.83-2.08 3.77-2.08 4.03 0 4.78 2.65 4.78 6.1V21h-3.98v-5.62c0-1.34-.02-3.07-1.87-3.07-1.88 0-2.16 1.46-2.16 2.97V21H9.7V9Z" />,
  },
] as const;

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
    <footer className="bg-bb-ink text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <Image src="/images/BBlogo3.png" alt="Brothers Beats logo" width={168} height={112} className="h-14 w-auto object-contain" />
            <p className="mt-3 text-sm text-white/70 max-w-sm">
              {SITE_CONFIG.mission} {SITE_CONFIG.description}
            </p>
            <p className="mt-5 text-sm font-semibold text-white">Stay connected with us</p>
            <div className="mt-3 flex items-center gap-3" aria-label="Follow Brothers Beats Events">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Follow Brothers Beats Events on ${social.name}`}
                  title={social.name}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/80 transition-colors hover:border-bb-gold-light hover:bg-bb-gold hover:text-bb-ink focus:outline-none focus:ring-2 focus:ring-bb-gold-light focus:ring-offset-2 focus:ring-offset-bb-ink"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
                    {social.icon}
                  </svg>
                </a>
              ))}
            </div>
            <form onSubmit={handleSubscribe} className="mt-5 flex gap-2 max-w-sm">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="flex-1 rounded-full px-4 py-2 text-sm text-bb-ink bg-white focus:outline-none focus:ring-2 focus:ring-bb-gold-light"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="bg-bb-gold hover:bg-bb-gold-dark disabled:opacity-60 text-bb-ink font-semibold text-sm px-4 py-2 rounded-full transition-colors"
              >
                {status === 'loading' ? 'Joining…' : 'Subscribe'}
              </button>
            </form>
            {status === 'success' && (
              <p className="mt-2 text-xs text-bb-gold-light">You are subscribed! Watch your inbox for upcoming events.</p>
            )}
            {status === 'error' && (
              <p className="mt-2 text-xs text-bb-red">Something went wrong. Please try again.</p>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-white/60 mb-3">Explore</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li><Link href="/events" className="hover:text-bb-gold-light">All events</Link></li>
              <li><Link href="/gallery" className="hover:text-bb-gold-light">Gallery</Link></li>
              <li><Link href="/services" className="hover:text-bb-gold-light">Services</Link></li>
              <li><Link href="/about" className="hover:text-bb-gold-light">About us</Link></li>
              <li><Link href="/contact" className="hover:text-bb-gold-light">Contact</Link></li>
              <li><Link href="/booking/lookup" className="hover:text-bb-gold-light">Find my booking</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-white/60 mb-3">Legal</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li><Link href="/terms" className="hover:text-bb-gold-light">Terms of service</Link></li>
              <li><Link href="/privacy" className="hover:text-bb-gold-light">Privacy policy</Link></li>
              <li><Link href="/refund-policy" className="hover:text-bb-gold-light">Refund policy</Link></li>
              <li><Link href="/unsubscribe" className="hover:text-bb-gold-light">Unsubscribe</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-white/50">
          <p>&copy; {new Date().getFullYear()} {SITE_CONFIG.name}. All rights reserved.</p>
          <p>Support: <a href={`mailto:${SITE_CONFIG.supportEmail}`} className="hover:text-bb-gold-light">{SITE_CONFIG.supportEmail}</a></p>
        </div>
      </div>
    </footer>
  );
}
