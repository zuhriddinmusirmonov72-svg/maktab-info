import { getDatabase, getSetting, setSetting } from '../database.js';
import config from '../config.js';
import logger from '../logger.js';

// Poll templates - 3 kunda bir marta yuboriladi
const POLL_TEMPLATES = [
  {
    question: "MAKTAB INFO kanalidan qanchalik mamnunsiz?",
    options: ["100% mamnunman 👍", "Yoqmayapti 😐"],
    isAnonymous: true,
    type: 'regular',
  },
  {
    question: "Qaysi mavzularda ko'proq yangilik xohlaysiz?",
    options: [
      "Imtihonlar va testlar",
      "Grant va stipendiyalar",
      "O'qituvchilar uchun",
      "Maktab hayoti"
    ],
    isAnonymous: true,
    type: 'regular',
  },
  {
    question: "MAKTAB INFO sizga qanchalik foydali?",
    options: ["Juda foydali ⭐⭐⭐", "O'rtacha foydali ⭐⭐", "Kam foydali ⭐"],
    isAnonymous: true,
    type: 'regular',
  },
  {
    question: "Yangiliklar chastotasi qanday?",
    options: ["Ko'p yangilik yuboriladi", "Aniq kerakli miqdor", "Kam yangilik yuboriladi"],
    isAnonymous: true,
    type: 'regular',
  },
];

let bot = null;

export function setBot(botInstance) {
  bot = botInstance;
}

export function getLastPollTime() {
  const lastPollStr = getSetting('last_poll_sent', null);
  return lastPollStr ? new Date(lastPollStr) : null;
}

export function shouldSendPoll() {
  const lastPollTime = getLastPollTime();
  
  if (!lastPollTime) {
    logger.info('Poll: hech qachon yuborilmagan, birinchi marta yuboriladi');
    return true; // Hech qachon yuborilmagan
  }
  
  // 3 kun = 72 soat = 259200000 millisekund
  const msSinceLastPoll = Date.now() - lastPollTime.getTime();
  const hoursSinceLastPoll = msSinceLastPoll / (1000 * 60 * 60);
  const hoursRemaining = 72 - hoursSinceLastPoll;
  
  logger.info(`Poll tekshiruv: oxirgi poll ${hoursSinceLastPoll.toFixed(1)} soat oldin, keyingisi ${hoursRemaining.toFixed(1)} soatdan keyin`);
  
  return hoursSinceLastPoll >= 72;
}

export async function sendPollToChannel() {
  if (!bot) {
    logger.error('Bot not initialized for poll service');
    return { success: false, error: 'Bot not initialized' };
  }
  
  if (!shouldSendPoll()) {
    logger.info('Poll already sent within last 3 days');
    return { success: false, error: 'Too soon' };
  }
  
  try {
    // Random poll tanlash
    const pollTemplate = POLL_TEMPLATES[Math.floor(Math.random() * POLL_TEMPLATES.length)];
    
    const message = await bot.telegram.sendPoll(
      config.telegram.channelId,
      pollTemplate.question,
      pollTemplate.options,
      {
        is_anonymous: pollTemplate.isAnonymous,
        type: pollTemplate.type,
      }
    );
    
    // Yuborilgan vaqtni saqlash
    setSetting('last_poll_sent', new Date().toISOString());
    
    logger.info(`Poll sent to channel: ${pollTemplate.question}`);
    
    return {
      success: true,
      messageId: message.message_id,
      question: pollTemplate.question,
    };
  } catch (error) {
    logger.error('Failed to send poll:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  setBot,
  shouldSendPoll,
  sendPollToChannel,
  getLastPollTime,
};
