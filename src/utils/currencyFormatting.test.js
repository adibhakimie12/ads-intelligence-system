import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrencyValue } from './currencyFormatting.js';

test('formats MYR ad spend with two decimals', () => {
  assert.equal(formatCurrencyValue(4.9, 'MYR'), 'RM 4.90');
});

test('formats USD ad spend with two decimals', () => {
  assert.equal(formatCurrencyValue(12, 'USD'), '$12.00');
});

test('formats zero safely', () => {
  assert.equal(formatCurrencyValue(undefined, 'MYR'), 'RM 0.00');
});
