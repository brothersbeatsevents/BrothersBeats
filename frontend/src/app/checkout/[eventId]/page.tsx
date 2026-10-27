'use client';

import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getPriceQuote, getEvent } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import PriceSummary from '@/components/ui/PriceSummary';
import CheckoutForm from '@/components/ui/CheckoutForm';
import ErrorState from '@/components/ui/ErrorState';
import CheckoutAccountChoice from '@/components/ui/CheckoutAccountChoice';

function CheckoutPageContent() {
  const params = useParams<{ eventId: string }>();
  const searchParams = useSearchParams();
  const { isAdmin, user, loading: authLoading } = useAuth();
  const tier = searchParams.get('tier') || '';
  const qty = Number(searchParams.get('qty')) || 1;
  const itemsParam = searchParams.get('items');
  const items = useMemo(() => {
    try {
      const parsed = itemsParam ? JSON.parse(itemsParam) : tier ? [{ ticketTierId: tier, quantity: qty }] : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }, [itemsParam, tier, qty]);
  const slug = searchParams.get('slug') || '';
  const guestCheckout = searchParams.get('guest') === 'true';

  const [quote, setQuote] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasDiscountCode, setHasDiscountCode] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [updatingDiscount, setUpdatingDiscount] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const quoteRequest = useRef(0);

  useEffect(() => {
    const requestId = ++quoteRequest.current;
    setHasDiscountCode(false); setDiscountCode(''); setDiscountError(null); setUpdatingDiscount(false);
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [quoteRes, eventRes] = await Promise.all([
          getPriceQuote({ eventId: params.eventId, items }),
          slug ? getEvent(slug).catch(() => null) : Promise.resolve(null),
        ]);
        if (requestId !== quoteRequest.current) return;
        setQuote(quoteRes.data);
        setEvent(eventRes?.data || null);
      } catch (err: any) {
        if (requestId !== quoteRequest.current) return;
        setError(err.message || 'Unable to load checkout details');
      }
      setLoading(false);
    }
    if (params.eventId && items.length) load();
    else {
      setError('Missing ticket selection');
      setLoading(false);
    }
    return () => { quoteRequest.current++; };
  }, [params.eventId, items, slug]);

  async function updateDiscount(remove = false) {
    if (updatingDiscount || submitting) return;
    const requestId = ++quoteRequest.current;
    setUpdatingDiscount(true);
    setDiscountError(null);
    try {
      const response = await getPriceQuote({ eventId: params.eventId, items,
        discountCode: remove ? undefined : discountCode.trim() });
      if (requestId !== quoteRequest.current) return;
      setQuote(response.data);
      if (remove) { setDiscountCode(''); setHasDiscountCode(false); }
    } catch (err: any) {
      if (requestId !== quoteRequest.current) return;
      setDiscountError(err.message || 'Unable to apply discount code');
    } finally {
      if (requestId === quoteRequest.current) setUpdatingDiscount(false);
    }
  }

  const checkoutQuery = new URLSearchParams(searchParams.toString());
  checkoutQuery.delete('guest');
  const checkoutPath = `/checkout/${params.eventId}?${checkoutQuery}`;
  const allowGuestCheckout = event?.allowGuestCheckout !== false;

  if (loading || authLoading) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-bb-text-secondary">Loading checkout…</div>;
  }

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

  if (!error && quote && !user && (!guestCheckout || !allowGuestCheckout)) {
    return (
      <CheckoutAccountChoice checkoutPath={checkoutPath} eventTitle={event?.title} eventSlug={slug}
        quote={quote} allowGuestCheckout={allowGuestCheckout} />
    );
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
      <p className="text-sm text-bb-text-secondary mb-8">{quote.totalAmountMinor === 0 ? 'Complete your details to confirm your free tickets.' : 'Complete your details to continue to secure payment.'}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="order-2 md:order-1">
          <CheckoutForm eventId={params.eventId} items={items} free={quote.totalAmountMinor === 0}
            discountCode={quote.discountCode}
            onSubmittingChange={setSubmitting}
            disabled={updatingDiscount || (hasDiscountCode && !quote.discountCode)} />
        </div>
        <div className="order-1 md:order-2">
          <PriceSummary quote={quote} />
          <div className="mt-4 rounded-xl border border-bb-border p-4 text-sm">
            <label className="flex items-center gap-2 text-bb-text">
              <input type="checkbox" checked={hasDiscountCode} disabled={updatingDiscount || submitting}
                onChange={(e) => {
                  if (!e.target.checked && quote.discountCode) { void updateDiscount(true); return; }
                  setHasDiscountCode(e.target.checked); setDiscountError(null);
                }} />
              I have a discount or referral code
            </label>
            {hasDiscountCode && (
              <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); void updateDiscount(); }}>
                <label htmlFor="discount-code" className="block text-bb-text-secondary">Discount code</label>
                <div className="flex gap-2">
                  <input id="discount-code" value={quote.discountCode || discountCode} maxLength={40}
                    autoCapitalize="characters" autoComplete="off" spellCheck={false}
                    disabled={updatingDiscount || submitting || !!quote.discountCode}
                    onChange={(e) => { setDiscountCode(e.target.value); setDiscountError(null); }}
                    className="min-w-0 w-full rounded-lg border border-bb-border px-3 py-2 uppercase"
                    aria-describedby={discountError ? 'discount-error' : undefined} />
                  {quote.discountCode ? (
                    <button type="button" disabled={updatingDiscount || submitting} onClick={() => void updateDiscount(true)}
                      className="font-semibold text-bb-gold disabled:opacity-60">Remove</button>
                  ) : (
                    <button type="submit" disabled={updatingDiscount || submitting || !discountCode.trim()}
                      className="rounded-lg bg-bb-gold px-4 py-2 font-semibold text-bb-ink disabled:opacity-60">
                      {updatingDiscount ? 'Applying…' : 'Apply'}
                    </button>
                  )}
                </div>
                {quote.discountCode && <p role="status" className="text-green-700">Code applied. Your total includes the discount.</p>}
              </form>
            )}
            {discountError && <p id="discount-error" role="alert" className="mt-2 text-bb-red">{discountError}</p>}
          </div>
          {quote.totalAmountMinor > 0 && <p className="text-xs text-bb-text-muted mt-3">
            Your tickets are reserved for 15 minutes while you complete payment.
          </p>}
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
