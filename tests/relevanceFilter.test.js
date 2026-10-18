// Mock environment variables for testing
process.env.TELEGRAM_BOT_TOKEN = 'test_token';
process.env.TELEGRAM_CHANNEL_ID = 'test_channel';
process.env.ADMIN_IDS = '123';

import { test } from 'node:test';
import assert from 'node:assert';
import { calculateRelevanceScore, isRelevant } from '../src/services/relevanceFilter.js';

test('Relevance - scores education keywords', () => {
  const article = {
    title: 'Ta\'lim sohasida yangiliklar',
    description: 'Maktab o\'quvchilari uchun olimpiada',
    content: '',
    category: 'general',
  };
  
  const score = calculateRelevanceScore(article);
  assert.ok(score > 0, 'Should have positive relevance score');
});

test('Relevance - boosts official sources', () => {
  const regular = {
    title: 'Ta\'lim yangiligi',
    description: 'Test description',
    content: '',
    category: 'general',
  };
  
  const official = {
    ...regular,
    category: 'official',
  };
  
  const regularScore = calculateRelevanceScore(regular);
  const officialScore = calculateRelevanceScore(official);
  
  assert.ok(officialScore > regularScore, 'Official sources should score higher');
});

test('Relevance - rejects excluded keywords', () => {
  const article = {
    title: 'Казино онлайн',
    description: 'Spam content',
    content: '',
    category: 'general',
  };
  
  const score = calculateRelevanceScore(article);
  assert.strictEqual(score, 0, 'Should reject spam content');
});

test('Relevance - filters by minimum score', () => {
  const relevant = {
    title: 'Olimpiada va test imtihonlari',
    description: 'Ta\'lim yangiliklari',
    content: '',
    category: 'official',
  };
  
  const irrelevant = {
    title: 'Random news',
    description: 'Not related to education',
    content: '',
    category: 'general',
  };
  
  assert.strictEqual(isRelevant(relevant, 30), true);
  assert.strictEqual(isRelevant(irrelevant, 30), false);
});
