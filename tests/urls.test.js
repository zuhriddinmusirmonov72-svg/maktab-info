// Mock environment variables for testing
process.env.TELEGRAM_BOT_TOKEN = 'test_token';
process.env.TELEGRAM_CHANNEL_ID = 'test_channel';
process.env.ADMIN_IDS = '123';

import { test } from 'node:test';
import assert from 'node:assert';
import { isValidUrl, normalizeUrl, extractDomain } from '../src/utils/urls.js';

test('URLs - validates HTTPS URLs', () => {
  assert.strictEqual(isValidUrl('https://example.com'), true);
  assert.strictEqual(isValidUrl('http://example.com'), true);
});

test('URLs - rejects invalid protocols', () => {
  assert.strictEqual(isValidUrl('ftp://example.com'), false);
  assert.strictEqual(isValidUrl('file:///etc/passwd'), false);
});

test('URLs - rejects localhost and private IPs', () => {
  assert.strictEqual(isValidUrl('http://localhost'), false);
  assert.strictEqual(isValidUrl('http://127.0.0.1'), false);
  assert.strictEqual(isValidUrl('http://192.168.1.1'), false);
  assert.strictEqual(isValidUrl('http://10.0.0.1'), false);
  assert.strictEqual(isValidUrl('http://169.254.169.254'), false);
});

test('URLs - normalizes URLs', () => {
  const url = 'https://example.com/article?utm_source=test&id=123';
  const normalized = normalizeUrl(url);
  
  assert.ok(!normalized.includes('utm_source'));
  assert.ok(normalized.includes('id=123'));
});

test('URLs - extracts domain', () => {
  assert.strictEqual(extractDomain('https://www.example.com/path'), 'example.com');
  assert.strictEqual(extractDomain('https://subdomain.example.com'), 'subdomain.example.com');
});
