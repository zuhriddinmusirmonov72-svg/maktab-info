/**
 * Public handlers — har qanday foydalanuvchi uchun
 * Admin bo'lmasa: oddiy menyu + contact forma
 * Admin bo'lsa: admin paneli
 */
import { Markup } from 'telegraf';
import { getPublicMenu } from '../keyboards/publicMenu.js';
import { getMainMenu } from '../keyboards/adminMenu.js';
import config from '../config.js';
import logger from '../logger.js';

// Foydalanuvchi xabar yozish kutilayotgan holat
const awaitingMessage = new Set();

function backToMenuButton() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('⬅️ Bosh menyu', 'back_to_menu')],
  ]);
}

// ─── /start ──────────────────────────────────────────────────────────────────
export async function handleStart(ctx) {
  const userId    = ctx.from.id.toString();
  const firstName = ctx.from.first_name || 'Foydalanuvchi';

  // Admin bo'lsa — admin paneli
  if (config.telegram.adminIds.includes(userId)) {
    logger.info(`Admin started bot: ${userId}`);
    await ctx.reply(
      `👋 <b>Assalomu alaykum, Admin!</b>\n\n` +
      `Bu <b>MAKTAB INFO</b> boshqaruv paneli.\n` +
      `Har <b>5 daqiqada</b> ta'lim yangiliklari yig'iladi.`,
      { parse_mode: 'HTML', ...getMainMenu() }
    );
    return;
  }

  // Oddiy foydalanuvchi
  logger.info(`Public user started: ${userId}`);
  await ctx.reply(
    `👋 <b>Assalomu alaykum, ${firstName}!</b>\n\n` +
    `🎓 <b>MAKTAB INFO</b> botiga xush kelibsiz!\n\n` +
    `Biz ta'lim sohasidagi eng so'nggi va ishonchli \n` +
    `yangiliklarni yetkazib beramiz.\n\n` +
    `📌 Quyidagi bo'limlardan birini tanlang:`,
    { parse_mode: 'HTML', ...getPublicMenu() }
  );
}

// ─── /help ───────────────────────────────────────────────────────────────────
export async function handleHelp(ctx) {
  await ctx.reply(
    `❓ <b>YORDAM</b>\n\n` +
    `Bu bot ta'lim yangiliklari kanaliga tegishli.\n\n` +
    `<b>Nima qila olasiz?</b>\n` +
    `• 📢 Hamkorlik — reklama yoki hamkorlik takliflari\n` +
    `• 📩 Admin bilan bog'lanish — savol yoki taklif\n\n` +
    `Bosh menyuga: /start`,
    { parse_mode: 'HTML' }
  );
}

// ─── Callback handler (public tugmalar) ──────────────────────────────────────
export async function handlePublicCallback(ctx) {
  const data   = ctx.callbackQuery?.data;
  const userId = ctx.from.id.toString();

  if (data === 'public_hamkorlik') {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `📢 <b>HAMKORLIK</b>\n\n` +
      `Kanalimiz bilan hamkorlik qilmoqchimisiz?\n\n` +
      `<b>Hamkorlik turlari:</b>\n` +
      `• 📣 Reklama joylash\n` +
      `• 🤝 Tashkilot bilan sheriklik\n` +
      `• 📚 Ta'lim materiali ulashish\n` +
      `• 🏫 Maktab xabarlari e'lon qilish\n\n` +
      `💬 Taklif yuborish uchun <b>"Admin bilan bog'lanish"</b> bo'limiga o'ting.\n\n` +
      `📩 Yoki to'g'ridan: /start → Admin bilan bog'lanish`,
      { parse_mode: 'HTML', ...backToMenuButton() }
    );
  }

  else if (data === 'public_yordam') {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `❓ <b>YORDAM</b>\n\n` +
      `<b>Ko'p so'raladigan savollar:</b>\n\n` +
      `❔ <i>Kanalga qanday obuna bo'lish mumkin?</i>\n` +
      `→ Kanal havolasiga o'tib "Obuna bo'lish" tugmasini bosing.\n\n` +
      `❔ <i>Yangiliklar qancha vaqtda yangilanadi?</i>\n` +
      `→ Har 5 daqiqada ishonchli manbalardan yangilanadi.\n\n` +
      `❔ <i>Noto'g'ri ma'lumot ko'rsam nima qilaman?</i>\n` +
      `→ "Admin bilan bog'lanish" orqali xabar yuboring.\n\n` +
      `❔ <i>Savol yoki taklifim bor?</i>\n` +
      `→ "Admin bilan bog'lanish" tugmasini bosing. 👇`,
      { parse_mode: 'HTML', ...backToMenuButton() }
    );
  }

  else if (data === 'public_contact') {
    await ctx.answerCbQuery();
    awaitingMessage.add(userId);
    await ctx.editMessageText(
      `📩 <b>ADMIN BILAN BOG'LANISH</b>\n\n` +
      `✍️ Xabaringizni yozing va yuboring.\n` +
      `Admin imkon qadar tez javob beradi!\n\n` +
      `<i>Masalan: savol, taklif, hamkorlik, xato xabar va h.k.</i>\n\n` +
      `❌ Bekor qilish: /start`,
      { parse_mode: 'HTML' }
    );
  }

  else if (data === 'back_to_menu') {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `📌 Quyidagi bo'limlardan birini tanlang:`,
      { parse_mode: 'HTML', ...getPublicMenu() }
    );
  }
}

