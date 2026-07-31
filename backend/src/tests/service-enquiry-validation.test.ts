import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateServiceEnquiryInput,
  resolveEventServiceType,
  resolveGuestCount,
} from '../services/service-enquiry-validation';

const validInput = {
  fullName: 'Priya Nair',
  email: 'priya@example.com',
  message: 'We would like help organising our wedding reception.',
  consentToContact: true,
};

test('a fully-valid enquiry passes validation', () => {
  assert.equal(validateServiceEnquiryInput(validInput), null);
});

test('rejects a missing full name', () => {
  assert.ok(validateServiceEnquiryInput({ ...validInput, fullName: '' }));
});

test('rejects an invalid email', () => {
  assert.ok(validateServiceEnquiryInput({ ...validInput, email: 'not-an-email' }));
});

test('rejects a too-short message', () => {
  assert.ok(validateServiceEnquiryInput({ ...validInput, message: 'hi' }));
});

test('rejects missing consent', () => {
  assert.ok(validateServiceEnquiryInput({ ...validInput, consentToContact: false }));
});

test('unknown service types fall back to OTHER', () => {
  assert.equal(resolveEventServiceType('NOT_A_REAL_TYPE'), 'OTHER');
  assert.equal(resolveEventServiceType(undefined), 'OTHER');
});

test('known service types are preserved', () => {
  assert.equal(resolveEventServiceType('WEDDING'), 'WEDDING');
});

test('guest count must be a positive number within range', () => {
  assert.equal(resolveGuestCount(150), 150);
  assert.equal(resolveGuestCount(-5), undefined);
  assert.equal(resolveGuestCount(0), undefined);
  assert.equal(resolveGuestCount(200_000), undefined);
  assert.equal(resolveGuestCount('not-a-number'), undefined);
});

test('guest count is rounded to the nearest integer', () => {
  assert.equal(resolveGuestCount(49.7), 50);
});
