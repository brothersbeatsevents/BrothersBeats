'use client';

import { useEffect, useState } from 'react';

const CONSENT_KEY = 'bb_cookie_consent';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
    } catch {
      // storage may be blocked
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(CONSENT_KEY, '1');
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-bb-text text-white p-4 sm:p-5">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
        <p className="text-sm text-white/90 flex-1 text-center sm:text-left">
          We use essential cookies to keep your session secure. By continuing to use this site, you agree to our{' '}
          <a href="/privacy" className="underline hover:text-bb-lime">
            Privacy Policy
          </a>
          .
        </p>
        <button
          onClick={accept}
          className="shrink-0 bg-bb-orange hover:bg-bb-orange-dark text-white font-semibold text-sm px-5 py-2 rounded-full transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