// ─── Oddiy matn xabar kelganda ───────────────────────────────────────────────
export async function handlePublicMessage(ctx) {
  const userId = ctx.from.id.toString();
  const text   = ctx.message?.text;

  if (!text) return;

  // Agar foydalanuvchi contact forma orqali xabar yozayotgan bo'lsa
  if (awaitingMessage.has(userId)) {
    awaitingMessage.delete(userId);
    await sendContactToAdmin(ctx, text);
    return;
  }
}

// ─── Contact xabarni adminga yuborish ────────────────────────────────────────
async function sendContactToAdmin(ctx, text) {
  const userId    = ctx.from.id.toString();
  const firstName = ctx.from.first_name || '';
  const lastName  = ctx.from.last_name  || '';
  const username  = ctx.from.username ? `@${ctx.from.username}` : 'username yo\'q';

  // Xabar yuborish manzili — CONTACT_NOTIFY_ID yoki birinchi admin
  const notifyId = config.telegram.contactNotifyId || config.telegram.adminIds[0];

  if (!notifyId) {
    await ctx.reply('❌ Uzr, hozir xabar yuborib bo\'lmaydi. Keyinroq urinib ko\'ring.');
    return;
  }

  const adminMsg =
    `📩 <b>YANGI XABAR — MAKTAB INFO BOT</b>\n` +
    `━━━━━━━━━━━━━━\n` +
    `👤 <b>Kim:</b> ${firstName} ${lastName} (${username})\n` +
    `🆔 <b>ID:</b> <code>${userId}</code>\n` +
    `━━━━━━━━━━━━━━\n` +
    `💬 <b>Xabar:</b>\n${text}\n` +
    `━━━━━━━━━━━━━━\n` +
    `📎 <a href="tg://user?id=${userId}">Javob berish uchun bosing</a>`;

  try {
    const { getBot } = await import('../bot.js');
    const bot = getBot();
    await bot.telegram.sendMessage(notifyId, adminMsg, { parse_mode: 'HTML' });
    logger.info(`Contact message forwarded: user ${userId} → admin ${notifyId}`);

    await ctx.reply(
      `✅ <b>Xabaringiz yuborildi!</b>\n\n` +
      `Admin tez orada javob beradi. 🙏\n\n` +
      `Bosh menyuga qaytish: /start`,
      { parse_mode: 'HTML' }
    );
  } catch (err) {
    logger.error('Failed to forward contact message:', err.message);
    await ctx.reply(
      `❌ Xabar yuborishda xatolik.\n` +
      `Iltimos, keyinroq qayta urinib ko'ring.`
    );
  }
}

export default {
  handleStart,
  handleHelp,
  handlePublicCallback,
  handlePublicMessage,
};
