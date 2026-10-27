import test from 'node:test';
import assert from 'node:assert/strict';
import { createCheckInSession } from './checkin-session.ts';

test('holding a QR in the camera submits once, including after the response arrives', () => {
  const session = createCheckInSession();
  let requests = 0;
  const frame = () => { if (session.begin()) requests++; };
  frame();
  for (let i = 0; i < 300; i++) frame();
  assert.equal(requests, 1);
  session.finish();
  for (let i = 0; i < 1000; i++) frame();
  assert.equal(requests, 1);
  assert.equal(session.phase, 'paused');
  assert.equal(session.resume(), true);
  frame();
  assert.equal(requests, 2);
});

test('an in-flight check-in cannot be bypassed by resume or manual entry', () => {
  const session = createCheckInSession();
  assert.equal(session.begin(), true);
  assert.equal(session.resume(), false);
  assert.equal(session.begin(true), false);
  session.finish();
  assert.equal(session.begin(), false);
  assert.equal(session.begin(true), true, 'manual entry is an intentional new attempt');
});

