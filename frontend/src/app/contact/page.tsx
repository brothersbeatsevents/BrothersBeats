'use client';

import { useRef, useState } from 'react';
import { sendContactMessage } from '@/lib/api';
import { SITE_CONFIG } from '@/lib/site-config';

type ContactReason = 'SPONSORSHIP' | 'PERFORMER' | 'PARTNERSHIP' | 'ORGANISE_EVENT' | 'PERSONAL_PARTY' | 'GENERAL';

const REASONS: Array<{ value: ContactReason; label: string }> = [
  { value: 'SPONSORSHIP', label: 'Sponsorship' },
  { value: 'PERFORMER', label: 'Performing' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
  { value: 'ORGANISE_EVENT', label: 'Organising an Event' },
  { value: 'PERSONAL_PARTY', label: 'Personal Party' },
  { value: 'GENERAL', label: 'General Enquiry' },
];

const inputClass = 'w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-gold';

type FieldProps = { label: string; name: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string };

function Field({ label, name, value, onChange, type = 'text', required = false, placeholder }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-bb-text mb-1">{label}{!required && <span className="text-bb-text-muted"> (optional)</span>}</label>
      <input id={name} name={name} type={type} required={required} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </div>
  );
}

function TextField({ label, name, value, onChange, required = false, placeholder }: Omit<FieldProps, 'type'>) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-bb-text mb-1">{label}{!required && <span className="text-bb-text-muted"> (optional)</span>}</label>
      <textarea id={name} name={name} required={required} rows={4} maxLength={5000} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </div>
  );
}

