import cron from 'node-cron';
import { getDatabase, getSetting, setSetting } from './database.js';
import { getEnabledSources, updateSourceLastCollected } from './collectors/sourceRegistry.js';
import { collectFromRss } from './collectors/rssCollector.js';
import { collectFromWeb } from './collectors/webCollector.js';
import { isDuplicate, createArticleFingerprint } from './services/duplicateDetector.js';
import { isRelevant, calculateRelevanceScore } from './services/relevanceFilter.js';
import { saveArticle, updateArticleStatus } from './services/articleNormalizer.js';
import { publishReadyArticles } from './services/publisher.js';
import { isSafeToPublish } from './services/contentSafety.js';
import { sendPollToChannel, shouldSendPoll } from './services/pollService.js';
import config from './config.js';
import logger from './logger.js';

let collectionTask = null;
let pollTask = null;
let isCollecting = false;
let nextScheduledTime = null;
let lastCollectionTime = null;
let collectionStats = {
  totalRuns: 0,
  successfulRuns: 0,
  failedRuns: 0,
};

// ================================================================
// Bugun nashr qilinganmi tekshirish
// ================================================================
function getPublishedCountToday() {
  const db = getDatabase();
  if (!db) return 0;
  const result = db.prepare(
    `SELECT COUNT(*) as c FROM published_posts WHERE DATE(published_at) = DATE('now')`
  ).get();
  return result ? result.c : 0;
}

// ================================================================
// Maktab yangiligi bormi tekshirish (READY_TO_PUBLISH da)
// ================================================================
function hasSchoolArticleReady() {
  const db = getDatabase();
  if (!db) return false;
  
  const SCHOOL_KEYWORDS = [
    'maktab', "o'quvchi", "o'qituvchi", 'sinf', 'imtihon',
    'ta\'lim', 'ta\'til', 'olimpiada', 'grant', 'stipendiya',
    'dtm', 'qabul', 'kollej', 'universitet', 'talaba',
    'мактаб', 'ўқувчи', 'ўқитувчи', 'имтиҳон', 'таълим',
    'школа', 'ученик', 'учитель', 'образование', 'экзамен',
  ];
  
  const articles = db.prepare(
    `SELECT title, description FROM articles WHERE status = 'READY_TO_PUBLISH' LIMIT 50`
  ).all();
  
  for (const a of articles) {
    const text = `${a.title} ${a.description}`.toLowerCase();
    for (const kw of SCHOOL_KEYWORDS) {
      if (text.includes(kw.toLowerCase())) return true;
    }
  }
  return false;
}

// ================================================================
// Yoshlar sport yangiligi bormi tekshirish
// ================================================================
function hasYouthSportArticleReady() {
  const db = getDatabase();
  if (!db) return false;
  
  const YOUTH_SPORT_KEYWORDS = [
    'yosh sportchi', 'yosh chempion', "o'quvchi medal",
    'yoshlar sport', 'maktab jamoasi', 'yoshlar musobaqasi',
    'yoshlar olimpiadasi', 'yoshlar chempionati',
    "o'quvchilar musobaqasi", 'maktablararo',
    'ёш спортчи', 'ёш чемпион', 'ёшлар спорт',
    'молодёжный спорт', 'школьные соревнования',
  ];
  
  const articles = db.prepare(
    `SELECT title, description FROM articles WHERE status = 'READY_TO_PUBLISH' LIMIT 50`
  ).all();
  
  for (const a of articles) {
    const text = `${a.title} ${a.description}`.toLowerCase();
    for (const kw of YOUTH_SPORT_KEYWORDS) {
      if (text.includes(kw.toLowerCase())) return true;
    }
  }
  return false;
}

