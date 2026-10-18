import pkg from 'string-similarity-js';
const { getStringSimilarity: stringSimilarity } = pkg;
import { getDatabase } from '../database.js';
import { normalizeText } from '../utils/text.js';
import { normalizeUrl } from '../utils/urls.js';
import config from '../config.js';
import logger from '../logger.js';
import crypto from 'crypto';

export function isDuplicateByUrl(url) {
  const db = getDatabase();
  if (!db) return false;

  try {
    const normalized = normalizeUrl(url);
    const result = db.prepare(
      'SELECT COUNT(*) as count FROM articles WHERE url_normalized = ?'
    ).get(normalized);
    return result && result.count > 0;
  } catch (e) {
    logger.error('isDuplicateByUrl error:', e.message);
    return false;
  }
}

export function findSimilarArticles(title, threshold = null) {
  const db = getDatabase();
  if (!db) return [];

  try {
    const similarityThreshold = threshold !== null
      ? threshold
      : config.publishing.similarityThreshold;
    const normalizedTitle = normalizeText(title);

    const candidates = db.prepare(`
      SELECT a.id, a.title, a.url, af.title_normalized
      FROM articles a
      JOIN article_fingerprints af ON a.id = af.article_id
      WHERE a.collected_at > datetime('now', '-30 days')
      ORDER BY a.collected_at DESC
      LIMIT 500
    `).all();

    const similar = [];
    for (const candidate of candidates) {
      const sim = stringSimilarity(normalizedTitle, candidate.title_normalized);
      if (sim >= similarityThreshold) {
        similar.push({ id: candidate.id, title: candidate.title, url: candidate.url, similarity: sim });
      }
    }
    return similar.sort((a, b) => b.similarity - a.similarity);
  } catch (e) {
    logger.error('findSimilarArticles error:', e.message);
    return [];
  }
}

export function isDuplicate(article) {
  if (isDuplicateByUrl(article.url)) {
    logger.debug(`Duplicate by URL: ${article.url}`);
    return true;
  }
  const similar = findSimilarArticles(article.title);
  if (similar.length > 0) {
    logger.debug(`Duplicate by similarity (${similar[0].similarity.toFixed(2)}): ${article.title}`);
    return true;
  }
  return false;
}

export function createArticleFingerprint(articleId, title, content = '') {
  const db = getDatabase();
  if (!db) return;

  try {
    const normalizedTitle = normalizeText(title);
    let contentHash = null;
    if (content && content.length > 100) {
      contentHash = crypto.createHash('sha256')
        .update(normalizeText(content))
        .digest('hex')
        .substring(0, 16);
    }
    db.prepare(
      'INSERT INTO article_fingerprints (article_id, title_normalized, content_hash) VALUES (?, ?, ?)'
    ).run(articleId, normalizedTitle, contentHash);
  } catch (e) {
    logger.error('createArticleFingerprint error:', e.message);
  }
}

export default {
  isDuplicateByUrl,
  findSimilarArticles,
  isDuplicate,
  createArticleFingerprint,
};
