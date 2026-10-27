import test from 'node:test';
import assert from 'node:assert/strict';
import * as frontend from './enquiry-date.ts';
import * as backend from '../../../backend/src/services/enquiry-date-validation.ts';

const now = new Date('2026-10-21T12:00:00Z');

for (const [name, rules] of [['frontend', frontend], ['backend', backend]]) {
  test(`${name}: accepts today, future dates, and real leap days`, () => {
    for (const date of ['2026-10-21', '2026-10-22', '2028-02-29']) {
      assert.equal(rules.getEnquiryDateError(date, true, now), null);
    }
  });

  test(`${name}: rejects past dates, impossible dates, text, and non-string values`, () => {
    for (const date of ['2026-10-20', '2026-02-29', '2028-02-30', '2026-13-01', '2026-00-01', '2026-10-00',
      '2026-1-2', '2026-10-21T12:00:00Z', 'tomorrow', '   ', null, 20261021, {}, []]) {
      assert.match(rules.getEnquiryDateError(date, true, now), /date/i, String(date));
    }
  });

  test(`${name}: missing dates are accepted only for optional fields`, () => {
    for (const date of [undefined, '']) {
      assert.equal(rules.getEnquiryDateError(date, false, now), null);
      assert.equal(rules.getEnquiryDateError(date, true, now), 'Please choose a preferred date.');
    }
  });

  test(`${name}: uses the Dublin calendar date across midnight and daylight saving`, () => {
    assert.equal(rules.getTodayInDublin(new Date('2026-07-15T23:30:00Z')), '2026-07-16');
    assert.equal(rules.getTodayInDublin(new Date('2026-12-15T23:30:00Z')), '2026-12-15');
    assert.equal(rules.getEnquiryDateError('2026-07-15', true, new Date('2026-07-15T23:30:00Z')), 'Preferred date must be today or later.');
  });
}
