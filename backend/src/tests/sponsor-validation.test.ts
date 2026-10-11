import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSponsorInput } from '../services/sponsor-validation';

const valid = { name: 'Acme', logoUrl: 'https://cdn.example.com/acme.png' };

test('a sponsor with name and logo is valid; website and text are optional', () => {
  assert.equal(validateSponsorInput(valid, true), null);
});

test('rejects a missing name or logo on create', () => {
  assert.ok(validateSponsorInput({ ...valid, name: ' ' }, true));
  assert.ok(validateSponsorInput({ name: 'Acme' }, true));
});

test('rejects non-http(s) logo and website URLs', () => {
  assert.ok(validateSponsorInput({ ...valid, logoUrl: 'javascript:alert(1)' }, true));
  assert.ok(validateSponsorInput({ ...valid, websiteUrl: 'javascript:alert(1)' }, true));
});

test('accepts an https website and optional description', () => {
  assert.equal(validateSponsorInput({ ...valid, websiteUrl: 'https://acme.com', description: 'Proud partner' }, true), null);
});

test('rejects an over-long description', () => {
  assert.ok(validateSponsorInput({ ...valid, description: 'x'.repeat(501) }, true));
});

test('partial updates only validate fields provided', () => {
  assert.equal(validateSponsorInput({ description: 'New text' }, false), null);
  assert.ok(validateSponsorInput({ name: '' }, false));
});
