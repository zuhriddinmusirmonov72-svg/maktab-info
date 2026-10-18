import { test } from 'node:test';
import assert from 'node:assert';
import { normalizeText, stripHtml, escapeMarkdown, containsAnyKeyword } from '../src/utils/text.js';

test('Text - normalizes text', () => {
  const text = '  Hello   World!  ';
  const normalized = normalizeText(text);
  
  assert.strictEqual(normalized, 'hello world');
});

test('Text - strips HTML tags', () => {
  const html = '<p>Hello <strong>World</strong></p>';
  const stripped = stripHtml(html);
  
  assert.strictEqual(stripped, 'Hello World');
});

test('Text - removes scripts and styles', () => {
  const html = '<script>alert("xss")</script><p>Content</p><style>.class{}</style>';
  const stripped = stripHtml(html);
  
  assert.ok(!stripped.includes('script'));
  assert.ok(!stripped.includes('alert'));
  assert.ok(stripped.includes('Content'));
});

test('Text - escapes Markdown special characters', () => {
  const text = 'Hello *World* [Link](url)';
  const escaped = escapeMarkdown(text);
  
  assert.ok(escaped.includes('\\*'));
  assert.ok(escaped.includes('\\['));
  assert.ok(escaped.includes('\\]'));
});

test('Text - checks keyword presence', () => {
  const text = 'Ta\'lim sohasida yangiliklar';
  
  assert.strictEqual(containsAnyKeyword(text, ['talim', 'yangilik']), true);
  assert.strictEqual(containsAnyKeyword(text, ['sport', 'futbol']), false);
});
