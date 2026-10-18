import { Telegraf } from 'telegraf';
import config from './config.js';
import logger from './logger.js';

// Public handlers (har kim)
import {
  handleStart,
  handleHelp,
  handlePublicCallback,
  handlePublicMessage,
} from './handlers/public.js';

// Admin-only handlers
import {
  handleStatus,
  handleStats,
  handlePause,
  handleResume,
  handleCheckNow,
  handlePreview,
  handleSettings,
} from './handlers/statistics.js';
import { handleAdmin }    from './handlers/start.js';
import { handleCallback } from './handlers/callbacks.js';
import { setBot as setPublisherBot }  from './services/publisher.js';
import { setBot as setPollBot } from './services/pollService.js';
import { processTelegramChannelPost, getWatchedChannels } from './collectors/telegramChannelCollector.js';

let bot = null;

export function createBot() {
  try {
    bot = new Telegraf(config.telegram.botToken);
    setPublisherBot(bot);
    setPollBot(bot);

    // ── Commands (public + admin) ──────────────────────────────────────────
    bot.command('start', handleStart);
    bot.command('help',  handleHelp);

    // Admin-only commands (authorization checked inside each handler)
    bot.command('admin',    handleAdmin);
    bot.command('status',   handleStatus);
    bot.command('stats',    handleStats);
    bot.command('pause',    handlePause);
    bot.command('resume',   handleResume);
    bot.command('checknow', handleCheckNow);
    bot.command('preview',  handlePreview);
    bot.command('settings', handleSettings);

    // ── Callback queries ───────────────────────────────────────────────────
    bot.on('callback_query', async (ctx) => {
      const data   = ctx.callbackQuery?.data || '';
      const userId = ctx.from.id.toString();

      // Public tugmalar
      if (
        data.startsWith('public_') ||
        data === 'back_to_menu'
      ) {
        return handlePublicCallback(ctx);
      }

      // Admin tugmalar — authorization handleCallback ichida tekshiriladi
      return handleCallback(ctx);
    });

    // ── Text messages ──────────────────────────────────────────────────────
    bot.on('message', async (ctx) => {
      if (!ctx.message?.text) return;
      const userId = ctx.from.id.toString();
      const text   = ctx.message.text;

      // Buyruqlar bo'lmasa (/ bilan boshlanmasa)
      if (text.startsWith('/')) return;

      // Contact forma kutilayotgan bo'lsa
      await handlePublicMessage(ctx);

      // Admin — noma'lum buyruq
      if (config.telegram.adminIds.includes(userId)) {
        await ctx.reply('Noma\'lum buyruq. /help — barcha buyruqlar ro\'yxati.');
      }
    });

    // ── Global error handler ───────────────────────────────────────────────
    bot.catch((err, ctx) => {
      logger.error('Bot error:', err.message || err);
      if (ctx) {
        ctx.reply('Xatolik yuz berdi. Iltimos, keyinroq urinib ko\'ring.')
          .catch(() => {});
      }
    });

    // ── Telegram kanal xabarlarini kuzatish ───────────────────────────────
    // Bot qo'shilgan har qanday kanaldan keladigan xabarlar
    bot.on('channel_post', async (ctx) => {
      await processTelegramChannelPost(ctx);
    });

    const watched = getWatchedChannels();
    logger.info(`Kuzatiladigan Telegram kanallar: ${watched.map(c => '@' + c).join(', ')}`);
    logger.info('⚠️  Bot @uctepa287 kanalida admin bo\'lishi kerak!');

    logger.info('Bot created successfully');
    return bot;
  } catch (error) {
    logger.error('Failed to create bot:', error);
    throw error;
  }
}

export function getBot() {
  return bot;
}

export async function startBot() {
  if (!bot) throw new Error('Bot not created. Call createBot() first.');

  try {
    // launch() bloklaydi — await qilmaymiz
    bot.launch().catch(err => logger.error('Bot launch error:', err));

    // Telegram ga ulanish uchun biroz kutamiz
    await new Promise(resolve => setTimeout(resolve, 2000));

    logger.info('Bot started successfully');

    process.once('SIGINT',  () => { logger.info('SIGINT — stopping'); bot.stop('SIGINT'); });
    process.once('SIGTERM', () => { logger.info('SIGTERM — stopping'); bot.stop('SIGTERM'); });
  } catch (error) {
    logger.error('Failed to start bot:', error);
    throw error;
  }
}

export function stopBot() {
  if (bot) { bot.stop(); logger.info('Bot stopped'); }
}

export default { createBot, getBot, startBot, stopBot };
