import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMoney, parseMoneyToMinor } from './format.ts';

test('refund inputs use regular amounts and preserve the exact amount sent to the API', () => {
  for (const [input, minor] of [['25', 2500], ['25.50', 2550], ['0.29', 29], ['1.01', 101], [' 12.3 ', 1230], ['0.01', 1]]) {
    assert.equal(parseMoneyToMinor(input), minor);
  }
  assert.equal(formatMoney(2550, 'EUR'), '€25.50');
});

test('refund inputs reject malformed amounts and excess precision rather than silently rounding', () => {
  for (const input of ['', ' ', '-1', '1.005', 'NaN', 'Infinity', '1e2', '12abc', '€25', '1,000', '9007199254740991']) {
    assert.equal(parseMoneyToMinor(input), null, input);
  }
});
