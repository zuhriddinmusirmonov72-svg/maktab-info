import { getStatistics, formatStatisticsMessage } from '../services/analytics.js';
import { getSetting, setSetting } from '../database.js';
import { getArticlesByStatus } from '../services/articleNormalizer.js';
import { formatPost } from '../services/postFormatter.js';
import { collectAndProcessArticles, getSchedulerStatus } from '../scheduler.js';
import { getPublishedCountLastHour } from '../services/publisher.js';
import config from '../config.js';
import logger from '../logger.js';

export async function handleStatus(ctx) {
  const userId = ctx.from.id.toString();

  if (!config.telegram.adminIds.includes(userId)) {
    await ctx.reply('Kechirasiz, sizda ushbu botdan foydalanish huquqi yo\'q.');
    return;
  }

  const emergencyPause = getSetting('emergency_pause', '0') === '1';
  const schedulerStatus = getSchedulerStatus();
  
  let message = '🔧 <b>TIZIM HOLATI</b>\n\n';
  message += `Tizim: ${emergencyPause ? '⏸ Pauza rejimida' : '✅ Faol'}\n`;
  message += `Nashr: ${config.publishing.enabled && !emergencyPause ? '✅ Yoqilgan' : '❌ O\'chirilgan'}\n`;
  message += `Database: ✅ Ishlayapti\n`;
  message += `Scheduler: ${schedulerStatus.isRunning ? '✅ Ishlayapti' : '❌ To\'xtatilgan'}\n`;
  message += `Yig\'ish: ${schedulerStatus.isCollecting ? '🔄 Jarayonda' : '⏸ Kutilmoqda'}\n\n`;
  
  message += `⏱ Intervali: ${schedulerStatus.interval} daqiqa\n`;
  
  if (schedulerStatus.nextScheduledTime) {
    const next = new Date(schedulerStatus.nextScheduledTime);
    message += `⏭ Keyingi tekshiruv: ${next.toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent' })}\n`;
  }
  
  if (schedulerStatus.lastCollectionTime) {
    const last = new Date(schedulerStatus.lastCollectionTime);
    message += `⏮ Oxirgi tekshiruv: ${last.toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent' })}\n`;
  }
  
  await ctx.reply(message, { parse_mode: 'HTML' });
}

export async function handleCheckNow(ctx) {
  const userId = ctx.from.id.toString();

  if (!config.telegram.adminIds.includes(userId)) {
    await ctx.reply('Kechirasiz, sizda ushbu botdan foydalanish huquqi yo\'q.');
    return;
  }

  await ctx.reply('🔄 Yangiliklarni tekshirish boshlandi...');
  
  logger.info(`Manual collection triggered by admin ${userId}`);
  
  try {
    const result = await collectAndProcessArticles();
    
    if (result.skipped) {
      await ctx.reply(`⚠️ Tekshiruv o'tkazib yuborildi: ${result.reason}`);
      return;
    }
    
    if (!result.success) {
      await ctx.reply(`❌ Xatolik yuz berdi: ${result.error}`);
      return;
    }
    
    let message = '✅ <b>Tekshiruv yakunlandi!</b>\n\n';
    message += `📊 Manbaalar: ${result.sourcesChecked}\n`;
    message += `📰 Topilgan: ${result.totalCollected}\n`;
    message += `✨ Yangi: ${result.totalNew}\n`;
    message += `🔁 Dublikatlar: ${result.totalDuplicate}\n`;
    
    if (result.published > 0) {
      message += `\n📤 Nashr etildi: ${result.published}`;
    }
    
    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error) {
    logger.error('Manual collection failed:', error);
    await ctx.reply(`❌ Xatolik: ${error.message}`);
  }
}

