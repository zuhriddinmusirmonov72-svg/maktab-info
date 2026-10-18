import { test } from 'node:test';
import assert from 'node:assert';

// Mock environment and database
process.env.TELEGRAM_BOT_TOKEN = 'test_token';
process.env.TELEGRAM_CHANNEL_ID = 'test_channel';
process.env.ADMIN_IDS = '123';
process.env.MAX_ARTICLE_AGE_HOURS = '72';

import { validateArticle, VALIDATION_STATUS } from '../src/services/sourceValidator.js';

test('SourceValidator - rejects empty URL', () => {
  const article = {
    title: 'Test Article',
    description: 'Test description with enough content to pass length check',
    url: '',
  };
  
  const result = validateArticle(article);
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.status, VALIDATION_STATUS.INVALID_URL);
});

test('SourceValidator - rejects unsafe URLs', () => {
  const article = {
    title: 'Test Article',
    description: 'Test description with enough content to pass length check',
    url: 'http://localhost/test',
  };
  
  const result = validateArticle(article);
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.status, VALIDATION_STATUS.UNSAFE_URL);
});

test('SourceValidator - rejects short title', () => {
  const article = {
    title: 'Short',
    description: 'Test description with enough content to pass length check',
    url: 'https://example.com/article',
  };
  
  const result = validateArticle(article);
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.status, VALIDATION_STATUS.TOO_SHORT);
});

test('SourceValidator - rejects empty content', () => {
  const article = {
    title: 'Valid Title Here',
    description: '',
    content: '',
    url: 'https://example.com/article',
  };
  
  const result = validateArticle(article);
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.status, VALIDATION_STATUS.EMPTY_CONTENT);
});

test('SourceValidator - rejects future dates', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const article = {
    title: 'Valid Title Here',
    description: 'Valid description with enough content to pass length validation check',
    url: 'https://example.com/article',
    publishedAt: tomorrow.toISOString(),
  };
  
  const result = validateArticle(article);
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.status, VALIDATION_STATUS.FUTURE_DATE);
});
