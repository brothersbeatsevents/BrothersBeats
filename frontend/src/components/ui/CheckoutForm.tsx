'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { createCheckoutSession } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const checkoutSchema = z.object({
  buyerName: z.string().min(2, 'Name is required'),
  buyerEmail: z.string().email('A valid email is required'),
  buyerPhone: z.string().optional(),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms to continue' }),
  }),
  marketingConsent: z.boolean().optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function CheckoutForm({
  eventId,
  ticketTierId,
  quantity,
}: {
  eventId: string;
  ticketTierId: string;
  quantity: number;
}) {
  const { user, token } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      buyerName: user?.display_name || '',
      buyerEmail: user?.email || '',
      acceptedTerms: undefined,
      marketingConsent: false,
    },
  });

  async function onSubmit(values: CheckoutFormValues) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await createCheckoutSession(
        {
          eventId,
          ticketTierId,
          quantity,
          buyerName: values.buyerName,
          buyerEmail: values.buyerEmail,
          buyerPhone: values.buyerPhone,
          marketingConsent: values.marketingConsent,
        },
        token || undefined,
      );
      window.location.href = res.data.checkoutUrl;
    } catch (err: any) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-bb-text mb-1">Full name</label>
        <input
          {...register('buyerName')}
          className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-green"
        />
        {errors.buyerName && <p className="text-xs text-bb-red mt-1">{errors.buyerName.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-bb-text mb-1">Email</label>
        <input
          type="email"
          {...register('buyerEmail')}
          className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-green"
        />
        {errors.buyerEmail && <p className="text-xs text-bb-red mt-1">{errors.buyerEmail.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-bb-text mb-1">Phone (optional)</label>
        <input
          {...register('buyerPhone')}
          className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-green"
        />
      </div>
      <label className="flex items-start gap-2 text-sm text-bb-text-secondary">
        <input type="checkbox" {...register('acceptedTerms')} className="mt-0.5" />
        <span>
          I agree to the{' '}
          <a href="/terms" target="_blank" className="text-bb-green underline">
            terms of service
          </a>{' '}
          and{' '}
          <a href="/refund-policy" target="_blank" className="text-bb-green underline">
            refund policy
          </a>
          .
        </span>
      </label>
      {errors.acceptedTerms && <p className="text-xs text-bb-red">{errors.acceptedTerms.message}</p>}
      <label className="flex items-start gap-2 text-sm text-bb-text-secondary">
        <input type="checkbox" {...register('marketingConsent')} className="mt-0.5" />
        <span>Keep me updated about future events (optional).</span>
      </label>

      {submitError && <p className="text-sm text-bb-red">{submitError}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-bb-orange hover:bg-bb-orange-dark disabled:opacity-60 text-white font-semibold py-3 rounded-full transition-colors"
      >
        {submitting ? 'Redirecting to secure payment…' : 'Continue to payment'}
      </button>
    </form>
  );
}
