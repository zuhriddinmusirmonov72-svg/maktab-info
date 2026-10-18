import { Markup } from 'telegraf';

export function getMainMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📊 Statistika', 'stats'),
      Markup.button.callback('🌐 Manbalar', 'sources'),
    ],
    [
      Markup.button.callback('⚙️ Sozlamalar', 'settings'),
      Markup.button.callback('📚 So\'nggi maqolalar', 'recent'),
    ],
    [
      Markup.button.callback('🔎 Ko\'rib chiqish', 'review'),
      Markup.button.callback('🧪 Kanal testi', 'test_channel'),
    ],
    [
      Markup.button.callback('⏸ Nashrni to\'xtatish', 'pause'),
      Markup.button.callback('▶️ Nashrni davom ettirish', 'resume'),
    ],
    [
      Markup.button.callback('❤️ Tizim holati', 'health'),
    ],
  ]);
}

export function getSourcesMenu(sources) {
  const buttons = sources.map(source => [
    Markup.button.callback(
      `${source.enabled ? '✅' : '❌'} ${source.name}`,
      `source_toggle_${source.id}`
    ),
  ]);

  buttons.push([Markup.button.callback('⬅️ Ortga', 'main_menu')]);

  return Markup.inlineKeyboard(buttons);
}

export function getSettingsMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📝 Nashr sozlamalari', 'settings_publishing'),
    ],
    [
      Markup.button.callback('🏫 Maktab ma\'lumotlari', 'settings_school'),
    ],
    [
      Markup.button.callback('⬅️ Ortga', 'main_menu'),
    ],
  ]);
}

export function getBackButton() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('⬅️ Ortga', 'main_menu')],
  ]);
}

export default {
  getMainMenu,
  getSourcesMenu,
  getSettingsMenu,
  getBackButton,
};