// ================================================================
// Asosiy collection va publish funksiyasi
// ================================================================
export async function collectAndProcessArticles() {
  if (isCollecting) {
    logger.warn('Collection already in progress, skipping...');
    return { skipped: true, reason: 'Already collecting' };
  }

  isCollecting = true;
  collectionStats.totalRuns++;
  const db = getDatabase();

  logger.info('Starting article collection...');

  let runId = null;
  if (db) {
    const stmt = db.prepare('INSERT INTO collection_runs (started_at, status) VALUES (CURRENT_TIMESTAMP, "running")');
    const result = stmt.run();
    runId = result.lastInsertRowid;
  }

  let totalCollected = 0;
  let totalNew = 0;
  let totalDuplicate = 0;
  let sourcesChecked = 0;

  try {
    const sources = getEnabledSources();

    if (sources.length === 0) {
      logger.warn('No enabled sources found');
      isCollecting = false;
      return { success: false, error: 'No enabled sources' };
    }

    logger.info(`Checking ${sources.length} enabled sources...`);

    for (const source of sources) {
      try {
        logger.info(`Collecting from: ${source.name}`);

        let articles = [];
        if (source.type === 'rss') {
          articles = await collectFromRss(source);
        } else if (source.type === 'web') {
          articles = await collectFromWeb(source);
        }

        totalCollected += articles.length;
        sourcesChecked++;

        for (const article of articles) {
          try {
            if (isDuplicate(article)) {
              totalDuplicate++;
              continue;
            }

            const relevanceScore = calculateRelevanceScore(article);
            if (!isRelevant(article)) {
              logger.info(`Irrelevant article skipped (score: ${relevanceScore}): ${article.title}`);
              continue;
            }
            logger.info(`Relevant article found (score: ${relevanceScore}): ${article.title}`);

            if (!isSafeToPublish(article)) {
              logger.warn(`Article failed safety check: ${article.title}`);
              continue;
            }

            article.relevanceScore = relevanceScore;

            const articleId = saveArticle({ ...article, status: 'VALIDATED' });

            if (articleId) {
              totalNew++;
              createArticleFingerprint(articleId, article.title, article.description);

              if (config.publishing.enabled) {
                updateArticleStatus(articleId, 'READY_TO_PUBLISH');
                logger.info(`Article #${articleId} ready to publish: ${article.title}`);
              }
            }
          } catch (articleError) {
            logger.error(`Failed to process article: ${article.title}`, articleError);
          }
        }

        updateSourceLastCollected(source.id);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (sourceError) {
        logger.error(`Failed to collect from ${source.name}:`, sourceError);
      }
    }

    logger.info(`Collection complete: ${totalCollected} collected, ${totalNew} new, ${totalDuplicate} duplicates`);

    if (db && runId) {
      db.prepare(`
        UPDATE collection_runs 
        SET completed_at = CURRENT_TIMESTAMP,
            sources_checked = ?, articles_collected = ?,
            articles_new = ?, articles_duplicate = ?, status = 'completed'
        WHERE id = ?
      `).run(sourcesChecked, totalCollected, totalNew, totalDuplicate, runId);
    }

    // ============================================================
    // YANGI NASHR MANTIQ:
    // 1. Maktab yangiligi bo'lsa — shu kun bitta tashla
    // 2. Bo'lmasa yoshlar sport bo'lsa — shu kun bitta tashla  
    // 3. Ikkalasi ham yo'q bo'lsa — bugun tashlama, ertaga tashlaydi
    // ============================================================
    let publishResult = { published: 0, failed: 0 };

    if (config.publishing.enabled) {
      const publishedToday = getPublishedCountToday();
      
      if (publishedToday >= config.publishing.maxPostsPerDay) {
        logger.info(`Kunlik limit yetdi (${publishedToday}/${config.publishing.maxPostsPerDay})`);
      } else {
        const schoolReady = hasSchoolArticleReady();
        const youthSportReady = hasYouthSportArticleReady();

        if (schoolReady) {
          logger.info('✅ Maktab yangiligi topildi — nashr qilinmoqda...');
          publishResult = await publishReadyArticles(1);
        } else if (youthSportReady) {
          logger.info('⚽ Maktab yangiligi yo\'q — yoshlar sport yangiligi nashr qilinmoqda...');
          publishResult = await publishReadyArticles(1);
        } else {
          logger.info('💤 Bugun mos yangilik yo\'q — ertaga tekshiriladi');
        }

        if (publishResult.published > 0) {
          logger.info(`✅ Nashr qilindi: ${publishResult.published} ta`);
        }
      }
    }

    collectionStats.successfulRuns++;
    isCollecting = false;

    return {
      success: true,
      totalCollected,
      totalNew,
      totalDuplicate,
      sourcesChecked,
      published: publishResult.published,
    };
  } catch (error) {
    logger.error('Collection error:', error);
    collectionStats.failedRuns++;

    if (db && runId) {
      db.prepare(`
        UPDATE collection_runs 
        SET completed_at = CURRENT_TIMESTAMP, status = 'failed', error_message = ?
        WHERE id = ?
      `).run(error.message, runId);
    }

    isCollecting = false;
    return { success: false, error: error.message };
  }
}

// ================================================================
// POLL — alohida cron, har 6 soatda tekshiradi (3 kunda bir yuboradi)
// ================================================================
function startPollScheduler() {
  // Har 6 soatda bir tekshir — 72 soat (3 kun) o'tgan bo'lsa yuboradi
  pollTask = cron.schedule('0 */6 * * *', async () => {
    try {
      if (shouldSendPoll()) {
        logger.info('⏰ Poll vaqti keldi — yuborilmoqda...');
        const result = await sendPollToChannel();
        if (result.success) {
          logger.info(`✅ Poll yuborildi: ${result.question}`);
        }
      }
    } catch (e) {
      logger.error('Poll cron xatosi:', e.message);
    }
  });
  logger.info('Poll scheduler started (har 6 soatda tekshiradi, 3 kunda bir yuboradi)');
}

// ================================================================
// Scheduler ishga tushirish
// ================================================================
export function startScheduler() {
  if (collectionTask) {
    logger.warn('Scheduler already running');
    return;
  }

  const interval = config.publishing.collectionIntervalMinutes;
  logger.info(`Starting scheduler with ${interval} minute interval`);

  const cronExpression = `*/${interval} * * * *`;

  collectionTask = cron.schedule(cronExpression, async () => {
    logger.info('Scheduled collection triggered');
    lastCollectionTime = new Date();
    nextScheduledTime = new Date(Date.now() + interval * 60 * 1000);
    await collectAndProcessArticles();
  });

  // Poll alohida scheduler
  startPollScheduler();

  logger.info('Scheduler started successfully');
  nextScheduledTime = new Date(Date.now() + interval * 60 * 1000);

  // Birinchi collection 10 soniyadan keyin
  setTimeout(async () => {
    logger.info('Running initial collection...');
    lastCollectionTime = new Date();
    await collectAndProcessArticles();
  }, 10000);
}

export function getSchedulerStatus() {
  return {
    isRunning: collectionTask !== null,
    isCollecting,
    interval: config.publishing.collectionIntervalMinutes,
    nextScheduledTime,
    lastCollectionTime,
    stats: collectionStats,
  };
}

export function stopScheduler() {
  if (collectionTask) {
    collectionTask.stop();
    collectionTask = null;
  }
  if (pollTask) {
    pollTask.stop();
    pollTask = null;
  }
  logger.info('Scheduler stopped');
}

export default {
  collectAndProcessArticles,
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
};
