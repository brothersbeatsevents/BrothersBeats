'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { useAuth } from '@/lib/auth';
import { adminGetEvents, adminCheckInTicket, type CheckInResult } from '@/lib/api';
import { createCheckInSession } from '@/lib/checkin-session';

type ScanOutcome = Awaited<ReturnType<typeof adminCheckInTicket>>['data'];

const RESULT_STYLE: Record<CheckInResult, { label: string; box: string }> = {
  CHECKED_IN: { label: 'Ticket checked in', box: 'bg-green-50 border-green-500 text-green-900' },
  ALREADY_CHECKED_IN: { label: 'Already scanned', box: 'bg-amber-50 border-amber-500 text-amber-900' },
  INVALID: { label: 'Invalid ticket', box: 'bg-red-50 border-red-500 text-red-900' },
  WRONG_EVENT: { label: 'Wrong event', box: 'bg-red-50 border-red-500 text-red-900' },
  CANCELLED: { label: 'Ticket cancelled', box: 'bg-red-50 border-red-500 text-red-900' },
  REFUNDED: { label: 'Ticket refunded', box: 'bg-red-50 border-red-500 text-red-900' },
  EVENT_CANCELLED: { label: 'Event cancelled', box: 'bg-red-50 border-red-500 text-red-900' },
};

