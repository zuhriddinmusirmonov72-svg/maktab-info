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

    // So'nggi 7 kun ichidagi barcha articlelar bilan solishtirish
    const candidates = db.prepare(`
      SELECT a.id, a.title, a.url, af.title_normalized
      FROM articles a
      JOIN article_fingerprints af ON a.id = af.article_id
      WHERE a.collected_at > datetime('now', '-7 days')
      ORDER BY a.collected_at DESC
      LIMIT 1000
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

// Mavzu bo'yicha duplicate tekshirish — kalit so'zlar orqali
function hasSameTopic(title1, title2) {
  const t1 = normalizeText(title1).toLowerCase();
  const t2 = normalizeText(title2).toLowerCase();
  
  // Ta'til sanasi bir xil bo'lsa — bir xil yangilik
  const datePattern = /\b(noyabr|oktyabr|sentabr|yanvar|fevral|mart|aprel|may|iyun|iyul|avgust|декабр|ноябр|октябр|сентябр)\b/gi;
  const d1 = t1.match(datePattern) || [];
  const d2 = t2.match(datePattern) || [];
  if (d1.length > 0 && d2.length > 0) {
    const commonDates = d1.filter(d => d2.some(d2i => d2i.toLowerCase() === d.toLowerCase()));
    if (commonDates.length > 0) {
      // Sonlarni ham tekshir (4-noyabr, 4 noyabr, etc.)
      const numPattern = /\b(\d{1,2})\b/g;
      const n1 = [...t1.matchAll(numPattern)].map(m => m[1]);
      const n2 = [...t2.matchAll(numPattern)].map(m => m[1]);
      const commonNums = n1.filter(n => n2.includes(n));
      if (commonNums.length > 0) return true;
    }
  }
  return false;
}

export function isDuplicate(article) {
  if (isDuplicateByUrl(article.url)) {
    logger.debug(`Duplicate by URL: ${article.url}`);
    return true;
  }
  
  // String similarity tekshiruvi
  const similar = findSimilarArticles(article.title);
  if (similar.length > 0) {
    logger.debug(`Duplicate by similarity (${similar[0].similarity.toFixed(2)}): ${article.title}`);
    return true;
  }
  
  // Bir xil mavzu (ta'til sanasi, raqam, oy) — boshqa tilda bo'lsa ham
  if (article.title && article.title.length > 10) {
    const db = getDatabase();
    if (db) {
      try {
        const recentTitles = db.prepare(`
          SELECT a.title FROM articles a
          WHERE a.collected_at > datetime('now', '-3 days')
          LIMIT 200
        `).all();
        
        for (const row of recentTitles) {
          if (hasSameTopic(article.title, row.title)) {
            logger.debug(`Duplicate by topic match: "${article.title}" ~ "${row.title}"`);
            return true;
          }
        }
      } catch (e) {
        // ignore
      }
    }
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
