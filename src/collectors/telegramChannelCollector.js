import { calculateRelevanceScore } from '../services/relevanceFilter.js';
import { isSafeToPublish } from '../services/contentSafety.js';
import { isDuplicate, createArticleFingerprint } from '../services/duplicateDetector.js';
import { saveArticle, updateArticleStatus } from '../services/articleNormalizer.js';
import { publishReadyArticles } from '../services/publisher.js';
import { getDatabase } from '../database.js';
import config from '../config.js';
import logger from '../logger.js';

// Kuzatiladigan Telegram kanallar ro'yxati
// username (@ belgisisiz) yoki chat_id
const WATCHED_CHANNELS = [
  'uctepa287',  // https://t.me/uctepa287
];

/**
 * Telegram kanal xabarini article formatiga o'tkazish
 */
function channelPostToArticle(ctx) {
  const post = ctx.channelPost || ctx.message;
  if (!post) return null;

  const chat = post.chat;
  const text = post.text || post.caption || '';
  const entities = post.entities || post.caption_entities || [];

  if (!text || text.length < 20) return null;

  // Birinchi qatorni sarlavha sifatida olish
  const lines = text.split('\n').filter(l => l.trim());
  const title = lines[0]?.substring(0, 200) || 'Kanal xabari';
  const description = lines.slice(1).join(' ').substring(0, 500) || text.substring(0, 500);

  // URL topish (entity yoki matndan)
  let url = null;
  for (const entity of entities) {
    if (entity.type === 'url') {
      url = text.substring(entity.offset, entity.offset + entity.length);
      break;
    }
    if (entity.type === 'text_link' && entity.url) {
      url = entity.url;
      break;
    }
  }

  // URL bo'lmasa kanal xabari havolasini yaratish
  const channelUsername = chat.username || '';
  const messageId = post.message_id;
  if (!url && channelUsername) {
    url = `https://t.me/${channelUsername}/${messageId}`;
  } else if (!url) {
    url = `https://t.me/c/${Math.abs(chat.id)}/${messageId}`;
  }

  return {
    sourceId: null, // Telegram kanal uchun alohida
    title: title.trim(),
    description: description.trim(),
    content: text,
    url,
    publishedAt: new Date(post.date * 1000).toISOString(),
    author: chat.title || channelUsername || 'Telegram kanal',
    category: 'telegram',
    sourceName: chat.title || `@${channelUsername}`,
    trust_level: 'trusted',
  };
}

/**
 * Kanal xabarini qayta ishlash va nashr qilish
 */
export async function processTelegramChannelPost(ctx) {
  try {
    const post = ctx.channelPost || ctx.message;
    if (!post) return;

    const chat = post.chat;
    const chatUsername = (chat.username || '').toLowerCase();
    const chatId = chat.id;

    // Faqat kuzatiladigan kanallardan
    const isWatched = WATCHED_CHANNELS.some(ch => {
      const chLower = ch.toLowerCase();
      return chatUsername === chLower || String(chatId) === chLower;
    });

    if (!isWatched) {
      logger.debug(`Ignored post from unwatched channel: @${chatUsername} (${chatId})`);
      return;
    }

    logger.info(`📨 Telegram kanal xabari keldi: @${chatUsername} | msg_id: ${post.message_id}`);

    const article = channelPostToArticle(ctx);
    if (!article) {
      logger.debug('Post too short or empty, skipping');
      return;
    }

    // 1. Relevance tekshiruvi
    const score = calculateRelevanceScore(article);
    if (score === 0) {
      logger.info(`REJECTED (ta'limga aloqasiz, score 0): ${article.title}`);
      return;
    }

    // 2. Duplicate tekshiruvi
    if (isDuplicate(article)) {
      logger.info(`DUPLICATE skipped: ${article.title}`);
      return;
    }

    // 3. Safety tekshiruvi
    if (!isSafeToPublish(article)) {
      logger.warn(`Safety check failed: ${article.title}`);
      return;
    }

    // 4. Telegram kanal source ID ni olish yoki yaratish
    const db = getDatabase();
    let sourceId = null;
    if (db) {
      const sourceName = article.sourceName;
      const domain = `t.me/${chatUsername || chatId}`;
      // Source mavjudmi tekshirish
      const existing = db.prepare('SELECT id FROM sources WHERE domain = ?').get(domain);
      if (existing) {
        sourceId = existing.id;
      } else {
        // Yangi source qo'shish
        const result = db.prepare(`
          INSERT OR IGNORE INTO sources (name, domain, url, type, enabled, language, category, trust_level, collection_interval_minutes)
          VALUES (?, ?, ?, 'telegram', 1, 'uz', 'telegram', 'trusted', 5)
        `).run(
          sourceName,
          domain,
          `https://t.me/${chatUsername || chatId}`,
        );
        sourceId = result.lastInsertRowid;
        logger.info(`Yangi Telegram kanal source qo'shildi: ${sourceName} (id: ${sourceId})`);
      }
    }

    article.sourceId = sourceId;
    article.relevanceScore = score;

    // 5. Saqlash
    const articleId = saveArticle({ ...article, status: 'VALIDATED' });
    if (!articleId) {
      logger.warn(`Article saqlanmadi (duplicate yoki xato): ${article.title}`);
      return;
    }

    createArticleFingerprint(articleId, article.title, article.description);
    updateArticleStatus(articleId, 'READY_TO_PUBLISH');
    logger.info(`✅ Telegram kanal article tayyor: [#${articleId}] ${article.title}`);

    // 6. Darhol nashr qilish (publishing enabled bo'lsa)
    if (config.publishing.enabled) {
      await publishReadyArticles(1);
    }
  } catch (error) {
    logger.error('Telegram kanal xabarini qayta ishlashda xato:', error.message);
  }
}

/**
 * Kuzatiladigan kanallar ro'yxatini olish
 */
export function getWatchedChannels() {
  return [...WATCHED_CHANNELS];
}

/**
 * Yangi kanal qo'shish (runtime da)
 */
export function addWatchedChannel(channelUsername) {
  const clean = channelUsername.replace('@', '').toLowerCase();
  if (!WATCHED_CHANNELS.includes(clean)) {
    WATCHED_CHANNELS.push(clean);
    logger.info(`Kuzatiladigan kanalga qo'shildi: @${clean}`);
    return true;
  }
  return false;
}

export default {
  processTelegramChannelPost,
  getWatchedChannels,
  addWatchedChannel,
};