export default function AdminCheckInPage() {
  const { token } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanPhase, setScanPhase] = useState<'ready' | 'checking' | 'paused'>('ready');
  const [cameraError, setCameraError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [history, setHistory] = useState<{ at: string; outcome: ScanOutcome }[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const sessionRef = useRef(createCheckInSession());
  const tokenRef = useRef(token);
  const eventIdRef = useRef(eventId);
  tokenRef.current = token;
  eventIdRef.current = eventId;

  useEffect(() => {
    if (!token) return;
    adminGetEvents(token).then((res) => setEvents(res.data.filter((e: any) => e.status !== 'DRAFT')));
  }, [token]);

  const submit = useCallback(async (code: string, manual = false) => {
    if (!tokenRef.current || !sessionRef.current.begin(manual)) return;
    setScanPhase('checking');
    setOutcome(null);
    try {
      const res = await adminCheckInTicket(code, eventIdRef.current || undefined, tokenRef.current);
      setOutcome(res.data);
      setHistory((h) => [{ at: new Date().toISOString(), outcome: res.data }, ...h].slice(0, 20));
    } catch (err: any) {
      setOutcome({ result: 'INVALID', message: err.message || 'Check-in failed. Try again.' });
    } finally {
      sessionRef.current.finish();
      setScanPhase('paused');
    }
  }, []);

  function scanNextTicket() {
    if (!sessionRef.current.resume()) return;
    setOutcome(null);
    setScanPhase('ready');
  }

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function startCamera() {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setScanning(true);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

      const tick = () => {
        if (!streamRef.current) return;
        if (video.readyState >= 2 && video.videoWidth > 0 && sessionRef.current.phase === 'ready') {
          const scale = Math.min(1, 640 / video.videoWidth);
          canvas.width = Math.round(video.videoWidth * scale);
          canvas.height = Math.round(video.videoHeight * scale);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const found = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
          if (found?.data) {
            void submit(found.data);
          }
        }
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    } catch (err: any) {
      stopCamera();
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in your browser, or enter the ticket number below.'
          : 'Could not start the camera. Camera scanning needs HTTPS; you can enter the ticket number below instead.',
      );
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code || sessionRef.current.phase === 'checking') return;
    setManualCode('');
    void submit(code, true);
  }

  const style = outcome ? RESULT_STYLE[outcome.result] : null;

  return (
    <div className="max-w-xl">
      <h1 className="font-display font-bold text-2xl text-bb-text mb-2">Ticket check-in</h1>
      <p className="text-sm text-bb-text-secondary mb-6">
        Scan a ticket QR code to validate it and mark it as used. Choose the event first so tickets for other events are rejected.
      </p>

      <select value={eventId} onChange={(e) => setEventId(e.target.value)} disabled={scanPhase === 'checking'} className="w-full rounded-lg border border-bb-border px-4 py-2.5 text-sm mb-4">
        <option value="">Any event</option>
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>{ev.title}</option>
        ))}
      </select>

      <div className="bg-bb-surface border border-bb-border rounded-2xl p-4 mb-4">
        <div className={`relative aspect-square w-full overflow-hidden rounded-xl bg-bb-ink ${scanning ? '' : 'hidden'}`}>
          <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-[18%] rounded-xl border-2 border-white/80 pointer-events-none" />
          {scanPhase !== 'ready' && (
            <div role="status" aria-live="polite" className="absolute inset-0 bg-black/75 flex overflow-y-auto p-4 text-center text-white">
              <div className="m-auto flex w-full flex-col items-center gap-2">
                {scanPhase === 'checking' ? (
                  <p className="text-xl font-semibold">Checking ticket…</p>
                ) : (
                  <>
                    <span aria-hidden="true" className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-3xl font-bold ${outcome?.result === 'CHECKED_IN' ? 'bg-green-500 text-white' : outcome?.result === 'ALREADY_CHECKED_IN' ? 'bg-amber-400 text-black' : 'bg-red-500 text-white'}`}>
                      {outcome?.result === 'CHECKED_IN' ? '✓' : '!'}
                    </span>
                    <p className="text-xl font-bold">{style?.label || 'Check-in failed'}</p>
                    {outcome?.ticket && <p className="max-w-full truncate text-sm">{outcome.ticket.attendeeName || outcome.ticket.ticketNumber}</p>}
                    <p className="text-xs">Scanning paused. Move to the next ticket before continuing.</p>
                    <button type="button" onClick={scanNextTicket} className="shrink-0 rounded-full bg-bb-gold px-6 py-3 font-semibold text-bb-ink hover:bg-bb-gold-dark">
                      Scan next ticket
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        {cameraError && <p className="text-sm text-bb-red mb-3">{cameraError}</p>}
        <button
          type="button"
          onClick={scanning ? stopCamera : startCamera}
          className={`${scanning ? 'mt-3' : ''} w-full bg-bb-gold hover:bg-bb-gold-dark text-bb-ink font-semibold px-6 py-3 rounded-full transition-colors`}
        >
          {scanning ? 'Stop camera' : 'Start scanning'}
        </button>
        {!scanning && scanPhase === 'paused' && (
          <button type="button" onClick={scanNextTicket} className="mt-3 w-full rounded-full border border-bb-border px-6 py-3 font-semibold hover:border-bb-gold">
            Scan next ticket
          </button>
        )}
      </div>

      <form onSubmit={handleManualSubmit} className="flex gap-2 mb-6">
        <input
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="Or enter ticket number (BBE-…)"
          autoCapitalize="characters"
          className="flex-1 rounded-lg border border-bb-border px-4 py-2.5 text-sm"
        />
        <button type="submit" disabled={scanPhase === 'checking'} className="border border-bb-border font-semibold px-5 py-2.5 rounded-full text-sm hover:border-bb-gold disabled:opacity-50">
          Check in
        </button>
      </form>

      {outcome && style && (
        <div role="status" aria-live="polite" className={`border-2 rounded-2xl p-5 mb-6 ${style.box}`}>
          <p className="font-display font-bold text-xl">{style.label}</p>
          {outcome.result === 'CHECKED_IN' && <p className="text-sm mt-1">Entry recorded. Scanning is paused until you choose Scan next ticket.</p>}
          {outcome.message && outcome.result !== 'CHECKED_IN' && <p className="text-sm mt-1">{outcome.message}</p>}
          {outcome.ticket && (
            <dl className="mt-3 text-sm space-y-0.5">
              <div><dt className="inline font-semibold">Attendee: </dt><dd className="inline">{outcome.ticket.attendeeName || '—'}</dd></div>
              <div><dt className="inline font-semibold">Ticket: </dt><dd className="inline">{outcome.ticket.ticketNumber}{outcome.ticket.tierName ? ` · ${outcome.ticket.tierName}` : ''}</dd></div>
              <div><dt className="inline font-semibold">Event: </dt><dd className="inline">{outcome.ticket.eventTitle}</dd></div>
              {outcome.result === 'ALREADY_CHECKED_IN' && outcome.ticket.checkedInAt && (
                <div><dt className="inline font-semibold">First scanned: </dt><dd className="inline">{new Date(outcome.ticket.checkedInAt).toLocaleString()}</dd></div>
              )}
            </dl>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h2 className="font-display font-bold text-lg text-bb-text mb-2">Recent scans</h2>
          <ul className="space-y-1.5">
            {history.map((h, i) => (
              <li key={`${h.at}-${i}`} className="flex items-center justify-between text-sm bg-bb-surface border border-bb-border rounded-lg px-3 py-2">
                <span className="truncate">{h.outcome.ticket?.attendeeName || h.outcome.ticket?.ticketNumber || 'Unknown code'}</span>
                <span className="text-xs text-bb-text-secondary shrink-0 ml-3">
                  {RESULT_STYLE[h.outcome.result].label} · {new Date(h.at).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