export async function handlePreview(ctx) {
  const userId = ctx.from.id.toString();

  if (!config.telegram.adminIds.includes(userId)) {
    await ctx.reply('Kechirasiz, sizda ushbu botdan foydalanish huquqi yo\'q.');
    return;
  }

  const articles = getArticlesByStatus('READY_TO_PUBLISH', 1);
  
  if (articles.length === 0) {
    await ctx.reply('📭 Nashr uchun tayyor maqolalar yo\'q.');
    return;
  }
  
  const article = articles[0];
  
  try {
    const preview = formatPost(article, article.source_name);
    await ctx.reply('👀 <b>OLDINDAN KO\'RIB CHIQISH:</b>\n━━━━━━━━━━━━━━\n\n', { parse_mode: 'HTML' });
    await ctx.reply(preview, { parse_mode: 'HTML', disable_web_page_preview: true });
  } catch (error) {
    logger.error('Preview failed:', error);
    await ctx.reply(`❌ Xatolik: ${error.message}`);
  }
}

export async function handleSettings(ctx) {
  const userId = ctx.from.id.toString();

  if (!config.telegram.adminIds.includes(userId)) {
    await ctx.reply('Kechirasiz, sizda ushbu botdan foydalanish huquqi yo\'q.');
    return;
  }

  const emergencyPause = getSetting('emergency_pause', '0') === '1';
  const publishedLastHour = getPublishedCountLastHour();
  
  let message = '⚙️ <b>SOZLAMALAR</b>\n\n';
  message += '<b>Nashr sozlamalari:</b>\n';
  message += `• Holat: ${config.publishing.enabled && !emergencyPause ? '✅ Yoqilgan' : '❌ O\'chirilgan'}\n`;
  message += `• Interval: ${config.publishing.collectionIntervalMinutes} daqiqa\n`;
  message += `• Soatiga: ${publishedLastHour}/${config.publishing.maxPostsPerHour} post\n`;
  message += `• Kuniga: ${config.publishing.maxPostsPerDay} post\n`;
  message += `• Min interval: ${config.publishing.minPostIntervalMinutes} daqiqa\n`;
  message += `• Maqola yoshi: ${config.publishing.maxArticleAgeHours} soat\n\n`;
  
  message += '<b>Kontentfiltr:</b>\n';
  message += `• O\'xshashlik: ${config.publishing.similarityThreshold}\n\n`;
  
  if (config.school.name) {
    message += '<b>Maktab:</b>\n';
    message += `• Nomi: ${config.school.name}\n`;
    if (config.school.city) message += `• Shahar: ${config.school.city}\n`;
  }
  
  await ctx.reply(message, { parse_mode: 'HTML' });
}

export async function handleStats(ctx) {
  const userId = ctx.from.id.toString();

  if (!config.telegram.adminIds.includes(userId)) {
    await ctx.reply('Kechirasiz, sizda ushbu botdan foydalanish huquqi yo\'q.');
    return;
  }

  const stats = getStatistics();
  const message = formatStatisticsMessage(stats);
  
  await ctx.reply(message, { parse_mode: 'HTML' });
}

export async function handlePause(ctx) {
  const userId = ctx.from.id.toString();

  if (!config.telegram.adminIds.includes(userId)) {
    await ctx.reply('Kechirasiz, sizda ushbu botdan foydalanish huquqi yo\'q.');
    return;
  }

  setSetting('emergency_pause', '1');
  logger.info(`Publishing paused by admin ${userId}`);
  
  await ctx.reply(
    '⏸ <b>NASHR TO\'XTATILDI</b>\n\n' +
    'Avtomatik nashr vaqtincha to\'xtatildi.\n' +
    'Davom ettirish uchun /resume buyrug\'ini yuboring.',
    { parse_mode: 'HTML' }
  );
}

export async function handleResume(ctx) {
  const userId = ctx.from.id.toString();

  if (!config.telegram.adminIds.includes(userId)) {
    await ctx.reply('Kechirasiz, sizda ushbu botdan foydalanish huquqi yo\'q.');
    return;
  }

  setSetting('emergency_pause', '0');
  logger.info(`Publishing resumed by admin ${userId}`);
  
  await ctx.reply(
    '▶️ <b>NASHR DAVOM ETTIRILDI</b>\n\n' +
    'Avtomatik nashr yana yoqildi.',
    { parse_mode: 'HTML' }
  );
}

export default {
  handleStatus,
  handleStats,
  handlePause,
  handleResume,
  handleCheckNow,
  handlePreview,
  handleSettings,
};
