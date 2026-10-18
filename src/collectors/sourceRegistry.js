import { getDatabase } from '../database.js';
import logger from '../logger.js';

// Default trusted sources for Uzbekistan education news
const DEFAULT_SOURCES = [
  {
    name: 'Xalq ta\'limi vazirligi',
    domain: 'uzedu.uz',
    url: 'https://uzedu.uz/uz/rss',
    type: 'rss',
    enabled: true,
    language: 'uz',
    category: 'official',
    trust_level: 'official',
    collection_interval_minutes: 5,
  },
  {
    name: 'Kun.uz yangiliklar',
    domain: 'kun.uz',
    url: 'https://kun.uz/news/rss',
    type: 'rss',
    enabled: true,
    language: 'uz',
    category: 'general',
    trust_level: 'trusted',
    collection_interval_minutes: 5,
  },
  {
    name: 'Daryo.uz',
    domain: 'daryo.uz',
    url: 'https://daryo.uz/feed',
    type: 'rss',
    enabled: true,
    language: 'uz',
    category: 'general',
    trust_level: 'trusted',
    collection_interval_minutes: 5,
  },
  {
    name: 'Davlat test markazi',
    domain: 'dtm.uz',
    url: 'https://dtm.uz/uz/rss',
    type: 'rss',
    enabled: true,
    language: 'uz',
    category: 'testing',
    trust_level: 'official',
    collection_interval_minutes: 5,
  },
  {
    name: 'Zamin.uz',
    domain: 'zamin.uz',
    url: 'https://zamin.uz/rss/news.xml',
    type: 'rss',
    enabled: true,
    language: 'uz',
    category: 'general',
    trust_level: 'trusted',
    collection_interval_minutes: 5,
  },
  {
    name: 'Gazeta.uz',
    domain: 'gazeta.uz',
    url: 'https://www.gazeta.uz/uz/rss/',
    type: 'rss',
    enabled: true,
    language: 'uz',
    category: 'general',
    trust_level: 'trusted',
    collection_interval_minutes: 5,
  },
  {
    name: 'Qalampir.uz',
    domain: 'qalampir.uz',
    url: 'https://qalampir.uz/rss',
    type: 'rss',
    enabled: true,
    language: 'uz',
    category: 'general',
    trust_level: 'trusted',
    collection_interval_minutes: 5,
  },
];

export function initializeSources() {
  const db = getDatabase();
  if (!db) {
    logger.error('Database not initialized');
    return;
  }

  // Remove old web-type sources and replace with RSS sources
  const deleteOld = db.prepare(`DELETE FROM sources WHERE type = 'web'`);
  deleteOld.run();

  // Kun.uz eski URL ni yangilash
  db.prepare(`UPDATE sources SET url = 'https://kun.uz/news/rss', name = 'Kun.uz yangiliklar' WHERE domain = 'kun.uz'`).run();

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO sources (name, domain, url, type, enabled, language, category, trust_level, collection_interval_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let addedCount = 0;
  for (const source of DEFAULT_SOURCES) {
    try {
      const result = insertStmt.run(
        source.name,
        source.domain,
        source.url,
        source.type,
        source.enabled ? 1 : 0,
        source.language,
        source.category,
        source.trust_level,
        source.collection_interval_minutes
      );
      
      if (result.changes > 0) {
        addedCount++;
      }
    } catch (error) {
      logger.error(`Failed to add source ${source.name}:`, error.message);
    }
  }

  if (addedCount > 0) {
    logger.info(`Initialized ${addedCount} default sources`);
  }
}

export function getEnabledSources() {
  const db = getDatabase();
  if (!db) return [];

  const stmt = db.prepare(`
    SELECT * FROM sources 
    WHERE enabled = 1 
    ORDER BY trust_level DESC, collection_interval_minutes ASC
  `);
  
  return stmt.all();
}

export function getAllSources() {
  const db = getDatabase();
  if (!db) return [];

  const stmt = db.prepare('SELECT * FROM sources ORDER BY name');
  return stmt.all();
}

export function getSourceById(id) {
  const db = getDatabase();
  if (!db) return null;

  const stmt = db.prepare('SELECT * FROM sources WHERE id = ?');
  return stmt.get(id);
}

export function updateSourceEnabled(id, enabled) {
  const db = getDatabase();
  if (!db) return false;

  const stmt = db.prepare('UPDATE sources SET enabled = ? WHERE id = ?');
  const result = stmt.run(enabled ? 1 : 0, id);
  return result.changes > 0;
}

export function updateSourceLastCollected(id) {
  const db = getDatabase();
  if (!db) return;

  const stmt = db.prepare('UPDATE sources SET last_collected_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(id);
}

export function addSource(sourceData) {
  const db = getDatabase();
  if (!db) return null;

  const stmt = db.prepare(`
    INSERT INTO sources (name, domain, url, type, enabled, language, category, trust_level, collection_interval_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    const result = stmt.run(
      sourceData.name,
      sourceData.domain,
      sourceData.url,
      sourceData.type || 'rss',
      sourceData.enabled ? 1 : 0,
      sourceData.language || 'uz',
      sourceData.category || 'general',
      sourceData.trust_level || 'trusted',
      sourceData.collection_interval_minutes || 60
    );

    return result.lastInsertRowid;
  } catch (error) {
    logger.error('Failed to add source:', error);
    return null;
  }
}

export function isSourceAllowed(url) {
  const db = getDatabase();
  if (!db) return false;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, '');

    const stmt = db.prepare('SELECT COUNT(*) as count FROM sources WHERE domain = ? AND enabled = 1');
    const result = stmt.get(hostname);

    return result.count > 0;
  } catch (error) {
    logger.error('Invalid URL in isSourceAllowed:', url);
    return false;
  }
}

export default {
  initializeSources,
  getEnabledSources,
  getAllSources,
  getSourceById,
  updateSourceEnabled,
  updateSourceLastCollected,
  addSource,
  isSourceAllowed,
};
