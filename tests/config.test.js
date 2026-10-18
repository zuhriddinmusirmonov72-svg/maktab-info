import { test } from 'node:test';
import assert from 'node:assert';

// Mock environment variables for testing
process.env.TELEGRAM_BOT_TOKEN = 'test_bot_token_123456';
process.env.TELEGRAM_CHANNEL_ID = '-1001234567890';
process.env.ADMIN_IDS = '123456789,987654321';
process.env.PUBLISHING_ENABLED = 'false';

const { default: config, validateConfig } = await import('../src/config.js');

test('Config - loads environment variables', () => {
  assert.strictEqual(config.telegram.botToken, 'test_bot_token_123456');
  assert.strictEqual(config.telegram.channelId, '-1001234567890');
  assert.deepStrictEqual(config.telegram.adminIds, ['123456789', '987654321']);
});

test('Config - validates required fields', () => {
  const errors = validateConfig();
  assert.strictEqual(errors.length, 0, 'Should have no validation errors');
});

test('Config - publishing defaults', () => {
  assert.strictEqual(config.publishing.enabled, false);
  assert.strictEqual(config.publishing.maxPostsPerDay, 5);
  assert.strictEqual(config.publishing.maxPostsPerRun, 2);
});

test('Config - parses numeric values', () => {
  assert.strictEqual(typeof config.publishing.maxPostsPerDay, 'number');
  assert.strictEqual(typeof config.publishing.similarityThreshold, 'number');
  assert.ok(config.publishing.similarityThreshold > 0 && config.publishing.similarityThreshold <= 1);
});
