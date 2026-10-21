import test from 'node:test';
import assert from 'node:assert/strict';
import { authPageUrl, getAuthReturnPath } from './auth-redirect.ts';

const items = [{ ticketTierId: 'standard', quantity: 2 }, { ticketTierId: 'group', quantity: 4 }, { ticketTierId: 'child', quantity: 1 }];
const checkoutPath = `/checkout/event-123?${new URLSearchParams({ items: JSON.stringify(items), slug: 'music-night' })}`;
const parse = (path) => new URL(path, 'https://example.com');

test('sign in returns to the same event and mixed ticket quantities', () => {
  const signIn = parse(authPageUrl('/auth/sign-in', checkoutPath));
  const destination = getAuthReturnPath(signIn.searchParams.get('next'));
  assert.equal(destination, checkoutPath);
  assert.deepEqual(JSON.parse(parse(destination).searchParams.get('items')), items);
});

test('sign up, email verification, and sign in retain the original checkout', () => {
  const signUp = parse(authPageUrl('/auth/sign-up', checkoutPath));
  const verification = parse(authPageUrl('/auth/verify-email', signUp.searchParams.get('next'), { email: 'buyer+test@example.com' }));
  assert.equal(verification.searchParams.get('email'), 'buyer+test@example.com');
  const signIn = parse(authPageUrl('/auth/sign-in', verification.searchParams.get('next'), { verified: '1' }));
  assert.equal(signIn.searchParams.get('verified'), '1');
  assert.equal(getAuthReturnPath(signIn.searchParams.get('next')), checkoutPath);
});

test('password recovery and switching between sign in and sign up retain checkout', () => {
  let returnTo = checkoutPath;
  for (const page of ['/auth/sign-in', '/auth/sign-up', '/auth/sign-in', '/auth/forgot-password', '/auth/reset-password', '/auth/sign-in']) {
    const url = parse(authPageUrl(page, returnTo));
    returnTo = url.searchParams.get('next');
    assert.equal(returnTo, checkoutPath);
  }
});

test('legacy ticket URLs and account ticket links are valid return destinations', () => {
  for (const path of ['/checkout/event-123?tier=standard&qty=3&slug=music-night', '/account/tickets/BBE-123', '/account/profile#phone']) {
    assert.equal(getAuthReturnPath(path), path);
  }
});

test('untrusted external or malformed return URLs fall back to the account page', () => {
  for (const path of [undefined, null, '', 'https://evil.example/', '//evil.example/', 'javascript:alert(1)',
    '/\\evil.example/', '/%5cevil.example/', '/%2f%2fevil.example/', '/a/..//evil.example/', '/\nevil.example/', '/%0Aevil.example/', '/%broken']) {
    assert.equal(getAuthReturnPath(path), '/account', String(path));
  }
  assert.equal(parse(authPageUrl('/auth/sign-in', '//evil.example/')).searchParams.get('next'), '/account');
});
