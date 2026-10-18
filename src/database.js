import initSqlJs from 'sql.js';
import { resolve, dirname } from 'path';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import config from './config.js';
import logger from './logger.js';

let db = null;
let SQL = null;

// Helper functions to mimic better-sqlite3 API
function prepare(sql) {
  return {
    run(...params) {
      try {
        db.run(sql, params);
        saveDatabase();
        // Get the actual last inserted ID
        const getLastIdSQL = 'SELECT seq as id FROM sqlite_sequence WHERE name=?';
        let lastId = null;
        try {
          // Try to extract table name from INSERT statement
          const tableMatch = sql.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)/i);
          if (tableMatch) {
            const tableName = tableMatch[1];
            const result = db.exec(getLastIdSQL, [tableName]);
            if (result && result[0] && result[0].values && result[0].values[0]) {
              lastId = result[0].values[0][0];
            }
          }
        } catch (e) {
          // Fallback: use last_insert_rowid()
          const result = db.exec('SELECT last_insert_rowid() as id');
          if (result && result[0] && result[0].values && result[0].values[0]) {
            lastId = result[0].values[0][0];
          }
        }
        return { changes: 1, lastInsertRowid: lastId };
      } catch (error) {
        if (error.message && error.message.includes('UNIQUE constraint')) {
          return { changes: 0, lastInsertRowid: null };
        }
        throw error;
      }
    },
    get(...params) {
      try {
        const result = db.exec(sql, params);
        if (result && result.length > 0 && result[0].values.length > 0) {
          const columns = result[0].columns;
          const values = result[0].values[0];
          const row = {};
          columns.forEach((col, i) => {
            row[col] = values[i];
          });
          return row;
        }
        return null;
      } catch (error) {
        logger.error('Query error:', error);
        return null;
      }
    },
    all(...params) {
      try {
        const result = db.exec(sql, params);
        if (result && result.length > 0) {
          const columns = result[0].columns;
          return result[0].values.map(values => {
            const row = {};
            columns.forEach((col, i) => {
              row[col] = values[i];
            });
            return row;
          });
        }
        return [];
      } catch (error) {
        logger.error('Query error:', error);
        return [];
      }
    }
  };
}

