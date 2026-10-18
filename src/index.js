import config, { validateConfig } from './config.js';
import logger from './logger.js';
import { initDatabase, closeDatabase } from './database.js';
import { initializeSources } from './collectors/sourceRegistry.js';
import { createBot, startBot, stopBot } from './bot.js';
import { startScheduler, stopScheduler } from './scheduler.js';
import { testChannelAccess } from './services/publisher.js';
import { createServer } from 'http';

async function main() {
  try {
    logger.info('=== MAKTAB INFO Bot Starting ===');
    logger.info(`Mode: ${config.app.isDryRun ? 'DRY RUN' : 'PRODUCTION'}`);

    // Validate configuration
    const errors = validateConfig();
    if (errors.length > 0) {
      logger.error('Configuration validation failed:');
      errors.forEach(e => logger.error(`  - ${e}`));
      process.exit(1);
    }
    logger.info('✅ Configuration validated');

    // Initialize database (async for sql.js)
    await initDatabase();
    logger.info('✅ Database initialized');

    // Initialize default sources
    initializeSources();
    logger.info('✅ Sources initialized');

    // Create and start bot
    createBot();
    await startBot();
    logger.info('✅ Bot started');

    // Test channel access
    if (config.telegram.channelId && !config.app.isDryRun) {
      logger.info('Testing channel access...');
      const channelTest = await testChannelAccess();

      if (channelTest.success) {
        logger.info(`✅ Channel access verified: ${channelTest.channelName || channelTest.channelId}`);
      } else {
        logger.warn(`⚠️  Channel access failed: ${channelTest.error}`);
        logger.warn('Publishing will fail until TELEGRAM_CHANNEL_ID is configured correctly.');
        logger.warn('1. Add bot to channel as administrator');
        logger.warn('2. Set TELEGRAM_CHANNEL_ID in .env (e.g. @channelname or -1001234567890)');
      }
    } else if (!config.telegram.channelId) {
      logger.warn('⚠️  TELEGRAM_CHANNEL_ID not set — publishing is disabled until configured.');
    }

    // Start scheduler — always run so admin can use /checknow and /status
    startScheduler();
    logger.info(`✅ Scheduler started — checking every ${config.publishing.collectionIntervalMinutes} min`);

    if (!config.publishing.enabled) {
      logger.warn('⚠️  Auto-publishing DISABLED. Set PUBLISHING_ENABLED=true in .env to enable.');
      logger.info('Use /checknow to manually collect, /preview to see next post.');
    }

    logger.info('=== MAKTAB INFO Bot Running ===');
    logger.info('Press Ctrl+C to stop');

    // Render/hosting uchun minimal HTTP server — uxlamaslik uchun
    const PORT = process.env.PORT || 3000;
    createServer((req, res) => {
      res.writeHead(200);
      res.end('MAKTAB INFO bot ishlayapti ✅');
    }).listen(PORT, () => {
      logger.info(`Health check server: port ${PORT}`);
    });

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
    });
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection:', reason);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      logger.info(`\n${signal} received, shutting down...`);
      stopScheduler();
      stopBot();
      closeDatabase();
      logger.info('Shutdown complete');
      process.exit(0);
    };
    process.on('SIGINT',  () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    logger.error('Fatal error during startup:', error);
    process.exit(1);
  }
}

main();
