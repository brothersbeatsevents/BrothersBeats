'use client';

import { useId, useState, type InputHTMLAttributes } from 'react';

export default function PasswordInput({
  id,
  className = 'w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bb-gold',
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <input {...props} id={inputId} type={visible ? 'text' : 'password'} className={className} />
      <button
        type="button"
        aria-controls={inputId}
        aria-pressed={visible}
        onClick={() => setVisible((value) => !value)}
        className="mt-1 inline-flex min-h-10 items-center gap-2 rounded px-1 text-xs font-medium text-bb-text-secondary hover:text-bb-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bb-gold"
      >
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="m3 3 18 18" />}
        </svg>
        {visible ? 'Hide password' : 'Show password'}
      </button>
    </div>
  );
}
