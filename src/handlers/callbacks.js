import { getMainMenu, getSourcesMenu, getSettingsMenu, getBackButton } from '../keyboards/adminMenu.js';
import { getAllSources, updateSourceEnabled } from '../collectors/sourceRegistry.js';
import { getStatistics, formatStatisticsMessage } from '../services/analytics.js';
import { getRecentArticles } from '../services/articleNormalizer.js';
import { testChannelAccess, getPublishedCountToday, getPublishedCountLastHour } from '../services/publisher.js';
import { getSetting, setSetting, logAdminAction } from '../database.js';
import { getSchedulerStatus } from '../scheduler.js';
import config from '../config.js';
import logger from '../logger.js';

function isAdmin(userId) {
  return config.telegram.adminIds.includes(userId.toString());
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function handleCallback(ctx) {
  if (!ctx.callbackQuery || !ctx.callbackQuery.data) return;

  const userId = ctx.from.id.toString();

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery('Ruxsat yo\'q');
    return;
  }

  const data = ctx.callbackQuery.data;

  try {
    if (data === 'main_menu') {
      await ctx.editMessageText('Administrator paneli:', getMainMenu());
      await ctx.answerCbQuery();
    }

    else if (data === 'stats') {
      const stats = getStatistics();
      const message = formatStatisticsMessage(stats);
      await ctx.editMessageText(message, { parse_mode: 'HTML', ...getBackButton() });
      await ctx.answerCbQuery();
    }

    else if (data === 'sources') {
      const sources = getAllSources();
      await ctx.editMessageText(
        `🌐 <b>Manbalar</b> (${sources.length})\n\nManbalarni yoqish yoki o'chirish uchun bosing:`,
        { parse_mode: 'HTML', ...getSourcesMenu(sources) }
      );
      await ctx.answerCbQuery();
    }

    else if (data.startsWith('source_toggle_')) {
      const sourceId = parseInt(data.replace('source_toggle_', ''));
      const sources = getAllSources();
      const source = sources.find(s => s.id === sourceId);

      if (source) {
        const newStatus = !source.enabled;
        updateSourceEnabled(sourceId, newStatus);
        logAdminAction(userId, 'SOURCE_TOGGLE', `${source.name}: ${newStatus ? 'enabled' : 'disabled'}`);

        const updatedSources = getAllSources();
        await ctx.editMessageText(
          `🌐 <b>Manbalar</b> (${updatedSources.length})\n\nManbalarni yoqish yoki o'chirish uchun bosing:`,
          { parse_mode: 'HTML', ...getSourcesMenu(updatedSources) }
        );
        await ctx.answerCbQuery(`${source.name} ${newStatus ? 'yoqildi ✅' : 'o\'chirildi ❌'}`);
      }
    }

    else if (data === 'settings') {
      const emergencyPause = getSetting('emergency_pause', '0') === '1';
      const publishedToday = getPublishedCountToday();
      const publishedLastHour = getPublishedCountLastHour();

      let message = '⚙️ <b>SOZLAMALAR</b>\n\n';
      message += `Nashr: ${config.publishing.enabled && !emergencyPause ? '✅ Yoqilgan' : '❌ O\'chirilgan'}\n`;
      message += `Pauza: ${emergencyPause ? '⏸ Ha' : '▶️ Yo\'q'}\n`;
      message += `Intervali: ${config.publishing.collectionIntervalMinutes} daqiqa\n`;
      message += `Soatlik: ${publishedLastHour}/${config.publishing.maxPostsPerHour}\n`;
      message += `Kunlik: ${publishedToday}/${config.publishing.maxPostsPerDay}\n`;

      if (config.school.name) {
        message += `\n🏫 Maktab: ${escapeHtml(config.school.name)}\n`;
        if (config.school.city) message += `📍 Shahar: ${escapeHtml(config.school.city)}\n`;
      }

      await ctx.editMessageText(message, { parse_mode: 'HTML', ...getSettingsMenu() });
      await ctx.answerCbQuery();
    }

    else if (data === 'recent') {
      const articles = getRecentArticles(10);

      let message = '📚 <b>SO\'NGGI MAQOLALAR</b>\n\n';

      if (articles.length === 0) {
        message += 'Hech qanday maqola topilmadi.';
      } else {
        articles.forEach((article, index) => {
          const statusEmoji = article.status === 'PUBLISHED' ? '✅' :
                             article.status === 'READY_TO_PUBLISH' ? '📤' :
                             article.status === 'VALIDATED' ? '🔍' : '📝';
          const safeTitle = escapeHtml(article.title.substring(0, 50));
          const safeSource = escapeHtml(article.source_name || '');
          message += `${index + 1}. ${statusEmoji} ${safeTitle}...\n`;
          message += `   <i>${safeSource}</i>\n\n`;
        });
      }

      await ctx.editMessageText(message, { parse_mode: 'HTML', ...getBackButton() });
      await ctx.answerCbQuery();
    }

    else if (data === 'review') {
      await ctx.editMessageText(
        '🔎 Nashr uchun tayyor maqolalar soni va holat:\n\n' +
        'Batafsil ma\'lumot uchun /stats buyrug\'ini yuboring.',
        getBackButton()
      );
      await ctx.answerCbQuery();
    }

    else if (data === 'test_channel') {
      await ctx.answerCbQuery('Tekshirilmoqda...');

      const result = await testChannelAccess();

      let message = '🧪 <b>KANAL TESTI</b>\n\n';
      if (result.success) {
        message += `✅ Kanal topildi!\n\n`;
        message += `Kanal: <b>${escapeHtml(result.channelName || result.channelId)}</b>\n`;
        message += `ID: <code>${escapeHtml(result.channelId)}</code>\n\n`;
        message += `Bot kanalga post yuborishi mumkin.`;
      } else {
        message += `❌ Xatolik!\n\n`;
        message += `Xabar: ${escapeHtml(result.error)}\n\n`;
        message += `Iltimos, tekshiring:\n`;
        message += `• Bot kanalga admin sifatida qo'shilgan\n`;
        message += `• Kanal ID to'g'ri kiritilgan\n`;
        message += `• Bot post yuborish huquqiga ega`;
      }

      await ctx.editMessageText(message, { parse_mode: 'HTML', ...getBackButton() });
    }

    else if (data === 'pause') {
      setSetting('emergency_pause', '1');
      logAdminAction(userId, 'EMERGENCY_PAUSE', 'Publishing paused');

      await ctx.editMessageText(
        '⏸ <b>NASHR TO\'XTATILDI</b>\n\n' +
        'Avtomatik nashr vaqtincha to\'xtatildi.\n\n' +
        'Davom ettirish uchun "▶️ Nashrni davom ettirish" tugmasini bosing.',
        { parse_mode: 'HTML', ...getBackButton() }
      );
      await ctx.answerCbQuery('Nashr to\'xtatildi ⏸');
      logger.info(`Publishing paused by admin ${userId}`);
    }

    else if (data === 'resume') {
      setSetting('emergency_pause', '0');
      logAdminAction(userId, 'RESUME_PUBLISHING', 'Publishing resumed');

      await ctx.editMessageText(
        '▶️ <b>NASHR DAVOM ETTIRILDI</b>\n\n' +
        'Avtomatik nashr yana yoqildi.\n\n' +
        'Bot yangiliklarni yig\'ishni va nashr etishni davom ettiradi.',
        { parse_mode: 'HTML', ...getBackButton() }
      );
      await ctx.answerCbQuery('Nashr davom ettirildi ▶️');
      logger.info(`Publishing resumed by admin ${userId}`);
    }

    else if (data === 'health') {
      const stats = getStatistics();
      const emergencyPause = getSetting('emergency_pause', '0') === '1';
      const schedulerStatus = getSchedulerStatus();
      const publishedToday = getPublishedCountToday();
      const publishedLastHour = getPublishedCountLastHour();

      let message = '❤️ <b>TIZIM HOLATI</b>\n\n';
      message += `Tizim: ${emergencyPause ? '⏸ Pauza' : '✅ Ishlayapti'}\n`;
      message += `Nashr: ${config.publishing.enabled && !emergencyPause ? '✅ Yoqilgan' : '❌ O\'chirilgan'}\n`;
      message += `Database: ✅ Ulangan\n`;
      message += `Scheduler: ${schedulerStatus.isRunning ? '✅ Faol' : '❌ To\'xtatilgan'}\n\n`;
      message += `Bugun: ${publishedToday}/${config.publishing.maxPostsPerDay}\n`;
      message += `So'ngi soat: ${publishedLastHour}/${config.publishing.maxPostsPerHour}\n`;

      if (stats?.recentErrors?.length > 0) {
        message += `\n⚠️ Xatolar: ${stats.recentErrors.length}\n`;
      }

      await ctx.editMessageText(message, { parse_mode: 'HTML', ...getBackButton() });
      await ctx.answerCbQuery();
    }

    else {
      await ctx.answerCbQuery('Noma\'lum buyruq');
    }

  } catch (error) {
    logger.error('Callback error:', error);
    try {
      await ctx.answerCbQuery('Xatolik yuz berdi');
    } catch (e) { /* ignore */ }
  }
}

export default { handleCallback };
