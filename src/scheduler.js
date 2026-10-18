import cron from 'node-cron';
import { getDatabase } from './database.js';
import { getEnabledSources, updateSourceLastCollected } from './collectors/sourceRegistry.js';
import { collectFromRss } from './collectors/rssCollector.js';
import { collectFromWeb } from './collectors/webCollector.js';
import { isDuplicate, createArticleFingerprint } from './services/duplicateDetector.js';
import { isRelevant } from './services/relevanceFilter.js';
import { saveArticle, updateArticleStatus } from './services/articleNormalizer.js';
import { publishReadyArticles } from './services/publisher.js';
import { isSafeToPublish } from './services/contentSafety.js';
import { sendPollToChannel } from './services/pollService.js';
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

export async function collectAndProcessArticles() {
  if (isCollecting) {
    logger.warn('Collection already in progress, skipping...');
    return { skipped: true, reason: 'Already collecting' };
  }

  isCollecting = true;
  collectionStats.totalRuns++;
  const db = getDatabase();
  
  // Import at top of function
  const { calculateRelevanceScore } = await import('./services/relevanceFilter.js');

  logger.info('Starting article collection...');

  // Create collection run record
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

        // Process each article
        for (const article of articles) {
          try {
            // Check for duplicates
            if (isDuplicate(article)) {
              totalDuplicate++;
              logger.debug(`Duplicate article skipped: ${article.title}`);
              continue;
            }

            // Check relevance
            const relevanceScore = calculateRelevanceScore(article);
            if (!isRelevant(article)) {
              logger.info(`Irrelevant article skipped (score: ${relevanceScore}): ${article.title}`);
              continue;
            }
            logger.info(`Relevant article found (score: ${relevanceScore}): ${article.title}`);

            // Safety check
            if (!isSafeToPublish(article)) {
              logger.warn(`Article failed safety check: ${article.title}`);
              continue;
            }

            // Use relevance score from above
            article.relevanceScore = relevanceScore;

            // Save article
            const articleId = saveArticle({
              ...article,
              status: 'VALIDATED',
            });

            if (articleId) {
              totalNew++;
              
              // Create fingerprint for duplicate detection
              createArticleFingerprint(articleId, article.title, article.description);

              // Mark as ready to publish if automated publishing is enabled
              if (config.publishing.enabled) {
                updateArticleStatus(articleId, 'READY_TO_PUBLISH');
                logger.info(`Article #${articleId} ready to publish: ${article.title}`);
              }
            } else {
              logger.warn(`Failed to save article (may be duplicate or invalid): ${article.title}`);
            }
          } catch (articleError) {
            logger.error(`Failed to process article: ${article.title}`, articleError);
          }
        }

        // Update source last collected timestamp
        updateSourceLastCollected(source.id);

        // Small delay between sources to avoid overwhelming servers
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (sourceError) {
        logger.error(`Failed to collect from ${source.name}:`, sourceError);
      }
    }

    logger.info(`Collection complete: ${totalCollected} collected, ${totalNew} new, ${totalDuplicate} duplicates`);

    // Update collection run
    if (db && runId) {
      const stmt = db.prepare(`
        UPDATE collection_runs 
        SET completed_at = CURRENT_TIMESTAMP,
            sources_checked = ?,
            articles_collected = ?,
            articles_new = ?,
            articles_duplicate = ?,
            status = 'completed'
        WHERE id = ?
      `);
      stmt.run(sourcesChecked, totalCollected, totalNew, totalDuplicate, runId);
    }

    // Publish ready articles if enabled
    let publishResult = { published: 0, failed: 0 };
    if (config.publishing.enabled) {
      // Always try to publish, even if no new articles this cycle
      logger.info('Publishing ready articles...');
      publishResult = await publishReadyArticles(config.publishing.maxPostsPerRun);
      if (publishResult.published > 0) {
        logger.info(`Published ${publishResult.published} articles`);
      } else {
        logger.info('No eligible articles to publish this cycle');
      }
      
      // Check if we should send a poll (3 kunda bir marta)
      try {
        const pollResult = await sendPollToChannel();
        if (pollResult.success) {
          logger.info(`Poll sent: ${pollResult.question}`);
        }
      } catch (pollError) {
        logger.error('Poll send error:', pollError.message);
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

    // Update collection run as failed
    if (db && runId) {
      const stmt = db.prepare(`
        UPDATE collection_runs 
        SET completed_at = CURRENT_TIMESTAMP,
            status = 'failed',
            error_message = ?
        WHERE id = ?
      `);
      stmt.run(error.message, runId);
    }
    
    isCollecting = false;
    return { success: false, error: error.message };
  }
}

export function startScheduler() {
  if (collectionTask) {
    logger.warn('Scheduler already running');
    return;
  }

  const interval = config.publishing.collectionIntervalMinutes;
  logger.info(`Starting scheduler with ${interval} minute interval`);

  // Run every N minutes
  const cronExpression = `*/${interval} * * * *`;
  
  collectionTask = cron.schedule(cronExpression, async () => {
    logger.info('Scheduled collection triggered');
    lastCollectionTime = new Date();
    nextScheduledTime = new Date(Date.now() + interval * 60 * 1000);
    await collectAndProcessArticles();
  });

  logger.info('Scheduler started successfully');
  
  // Calculate next run time
  nextScheduledTime = new Date(Date.now() + interval * 60 * 1000);

  // Run initial collection after 10 seconds
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
    logger.info('Scheduler stopped');
  }
}

export default {
  collectAndProcessArticles,
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
};
