import { getDatabase } from '../database.js';
import { normalizeUrl } from '../utils/urls.js';
import { parseDate } from '../utils/dates.js';
import logger from '../logger.js';

export function saveArticle(article) {
  const db = getDatabase();
  if (!db) {
    logger.error('Database not initialized');
    return null;
  }

  try {
    // Debug logging
    logger.debug(`Attempting to save article: ${article.title}`);
    logger.debug(`  sourceId: ${article.sourceId}, url: ${article.url}`);
    
    const stmt = db.prepare(`
      INSERT INTO articles (
        source_id, title, description, content, url, url_normalized,
        published_at, author, category, status, relevance_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      article.sourceId,
      article.title,
      article.description || '',
      article.content || '',
      article.url,
      normalizeUrl(article.url),
      article.publishedAt || null,
      article.author || '',
      article.category || 'general',
      article.status || 'NEW',
      article.relevanceScore || 0
    );

    logger.info(`✅ Article saved with ID ${result.lastInsertRowid}: ${article.title}`);
    return result.lastInsertRowid;
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      logger.debug(`Article already exists: ${article.url}`);
      return null;
    }
    
    logger.error('Failed to save article:', error);
    logger.error('Article data:', JSON.stringify({ sourceId: article.sourceId, url: article.url, title: article.title }));
    return null;
  }
}

export function getArticleById(id) {
  const db = getDatabase();
  if (!db) return null;

  const stmt = db.prepare('SELECT * FROM articles WHERE id = ?');
  return stmt.get(id);
}

export function updateArticleStatus(id, status) {
  const db = getDatabase();
  if (!db) return false;

  const stmt = db.prepare('UPDATE articles SET status = ? WHERE id = ?');
  const result = stmt.run(status, id);
  return result.changes > 0;
}

export function getArticlesByStatus(status, limit = 50) {
  const db = getDatabase();
  if (!db) return [];

  const stmt = db.prepare(`
    SELECT a.*, s.name as source_name
    FROM articles a
    JOIN sources s ON a.source_id = s.id
    WHERE a.status = ?
    ORDER BY a.relevance_score DESC, a.collected_at DESC
    LIMIT ?
  `);

  return stmt.all(status, limit);
}

export function getRecentArticles(limit = 20) {
  const db = getDatabase();
  if (!db) return [];

  const stmt = db.prepare(`
    SELECT a.*, s.name as source_name
    FROM articles a
    JOIN sources s ON a.source_id = s.id
    ORDER BY a.collected_at DESC
    LIMIT ?
  `);

  return stmt.all(limit);
}

export default {
  saveArticle,
  getArticleById,
  updateArticleStatus,
  getArticlesByStatus,
  getRecentArticles,
};
