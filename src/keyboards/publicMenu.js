import { Markup } from 'telegraf';

export function getPublicMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📢 Hamkorlik',           'public_hamkorlik')],
    [Markup.button.callback('❓ Yordam',               'public_yordam')],
    [Markup.button.callback('📩 Admin bilan bog\'lanish', 'public_contact')],
  ]);
}

export default { getPublicMenu };
