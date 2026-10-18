import { getDatabase, getSetting, setSetting } from '../database.js';
import { formatPost } from './postFormatter.js';
import { isSafeToPublish } from './contentSafety.js';
import { calculateRelevanceScore } from './relevanceFilter.js';
import { getArticlesByStatus, updateArticleStatus } from './articleNormalizer.js';
import config from '../config.js';
import logger from '../logger.js';

let bot = null;

export function setBot(botInstance) {
  bot = botInstance;
}

export async function testChannelAccess() {
  if (!bot) {
    return { success: false, error: 'Bot not initialized' };
  }

  try {
    const chat = await bot.telegram.getChat(config.telegram.channelId);
    
    logger.info(`Channel access verified: ${chat.title || chat.username || config.telegram.channelId}`);
    
    return {
      success: true,
      channelName: chat.title || chat.username,
      channelId: config.telegram.channelId,
    };
  } catch (error) {
    logger.error('Failed to access channel:', error.message);
    
    return {
      success: false,
      error: error.message,
    };
  }
}

export function getPublishedCountToday() {
  const db = getDatabase();
  if (!db) return 0;

  const stmt = db.prepare(`
    SELECT COUNT(*) as count 
    FROM published_posts 
    WHERE DATE(published_at) = DATE('now')
  `);

  const result = stmt.get();
  return result.count;
}

export function getPublishedCountLastHour() {
  const db = getDatabase();
  if (!db) return 0;

  const stmt = db.prepare(`
    SELECT COUNT(*) as count 
    FROM published_posts 
    WHERE published_at >= datetime('now', '-1 hour')
  `);

  const result = stmt.get();
  return result.count;
}

export function getLastPublishedTime() {
  const db = getDatabase();
  if (!db) return null;

  const stmt = db.prepare(`
    SELECT published_at 
    FROM published_posts 
    ORDER BY published_at DESC 
    LIMIT 1
  `);

  const result = stmt.get();
  return result ? new Date(result.published_at) : null;
}

export function canPublishNow() {
  const emergencyPause = getSetting('emergency_pause', '0') === '1';
  if (emergencyPause) {
    logger.warn('Publishing paused by emergency stop');
    return { allowed: false, reason: 'Emergency pause active' };
  }

  if (!config.publishing.enabled) {
    return { allowed: false, reason: 'Publishing disabled in configuration' };
  }

  const publishedToday = getPublishedCountToday();
  if (publishedToday >= config.publishing.maxPostsPerDay) {
    return { allowed: false, reason: `Daily limit reached (${config.publishing.maxPostsPerDay})` };
  }

  // Check hourly limit
  const publishedLastHour = getPublishedCountLastHour();
  if (publishedLastHour >= config.publishing.maxPostsPerHour) {
    return { allowed: false, reason: `Hourly limit reached (${config.publishing.maxPostsPerHour})` };
  }

  const lastPublished = getLastPublishedTime();
  if (lastPublished) {
    const minutesSinceLastPost = (Date.now() - lastPublished.getTime()) / (1000 * 60);
    if (minutesSinceLastPost < config.publishing.minPostIntervalMinutes) {
      return {
        allowed: false,
        reason: `Minimum interval not met (${Math.ceil(config.publishing.minPostIntervalMinutes - minutesSinceLastPost)} min remaining)`,
      };
    }
  }

  return { allowed: true };
}

export async function publishArticle(article, sourceName) {
  if (!bot) {
    throw new Error('Bot not initialized');
  }

  if (config.app.isDryRun) {
    logger.info('[DRY RUN] Would publish article:', article.title);
    return { success: true, dryRun: true };
  }

  // Qayta publish tekshiruvi — bu article oldin publish qilinganmi?
  const db = getDatabase();
  if (db) {
    const alreadyPublished = db.prepare(
      'SELECT COUNT(*) as count FROM published_posts WHERE article_id = ?'
    ).get(article.id);
    if (alreadyPublished && alreadyPublished.count > 0) {
      logger.warn(`Article already published, skipping: ${article.title}`);
      updateArticleStatus(article.id, 'PUBLISHED');
      return { success: false, error: 'Already published' };
    }
  }

  // Safety check
  if (!isSafeToPublish(article)) {
    logger.warn(`Article rejected by safety check: ${article.title}`);
    return { success: false, error: 'Failed safety check' };
  }

  // Check publishing eligibility
  const canPublish = canPublishNow();
  if (!canPublish.allowed) {
    logger.warn(`Cannot publish: ${canPublish.reason}`);
    return { success: false, error: canPublish.reason };
  }

  try {
    const postText = formatPost(article, sourceName);
    
    const message = await bot.telegram.sendMessage(
      config.telegram.channelId,
      postText,
      { parse_mode: 'HTML' }
    );

    // Save to database
    const db = getDatabase();
    if (db) {
      const stmt = db.prepare(`
        INSERT INTO published_posts (article_id, telegram_message_id, channel_id, post_text)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(article.id, message.message_id, config.telegram.channelId, postText);
      
      // Update article status
      updateArticleStatus(article.id, 'PUBLISHED');
    }

    logger.info(`Successfully published article: ${article.title}`);

    return {
      success: true,
      messageId: message.message_id,
      articleId: article.id,
    };
  } catch (error) {
    logger.error(`Failed to publish article ${article.title}:`, error.message);

    // Log error to database
    const db = getDatabase();
    if (db) {
      const stmt = db.prepare(`
        INSERT INTO error_events (error_type, error_message, context)
        VALUES (?, ?, ?)
      `);

      stmt.run('PUBLISH_FAILED', error.message, JSON.stringify({ articleId: article.id }));
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

export async function publishReadyArticles(maxCount = null) {
  const limit = maxCount || config.publishing.maxPostsPerRun;
  const articles = getArticlesByStatus('READY_TO_PUBLISH', limit);

  if (articles.length === 0) {
    logger.info('No articles ready to publish');
    return { published: 0, failed: 0 };
  }

  logger.info(`Found ${articles.length} articles ready to publish`);

  let published = 0;
  let failed = 0;

  for (const article of articles) {
    const canPublish = canPublishNow();
    if (!canPublish.allowed) {
      logger.info(`Stopping publication: ${canPublish.reason}`);
      break;
    }

    // Publish qilishdan OLDIN ham relevance tekshiruvi — eski articlelar uchun
    const relevanceScore = calculateRelevanceScore(article);
    if (relevanceScore === 0) {
      logger.info(`BLOCKED at publish stage (irrelevant): ${article.title}`);
      updateArticleStatus(article.id, 'REJECTED');
      failed++;
      continue;
    }

    const result = await publishArticle(article, article.source_name);
    
    if (result.success) {
      published++;
      
      // Wait between posts to avoid rate limiting
      if (published < articles.length) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } else {
      failed++;
      updateArticleStatus(article.id, 'NEEDS_REVIEW');
    }
  }

  logger.info(`Publication complete: ${published} published, ${failed} failed`);

  return { published, failed };
}

export default {
  setBot,
  testChannelAccess,
  canPublishNow,
  publishArticle,
  publishReadyArticles,
  getPublishedCountToday,
  getPublishedCountLastHour,
};