export default function ContactPage() {
  const [reason, setReason] = useState<ContactReason>('SPONSORSHIP');
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const formStartedAt = useRef(Date.now());

  function setValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function selectReason(nextReason: ContactReason) {
    setReason(nextReason);
    setValues({});
    setStatus('idle');
    setError('');
  }

  function renderQuestions() {
    const common = (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Name" name="name" value={values.name || ''} onChange={(value) => setValue('name', value)} required />
        <Field label="Email" name="email" type="email" value={values.email || ''} onChange={(value) => setValue('email', value)} required />
        <Field label="Phone" name="phone" type="tel" value={values.phone || ''} onChange={(value) => setValue('phone', value)} required />
      </div>
    );

    if (reason === 'SPONSORSHIP') return <>{common}<Field label="Company name" name="companyName" value={values.companyName || ''} onChange={(value) => setValue('companyName', value)} /><Field label="What would you like to sponsor?" name="subject" value={values.subject || ''} onChange={(value) => setValue('subject', value)} required /><Field label="Budget / sponsorship range" name="budget" value={values.budget || ''} onChange={(value) => setValue('budget', value)} placeholder="e.g. EUR 2,000 - EUR 5,000" /><TextField label="Tell us briefly about your sponsorship idea" name="message" value={values.message || ''} onChange={(value) => setValue('message', value)} required /></>;
    if (reason === 'PERFORMER') return <>{common}<Field label="Artist or band name" name="artistName" value={values.artistName || ''} onChange={(value) => setValue('artistName', value)} required /><Field label="Type of performance" name="performanceType" value={values.performanceType || ''} onChange={(value) => setValue('performanceType', value)} placeholder="DJ, live band, singer, dancer..." required /><Field label="Preferred date(s)" name="preferredDates" value={values.preferredDates || ''} onChange={(value) => setValue('preferredDates', value)} required /><Field label="Profile, Instagram, or website" name="profileLink" type="url" value={values.profileLink || ''} onChange={(value) => setValue('profileLink', value)} /><TextField label="Brief introduction" name="message" value={values.message || ''} onChange={(value) => setValue('message', value)} />;</>;
    if (reason === 'PARTNERSHIP') return <>{common}<Field label="Company name" name="companyName" value={values.companyName || ''} onChange={(value) => setValue('companyName', value)} /><Field label="What type of partnership are you interested in?" name="partnershipType" value={values.partnershipType || ''} onChange={(value) => setValue('partnershipType', value)} required /><Field label="Website or social media" name="profileLink" type="url" value={values.profileLink || ''} onChange={(value) => setValue('profileLink', value)} /><TextField label="What do you have in mind?" name="message" value={values.message || ''} onChange={(value) => setValue('message', value)} required /></>;
    if (reason === 'ORGANISE_EVENT') return <>{common}<Field label="Company name" name="companyName" value={values.companyName || ''} onChange={(value) => setValue('companyName', value)} /><Field label="Event type" name="eventType" value={values.eventType || ''} onChange={(value) => setValue('eventType', value)} required /><Field label="Preferred date" name="preferredDate" type="date" value={values.preferredDate || ''} onChange={(value) => setValue('preferredDate', value)} required /><Field label="Estimated number of guests" name="guestCount" type="number" value={values.guestCount || ''} onChange={(value) => setValue('guestCount', value)} required /><Field label="Location / venue" name="location" value={values.location || ''} onChange={(value) => setValue('location', value)} required /><TextField label="Briefly tell us about your event" name="message" value={values.message || ''} onChange={(value) => setValue('message', value)} required /></>;
    if (reason === 'PERSONAL_PARTY') return <>{common}<Field label="Type of party" name="partyType" value={values.partyType || ''} onChange={(value) => setValue('partyType', value)} placeholder="Birthday, engagement, wedding..." required /><Field label="Preferred date" name="preferredDate" type="date" value={values.preferredDate || ''} onChange={(value) => setValue('preferredDate', value)} required /><Field label="Number of guests" name="guestCount" type="number" value={values.guestCount || ''} onChange={(value) => setValue('guestCount', value)} required /><Field label="Location" name="location" value={values.location || ''} onChange={(value) => setValue('location', value)} required /><TextField label="Anything specific you need?" name="message" value={values.message || ''} onChange={(value) => setValue('message', value)} /></>;
    return <>{common}<TextField label="How can we help?" name="message" value={values.message || ''} onChange={(value) => setValue('message', value)} required /></>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError('');
    const reasonLabel = REASONS.find((item) => item.value === reason)?.label || reason;
    const { name, email, ...details } = values;
    const message = [`Contact reason: ${reasonLabel}`, ...Object.entries(details).filter(([, value]) => value.trim()).map(([key, value]) => `${key}: ${value}`)].join('\n');
    try {
      await sendContactMessage({ name, email, message, contactReason: reason, phone: values.phone, website: values.website, formStartedAt: formStartedAt.current });
      setStatus('sent');
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Something went wrong. Please try again.');
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <div className="max-w-2xl mb-10"><h1 className="font-display font-bold text-4xl text-bb-text mb-3">Contact Us</h1><p className="text-bb-text-secondary">Tell us what you need and we&apos;ll connect you with the right member of the Brothers Beats team.</p></div>
      {status === 'sent' ? <div className="bg-bb-pale-green rounded-2xl p-8 text-center"><p className="font-semibold text-bb-green">Thanks — we&apos;ve received your enquiry.</p><p className="text-sm text-bb-text-secondary mt-1">We&apos;ll be in touch soon.</p></div> : (
        <form onSubmit={handleSubmit} className="space-y-8">
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" tabIndex={-1} autoComplete="off" value={values.website || ''} onChange={(e) => setValue('website', e.target.value)} />
          </div>
          <fieldset><legend className="font-display font-bold text-xl text-bb-text mb-4">I&apos;m interested in:</legend><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{REASONS.map((item) => <label key={item.value} className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${reason === item.value ? 'border-bb-gold bg-bb-gold/10' : 'border-bb-border hover:border-bb-gold'}`}><input type="radio" name="contactReason" value={item.value} checked={reason === item.value} onChange={() => selectReason(item.value)} className="accent-bb-gold" /><span className="text-sm font-medium text-bb-text">{item.label}</span></label>)}</div></fieldset>
          <div className="bg-bb-surface border border-bb-border rounded-2xl p-6 space-y-4"><h2 className="font-display font-bold text-xl text-bb-text">{REASONS.find((item) => item.value === reason)?.label}</h2>{renderQuestions()}</div>
          {status === 'error' && <p className="text-sm text-bb-red">{error}</p>}
          <button type="submit" disabled={status === 'loading'} className="bg-bb-gold hover:bg-bb-gold-dark disabled:opacity-60 text-bb-ink font-semibold px-6 py-3 rounded-full transition-colors">{status === 'loading' ? 'Sending…' : 'Send enquiry'}</button>
          <p className="text-xs text-bb-text-muted">Prefer email? Contact us directly at <a href={`mailto:${SITE_CONFIG.supportEmail}`} className="text-bb-gold underline">{SITE_CONFIG.supportEmail}</a>.</p>
        </form>
      )}
    </div>
  );
}
