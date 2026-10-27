import { after, before, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import express from 'express';

const authOrigin = 'https://auth.example.test';
const upstreamRequests: { url: string; body: URLSearchParams }[] = [];
const realFetch = globalThis.fetch;
let server: Server;
let baseUrl: string;

before(async () => {
  process.env.COGNITO_AUTH_URL = `${authOrigin}/`;
  process.env.COGNITO_DOMAIN = 'legacy-cognito-prefix';
  process.env.COGNITO_CLIENT_ID = 'test-oauth-client';
  process.env.FRONTEND_URL = 'https://events.example.test,https://preview.example.test';
  mock.method(console, 'error', () => {});
  mock.method(globalThis, 'fetch', async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    if (String(input).startsWith(authOrigin)) {
      const body = new URLSearchParams(String(init?.body));
      upstreamRequests.push({ url: String(input), body });
      if (body.get('grant_type') === 'refresh_token') {
        return Response.json({ id_token: 'refreshed-id-token', access_token: 'refreshed-access-token', expires_in: 3600 });
      }
      return Response.json({ error: 'invalid_grant' }, { status: 400 });
    }
    return realFetch(input, init);
  });

  const { default: authRoutes } = await import('../routes/auth');
  const app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);
  server = await new Promise<Server>((resolve, reject) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    listener.on('error', reject);
  });
  const address = server.address();
  assert(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  mock.restoreAll();
});

test('Google authorization uses the custom domain and returns to the requesting frontend', async () => {
  for (const origin of ['https://events.example.test', 'https://preview.example.test']) {
    const response = await realFetch(`${baseUrl}/auth/cognito/login`, { headers: { Origin: origin } });
    assert.equal(response.status, 200);
    const result = await response.json() as { data: { loginUrl: string } };
    const login = new URL(result.data.loginUrl);
    assert.equal(login.origin, authOrigin);
    assert.equal(login.pathname, '/oauth2/authorize');
    assert.equal(login.searchParams.get('redirect_uri'), `${origin}/auth/callback`);
    assert.equal(login.searchParams.get('identity_provider'), 'Google');
    assert.equal(login.searchParams.get('client_id'), 'test-oauth-client');
  }
});

test('authorization-code exchange uses the custom token endpoint and preserves the callback URI', async () => {
  const redirectUri = 'https://preview.example.test/auth/callback';
  const response = await realFetch(`${baseUrl}/auth/cognito/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'expired-test-code', redirect_uri: redirectUri }),
  });
  assert.equal(response.status, 401);
  const upstream = upstreamRequests.at(-1)!;
  assert.equal(upstream.url, `${authOrigin}/oauth2/token`);
  assert.equal(upstream.body.get('grant_type'), 'authorization_code');
  assert.equal(upstream.body.get('redirect_uri'), redirectUri);
});

test('session refresh uses the same custom token endpoint', async () => {
  const response = await realFetch(`${baseUrl}/auth/cognito/refresh`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: 'test-refresh-token' }),
  });
  assert.equal(response.status, 200);
  const result = await response.json() as { data: { id_token: string } };
  assert.equal(result.data.id_token, 'refreshed-id-token');
  const upstream = upstreamRequests.at(-1)!;
  assert.equal(upstream.url, `${authOrigin}/oauth2/token`);
  assert.equal(upstream.body.get('grant_type'), 'refresh_token');
  assert.equal(upstream.body.get('refresh_token'), 'test-refresh-token');
});