export async function initDatabase() {
  try {
    const dbPath = resolve(config.app.databasePath);
    const dbDir = dirname(dbPath);
    
    // Ensure data directory exists
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
      logger.info(`Created database directory: ${dbDir}`);
    }

    // Initialize SQL.js
    SQL = await initSqlJs();
    
    // Load existing database or create new
    let buffer = null;
    if (existsSync(dbPath)) {
      buffer = readFileSync(dbPath);
    }
    
    db = new SQL.Database(buffer);
    
    logger.info(`Database initialized: ${dbPath}`);
    
    createTables();
    initializeDefaultSettings();
    
    return db;
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

function saveDatabase() {
  if (!db) return;
  
  try {
    const dbPath = resolve(config.app.databasePath);
    const data = db.export();
    writeFileSync(dbPath, data);
  } catch (error) {
    logger.error('Failed to save database:', error);
  }
}

function createTables() {
  // Execute as single transaction
  const sql = `
    -- Sources table
    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'rss',
      enabled INTEGER DEFAULT 1,
      language TEXT DEFAULT 'uz',
      category TEXT DEFAULT 'general',
      trust_level TEXT DEFAULT 'trusted',
      collection_interval_minutes INTEGER DEFAULT 60,
      last_collected_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Articles table
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      content TEXT,
      url TEXT NOT NULL UNIQUE,
      url_normalized TEXT NOT NULL,
      published_at TEXT,
      author TEXT,
      category TEXT,
      status TEXT DEFAULT 'NEW',
      relevance_score REAL DEFAULT 0,
      similarity_checked INTEGER DEFAULT 0,
      collected_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
    );

    -- Article fingerprints for duplicate detection
    CREATE TABLE IF NOT EXISTS article_fingerprints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      title_normalized TEXT NOT NULL,
      content_hash TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    );

    -- Published posts
    CREATE TABLE IF NOT EXISTS published_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      telegram_message_id INTEGER,
      channel_id TEXT NOT NULL,
      post_text TEXT NOT NULL,
      published_at TEXT DEFAULT CURRENT_TIMESTAMP,
      views INTEGER DEFAULT 0,
      last_metrics_update TEXT,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    );

    -- Collection runs
    CREATE TABLE IF NOT EXISTS collection_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      sources_checked INTEGER DEFAULT 0,
      articles_collected INTEGER DEFAULT 0,
      articles_new INTEGER DEFAULT 0,
      articles_duplicate INTEGER DEFAULT 0,
      status TEXT DEFAULT 'running',
      error_message TEXT
    );

    -- Application settings
    CREATE TABLE IF NOT EXISTS application_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Admin actions log
    CREATE TABLE IF NOT EXISTS admin_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Error events
    CREATE TABLE IF NOT EXISTS error_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      error_type TEXT NOT NULL,
      error_message TEXT NOT NULL,
      context TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
    CREATE INDEX IF NOT EXISTS idx_articles_url_normalized ON articles(url_normalized);
    CREATE INDEX IF NOT EXISTS idx_articles_collected_at ON articles(collected_at);
    CREATE INDEX IF NOT EXISTS idx_fingerprints_title ON article_fingerprints(title_normalized);
    CREATE INDEX IF NOT EXISTS idx_published_posts_article ON published_posts(article_id);
    CREATE INDEX IF NOT EXISTS idx_published_posts_published_at ON published_posts(published_at);
  `;
  
  db.run(sql);
  saveDatabase();
  logger.info('Database tables created');
}

function initializeDefaultSettings() {
  try {
    prepare(`INSERT OR IGNORE INTO application_settings (key, value) VALUES (?, ?)`).run(
      'publishing_enabled',
      config.publishing.enabled ? '1' : '0'
    );
    
    prepare(`INSERT OR IGNORE INTO application_settings (key, value) VALUES (?, ?)`).run(
      'emergency_pause',
      '0'
    );
    
    prepare(`INSERT OR IGNORE INTO application_settings (key, value) VALUES (?, ?)`).run(
      'last_cleanup',
      new Date().toISOString()
    );
    
    logger.info('Default settings initialized');
  } catch (error) {
    logger.error('Failed to initialize settings:', error);
  }
}

// Settings helpers
export function getSetting(key, defaultValue = null) {
  if (!db) return defaultValue;
  
  const stmt = prepare('SELECT value FROM application_settings WHERE key = ?');
  const row = stmt.get(key);
  return row ? row.value : defaultValue;
}

export function setSetting(key, value) {
  if (!db) return;
  
  const stmt = prepare(`
    INSERT OR REPLACE INTO application_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `);
  stmt.run(key, value);
}

// Admin action logging
export function logAdminAction(adminId, action, details = null) {
  if (!db) return;
  
  const stmt = prepare(`
    INSERT INTO admin_actions (admin_id, action, details) VALUES (?, ?, ?)
  `);
  stmt.run(String(adminId), action, details);
}

// Error logging
export function logError(errorType, errorMessage, context = null) {
  if (!db) return;
  
  try {
    const stmt = prepare(`
      INSERT INTO error_events (error_type, error_message, context) VALUES (?, ?, ?)
    `);
    stmt.run(errorType, errorMessage, context);
  } catch (err) {
    logger.error('Failed to log error to database:', err);
  }
}

export function getDatabase() {
  return {
    prepare,
    exec: (...args) => db.exec(...args),
    run: (...args) => {
      db.run(...args);
      saveDatabase();
    },
  };
}

export function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    logger.info('Database closed');
  }
}

export default {
  initDatabase,
  getDatabase,
  closeDatabase,
  getSetting,
  setSetting,
  logAdminAction,
  logError,
};
