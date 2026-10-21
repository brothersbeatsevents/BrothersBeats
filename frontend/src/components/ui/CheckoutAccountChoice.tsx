import Link from 'next/link';
import { authPageUrl } from '@/lib/auth-redirect';
import PriceSummary, { PriceQuoteData } from './PriceSummary';

export default function CheckoutAccountChoice({ checkoutPath, eventTitle, eventSlug, quote, allowGuestCheckout }: {
  checkoutPath: string;
  eventTitle?: string;
  eventSlug: string;
  quote: PriceQuoteData;
  allowGuestCheckout: boolean;
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {eventSlug && <Link href={`/events/${eventSlug}`} className="text-sm text-bb-text-secondary hover:text-bb-gold">&larr; Back to event</Link>}
      <h1 className="mt-3 font-display font-bold text-3xl text-bb-text">How would you like to continue?</h1>
      {eventTitle && <p className="mt-2 text-bb-text-secondary">{eventTitle}</p>}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <p className="text-sm text-bb-text-secondary">Sign in or create an account to keep your tickets in one place.</p>
          <Link href={authPageUrl('/auth/sign-in', checkoutPath)} className="block rounded-full bg-bb-gold px-6 py-3 text-center font-semibold text-bb-ink transition-colors hover:bg-bb-gold-dark">
            Sign in
          </Link>
          <Link href={authPageUrl('/auth/sign-up', checkoutPath)} className="block rounded-full border border-bb-border px-6 py-3 text-center font-semibold text-bb-text transition-colors hover:border-bb-gold">
            Sign up
          </Link>
          {allowGuestCheckout ? (
            <>
              <div className="flex items-center gap-3" aria-hidden="true">
                <div className="h-px flex-1 bg-bb-border" /><span className="text-xs text-bb-text-muted">or</span><div className="h-px flex-1 bg-bb-border" />
              </div>
              <Link href={`${checkoutPath}&guest=true`} className="block rounded-full border border-bb-border px-6 py-3 text-center font-semibold text-bb-text transition-colors hover:border-bb-gold">
                Continue as guest
              </Link>
              <p className="text-xs text-bb-text-secondary">No account needed. We&apos;ll email your tickets after booking.</p>
            </>
          ) : <p className="text-sm text-bb-text-secondary">This event requires an account to book tickets.</p>}
        </div>
        <div>
          <h2 className="mb-3 font-display font-bold text-lg text-bb-text">Your ticket selection</h2>
          <PriceSummary quote={quote} />
        </div>
      </div>
    </div>
  );
}
