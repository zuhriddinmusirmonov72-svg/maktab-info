import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test environment if it exists
const testEnvPath = resolve(__dirname, '../.env.test');
const prodEnvPath = resolve(__dirname, '../.env');

if (process.env.NODE_ENV === 'test' && existsSync(testEnvPath)) {
  dotenv.config({ path: testEnvPath });
} else if (existsSync(prodEnvPath)) {
  dotenv.config({ path: prodEnvPath });
} else {
  dotenv.config();
}

// Validation helper
function getEnvOrThrow(key, required = true) {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

function getEnvAsArray(key, defaultValue = []) {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

function getEnvAsNumber(key, defaultValue) {
  const value = process.env[key];
  if (!value) return defaultValue;
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

function getEnvAsFloat(key, defaultValue) {
  const value = process.env[key];
  if (!value) return defaultValue;
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
}

function getEnvAsBoolean(key, defaultValue) {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

// Configuration object
const config = {
  // Telegram
  telegram: {
    botToken: getEnvOrThrow('TELEGRAM_BOT_TOKEN'),
    channelId: getEnvOrThrow('TELEGRAM_CHANNEL_ID', false),
    adminIds: getEnvAsArray('ADMIN_IDS', []),
    contactNotifyId: process.env.CONTACT_NOTIFY_ID || '',
  },

  // School
  school: {
    name: process.env.SCHOOL_NAME || '',
    city: process.env.SCHOOL_CITY || '',
    region: process.env.SCHOOL_REGION || '',
  },

  // Application
  app: {
    language: process.env.DEFAULT_LANGUAGE || 'uz',
    timezone: process.env.TIMEZONE || 'Asia/Tashkent',
    databasePath: process.env.DATABASE_PATH || './data/maktab-info.db',
    logLevel: process.env.LOG_LEVEL || 'info',
    isDryRun: getEnvAsBoolean('DRY_RUN', false),
  },

  // Publishing
  publishing: {
    enabled: getEnvAsBoolean('PUBLISHING_ENABLED', false),
    collectionIntervalMinutes: getEnvAsNumber('COLLECTION_INTERVAL_MINUTES', 5),
    maxPostsPerRun: getEnvAsNumber('MAX_POSTS_PER_RUN', 1),
    maxPostsPerHour: getEnvAsNumber('MAX_POSTS_PER_HOUR', 2),
    maxPostsPerDay: getEnvAsNumber('MAX_POSTS_PER_DAY', 10),
    minPostIntervalMinutes: getEnvAsNumber('MIN_POST_INTERVAL_MINUTES', 30),
    maxArticleAgeHours: getEnvAsNumber('MAX_ARTICLE_AGE_HOURS', 72),
    similarityThreshold: getEnvAsFloat('SIMILARITY_THRESHOLD', 0.88),
  },

  // AI
  ai: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    model: process.env.OPENROUTER_MODEL || 'openrouter/auto',
    enabled: getEnvAsBoolean('AI_SUMMARIZATION_ENABLED', false),
  },
};

// Validate critical configuration
export function validateConfig() {
  const errors = [];

  if (!config.telegram.botToken) {
    errors.push('TELEGRAM_BOT_TOKEN is required');
  }

  if (config.telegram.adminIds.length === 0) {
    errors.push('ADMIN_IDS is required (comma-separated list of Telegram user IDs)');
  }

  if (config.ai.enabled && !config.ai.apiKey) {
    errors.push('AI_SUMMARIZATION_ENABLED is true but OPENROUTER_API_KEY is missing');
  }

  return errors;
}

export default config;
