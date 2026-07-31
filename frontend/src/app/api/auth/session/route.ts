// MED-2: Session management via httpOnly cookie so the refresh token never
// lives in localStorage (inaccessible to XSS).
//
// POST /api/auth/session  — store refresh token in httpOnly cookie
// GET  /api/auth/session  — silently refresh using cookie; returns new id_token
// DELETE /api/auth/session — clear cookie on logout

import { NextRequest, NextResponse } from 'next/server';

const REFRESH_COOKIE = 'bb_refresh';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Validates that the request originates from the same site.
 * Prevents cross-origin form POST session-fixation attacks (Issue 6).
 */
function isSameOrigin(req: NextRequest): boolean {
  const host = req.headers.get('host');
  if (!host) return false;

  // Sec-Fetch-Site is set by all modern browsers for cross-origin requests
  const secFetchSite = req.headers.get('sec-fetch-site');
  if (secFetchSite) {
    return secFetchSite === 'same-origin';
  }

  // Fallback: validate Origin header matches our host
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const refresh_token =
    body && typeof body === 'object' && 'refresh_token' in body
      ? (body as any).refresh_token
      : null;

  if (!refresh_token || typeof refresh_token !== 'string') {
    return NextResponse.json(
      { error: 'refresh_token is required' },
      { status: 400 },
    );
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(REFRESH_COOKIE, refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}

export async function GET(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  // Exchange refresh token for new id_token via the Express API
  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(`${API_URL}/auth/cognito/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    return NextResponse.json({ success: false }, { status: 502 });
  }

  if (!tokenResponse.ok) {
    // Refresh token is stale — clear the cookie
    const res = NextResponse.json({ success: false }, { status: 401 });
    res.cookies.delete(REFRESH_COOKIE);
    return res;
  }

  const data = (await tokenResponse.json()) as {
    success: boolean;
    data?: { id_token: string; access_token: string; expires_in: number };
  };

  return NextResponse.json({ success: true, data: data.data });
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(REFRESH_COOKIE);
  return res;
}
