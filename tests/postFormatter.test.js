// Mock environment variables for testing
process.env.TELEGRAM_BOT_TOKEN = 'test_token';
process.env.TELEGRAM_CHANNEL_ID = 'test_channel';
process.env.ADMIN_IDS = '123';

import { test } from 'node:test';
import assert from 'node:assert';
import { formatPost, formatSimplePost } from '../src/services/postFormatter.js';

test('PostFormatter - creates complete post', () => {
  const article = {
    id: 1,
    title: 'Test yangiligi',
    description: 'Bu test yangiligi matni',
    url: 'https://example.com/news/1',
    published_at: '2024-01-15',
    category: 'official',
  };
  
  const post = formatPost(article, 'Test Manba');
  
  assert.ok(post.includes('Test yangiligi'));
  assert.ok(post.includes('Bu test yangiligi matni'));
  assert.ok(post.includes('Test Manba'));
  assert.ok(post.includes('https://example.com/news/1'));
  assert.ok(post.includes('#MaktabInfo'));
});

test('PostFormatter - includes emoji by category', () => {
  const official = formatPost({ 
    title: 'Test',
    description: 'Desc',
    url: 'https://example.com',
    category: 'official',
  }, 'Source');
  
  const general = formatPost({ 
    title: 'Test',
    description: 'Desc',
    url: 'https://example.com',
    category: 'general',
  }, 'Source');
  
  assert.ok(official.includes('📢') || official.includes('📰'));
  assert.ok(general.includes('📰'));
});

test('PostFormatter - escapes Markdown', () => {
  const article = {
    title: 'Test [Link] *Bold*',
    description: 'Description_with_underscores',
    url: 'https://example.com',
    category: 'general',
  };
  
  const post = formatPost(article, 'Source');
  
  assert.ok(post.includes('\\['));
  assert.ok(post.includes('\\]'));
  assert.ok(post.includes('\\*'));
});

test('PostFormatter - creates simple post', () => {
  const post = formatSimplePost('Test Title', 'https://example.com', 'Test Source');
  
  assert.ok(post.includes('Test Title'));
  assert.ok(post.includes('https://example.com'));
  assert.ok(post.includes('Test Source'));
});

test('PostFormatter - respects message length limit', () => {
  const longArticle = {
    title: 'Test',
    description: 'A'.repeat(5000),
    url: 'https://example.com',
    category: 'general',
  };
  
  const post = formatPost(longArticle, 'Source');
  
  assert.ok(post.length < 4096, 'Post should not exceed Telegram limit');
});
