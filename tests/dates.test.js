import { test } from 'node:test';
import assert from 'node:assert';
import { parseDate, isRecentArticle, isFutureDate, formatDateUzbek } from '../src/utils/dates.js';

test('Dates - parses ISO dates', () => {
  const date = parseDate('2024-01-15T10:30:00Z');
  assert.ok(date instanceof Date);
  assert.strictEqual(date.getFullYear(), 2024);
});

test('Dates - returns null for invalid dates', () => {
  assert.strictEqual(parseDate('invalid-date'), null);
  assert.strictEqual(parseDate(''), null);
  assert.strictEqual(parseDate(null), null);
});

test('Dates - detects recent articles', () => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  assert.strictEqual(isRecentArticle(oneHourAgo, 72), true);
  assert.strictEqual(isRecentArticle(oneHourAgo, 0.5), false);
});

test('Dates - rejects future dates', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  assert.strictEqual(isFutureDate(tomorrow), true);
  assert.strictEqual(isRecentArticle(tomorrow, 72), false);
});

test('Dates - formats Uzbek dates', () => {
  const date = new Date('2024-01-15');
  const formatted = formatDateUzbek(date);
  
  assert.ok(formatted.includes('15'));
  assert.ok(formatted.includes('01'));
  assert.ok(formatted.includes('2024'));
});
