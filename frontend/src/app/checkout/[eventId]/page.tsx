'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPriceQuote, getEvent } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import PriceSummary from '@/components/ui/PriceSummary';
import CheckoutForm from '@/components/ui/CheckoutForm';
import ErrorState from '@/components/ui/ErrorState';

function CheckoutPageContent() {
  const params = useParams<{ eventId: string }>();
  const searchParams = useSearchParams();
  const { isAdmin, user } = useAuth();
  const router = useRouter();
  const tier = searchParams.get('tier') || '';
  const qty = Number(searchParams.get('qty')) || 1;
  const slug = searchParams.get('slug') || '';
  const guestCheckout = searchParams.get('guest') === 'true';

  const [quote, setQuote] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [quoteRes, eventRes] = await Promise.all([
          getPriceQuote({ eventId: params.eventId, ticketTierId: tier, quantity: qty }),
          slug ? getEvent(slug).catch(() => null) : Promise.resolve(null),
        ]);
        setQuote(quoteRes.data);
        setEvent(eventRes?.data || null);
      } catch (err: any) {
        setError(err.message || 'Unable to load checkout details');
      }
      setLoading(false);
    }
    if (params.eventId && tier) load();
    else {
      setError('Missing ticket selection');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.eventId, tier, qty]);

  if (isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <ErrorState
          title="Admins can't purchase tickets"
          message="Sign in with a customer account to buy tickets, or head back to the admin panel."
        />
        <Link href="/admin" className="mt-6 inline-block text-sm font-semibold text-bb-gold hover:text-bb-gold-dark">
          &larr; Back to admin panel
        </Link>
      </div>
    );
  }

  if (!loading && !user && !guestCheckout) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="font-display font-bold text-3xl text-bb-text mb-3">Choose how to continue</h1>
        <p className="text-bb-text-secondary mb-8">
          Create an account to keep your ticket details in your profile, or continue as a guest and pay securely now.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => router.push(`/auth/sign-up?next=${encodeURIComponent(`/checkout/${params.eventId}?tier=${tier}&qty=${qty}&slug=${slug}`)}`)}
            className="bg-bb-gold hover:bg-bb-gold-dark text-bb-ink font-semibold px-6 py-3 rounded-full"
          >
            Sign up to save tickets
          </button>
          <button
            type="button"
            onClick={() => router.push(`/checkout/${params.eventId}?tier=${tier}&qty=${qty}&slug=${slug}&guest=true`)}
            className="border border-bb-border text-bb-text font-semibold px-6 py-3 rounded-full"
          >
            Continue as guest
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-bb-text-secondary">Loading checkout…</div>;
  }

  if (error || !quote) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <ErrorState title="Unable to start checkout" message={error || undefined} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {slug && (
        <Link href={`/events/${slug}`} className="text-sm text-bb-text-secondary hover:text-bb-gold">
          &larr; Back to event
        </Link>
      )}
      <h1 className="font-display font-bold text-3xl text-bb-text mt-3 mb-1">
        {event?.title || 'Checkout'}
      </h1>
      <p className="text-sm text-bb-text-secondary mb-8">Complete your details to continue to secure payment.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="order-2 md:order-1">
          <CheckoutForm eventId={params.eventId} ticketTierId={tier} quantity={qty} />
        </div>
        <div className="order-1 md:order-2">
          <PriceSummary quote={quote} />
          <p className="text-xs text-bb-text-muted mt-3">
            Your tickets are reserved for 30 minutes while you complete payment.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-16 text-center text-bb-text-secondary">Loading checkout…</div>}>
      <CheckoutPageContent />
    </Suspense>
  );
}
