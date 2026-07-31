'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/events', label: 'Events' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/refunds', label: 'Refunds' },
  { href: '/admin/gallery', label: 'Gallery' },
  { href: '/admin/enquiries', label: 'Enquiries' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/subscribers', label: 'Subscribers' },
  { href: '/admin/communications', label: 'Communications' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/admin-users', label: 'Admin users' },
  { href: '/admin/audit-log', label: 'Audit log' },
  { href: '/admin/settings', label: 'Settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-bb-text-secondary">Loading…</div>;
  }

  if (!user || !isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="font-display font-bold text-2xl text-bb-text mb-4">Access denied</h1>
        <p className="text-bb-text-secondary mb-6">You need an admin account to access this area.</p>
        <button
          onClick={() => router.push('/auth/sign-in')}
          className="bg-bb-orange hover:bg-bb-orange-dark text-white font-semibold px-6 py-3 rounded-full transition-colors"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <aside className="w-56 bg-bb-text text-white flex-shrink-0 hidden md:flex md:flex-col">
        <div className="p-4 border-b border-white/10">
          <p className="font-display font-bold text-sm">Admin Panel</p>
          <p className="text-xs text-white/60 truncate">{user.display_name}</p>
        </div>
        <nav className="p-2 space-y-1 flex-1 overflow-y-auto">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === item.href ? 'bg-bb-green text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-2">
          <Link href="/" className="block text-white/60 hover:text-white text-xs">
            &larr; Back to site
          </Link>
          <button onClick={logout} className="text-white/60 hover:text-white text-xs">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-6 md:p-8 bg-bb-neutral">{children}</main>
    </div>
  );
}
