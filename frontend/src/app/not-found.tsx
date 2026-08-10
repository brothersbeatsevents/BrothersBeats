import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="font-display font-bold text-7xl text-bb-gold">404</p>
      <h1 className="font-display font-bold text-2xl text-bb-text mt-2">Page not found</h1>
      <p className="text-bb-text-secondary mt-2 max-w-sm">
        The page you&apos;re looking for may have moved or no longer exists.
      </p>
      <div className="flex flex-wrap gap-3 justify-center mt-8">
        <Link href="/" className="bg-bb-gold hover:bg-bb-gold-dark text-bb-ink font-semibold px-6 py-2.5 rounded-full transition-colors">
          Go home
        </Link>
        <Link href="/events" className="border border-bb-border text-bb-text font-semibold px-6 py-2.5 rounded-full hover:border-bb-gold transition-colors">
          Browse events
        </Link>
      </div>
    </div>
  );
}
