/**
 * Admin-only /admin command handler
 * (Public /start is handled by handlers/public.js)
 */
import { getMainMenu } from '../keyboards/adminMenu.js';
import config from '../config.js';
import logger from '../logger.js';

export async function handleAdmin(ctx) {
  const userId = ctx.from.id.toString();

  if (!config.telegram.adminIds.includes(userId)) {
    await ctx.reply('Kechirasiz, sizda admin huquqi yo\'q.');
    return;
  }

  logger.info(`Admin panel opened by: ${userId}`);
  await ctx.reply(
    `� <b>ADMIN PANEL</b>\n\nQuyidagi tugmalardan foydalaning:`,
    { parse_mode: 'HTML', ...getMainMenu() }
  );
}

export async function handleHelp(ctx) {
  const userId = ctx.from.id.toString();

  if (!config.telegram.adminIds.includes(userId)) {
    await ctx.reply('Kechirasiz, sizda admin huquqi yo\'q.');
    return;
  }

  await ctx.reply(
    `📖 <b>ADMIN YORDAM</b>\n\n` +
    `<b>Buyruqlar:</b>\n` +
    `/admin — Admin paneli\n` +
    `/status — Scheduler holati\n` +
    `/checknow — Hozir yangilik tekshirish\n` +
    `/preview — Keyingi post ko'rinishi\n` +
    `/stats — Statistika\n` +
    `/settings — Sozlamalar\n` +
    `/pause — Nashrni to'xtatish\n` +
    `/resume — Nashrni davom ettirish\n` +
    `/help — Yordam`,
    { parse_mode: 'HTML' }
  );
}

export default { handleAdmin, handleHelp };
