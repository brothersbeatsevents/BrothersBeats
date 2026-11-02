'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: { sitekey: string; theme?: 'light' | 'dark' | 'auto'; 'error-callback'?: () => void },
      ) => string;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export interface CaptchaState {
  token?: string;
  error?: string;
}

/**
 * Cloudflare Turnstile widget for public forms. Renders nothing (and lets
 * submissions through without a token) when no site key is configured, so
 * local development works unchanged.
 */
export default function Turnstile({ onChange }: { onChange: (state: CaptchaState) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!SITE_KEY || !scriptReady || !containerRef.current || widgetId.current) return;
    widgetId.current = window.turnstile?.render(containerRef.current, {
      sitekey: SITE_KEY!,
      theme: 'light',
      'error-callback': () =>
        onChange({ error: 'Captcha failed to load — please refresh the page.' }),
    });
    return () => {
      const id = widgetId.current;
      if (id) window.turnstile?.remove(id);
      widgetId.current = undefined;
    };
  }, [scriptReady, onChange]);

  useEffect(() => {
    window.onTurnstileLoad = () => setScriptReady(true);
    return () => {
      delete window.onTurnstileLoad;
    };
  }, []);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div ref={containerRef} />
    </>
  );
}
