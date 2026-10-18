import { formatDateUzbek } from '../utils/dates.js';
import { truncate, stripHtml } from '../utils/text.js';
import logger from '../logger.js';

const MAX_MESSAGE_LENGTH = 4000; // Telegram limit is 4096, leave some margin
const MAX_DESCRIPTION_LENGTH = 400;

// HTML escaping for Telegram
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Generate "why it matters" from article content
function generateWhyItMatters(article) {
  // Try to extract relevance from description
  const content = article.description || article.content || '';
  
  if (!content) return null;
  
  // Look for key educational terms
  const keywords = ['talaba', 'o\'quvchi', 'imtihon', 'grant', 'olimpiada', 'test', 'ariza', 'qabul'];
  const lowerContent = content.toLowerCase();
  
  for (const keyword of keywords) {
    if (lowerContent.includes(keyword)) {
      // Extract sentence containing the keyword
      const sentences = content.split(/[.!?]\s+/);
      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes(keyword)) {
          const cleaned = sentence.trim();
          if (cleaned.length > 20 && cleaned.length < 150) {
            return cleaned;
          }
        }
      }
    }
  }
  
  return null;
}

export function formatPost(article, sourceName) {
  try {
    const title = escapeHtml(article.title);
    
    // Create description/summary
    let description = stripHtml(article.description || article.content || '');
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      description = truncate(description, MAX_DESCRIPTION_LENGTH);
    }
    description = escapeHtml(description);

    // Generate "why it matters" section
    const whyMatters = generateWhyItMatters(article);
    
    // Source name
    const source = escapeHtml(sourceName || article.source_name || 'Manba');

    // Build post with new beautiful HTML format
    let post = '📰 <b>MAKTAB INFO | TEZKOR XABAR</b>\n';
    post += '━━━━━━━━━━━━━━\n\n';
    post += `📚 <b>${title}</b>\n\n`;
    
    if (description) {
      post += `${description}\n\n`;
    }
    
    // Add "why it matters" if available
    if (whyMatters) {
      post += `📌 <b>Nima uchun muhim?</b> ${escapeHtml(whyMatters)}\n\n`;
    }
    
    post += `🔗 <a href="${article.url}">Manbani o'qish</a>\n\n`;
    post += '━━━━━━━━━━━━━━\n';
    post += '🇺🇿 <i>Ta\'lim yangiliklari — ishonchli manbalardan.</i>';

    // Check length and adjust if needed
    if (post.length > MAX_MESSAGE_LENGTH) {
      logger.warn(`Post too long (${post.length} chars), truncating`);
      
      // Recalculate with shorter description
      const shorterDesc = escapeHtml(truncate(stripHtml(article.description || article.content || ''), 250));
      post = '📰 <b>MAKTAB INFO | TEZKOR XABAR</b>\n';
      post += '━━━━━━━━━━━━━━\n\n';
      post += `📚 <b>${title}</b>\n\n`;
      post += `${shorterDesc}\n\n`;
      post += `🔗 <a href="${article.url}">Manbani o'qish</a>\n\n`;
      post += '━━━━━━━━━━━━━━\n';
      post += '🇺🇿 <i>Ta\'lim yangiliklari — ishonchli manbalardan.</i>';
    }

    return post;
  } catch (error) {
    logger.error('Failed to format post:', error);
    
    // Fallback to minimal format
    const safeTitle = escapeHtml(article.title || 'Yangilik');
    return `📰 <b>MAKTAB INFO | TEZKOR XABAR</b>\n\n<b>${safeTitle}</b>\n\n🔗 <a href="${article.url}">Manbani o'qish</a>`;
  }
}

export function formatSimplePost(title, url, sourceName = 'Internet') {
  const escapedTitle = escapeHtml(title);
  const escapedSource = escapeHtml(sourceName);
  
  return `📰 <b>MAKTAB INFO | TEZKOR XABAR</b>\n━━━━━━━━━━━━━━\n\n📚 <b>${escapedTitle}</b>\n\n🔎 Manba: ${escapedSource}\n🔗 <a href="${url}">Manbani o'qish</a>\n\n━━━━━━━━━━━━━━\n🇺🇿 <i>Ta'lim yangiliklari — ishonchli manbalardan.</i>`;
}

export default {
  formatPost,
  formatSimplePost,
};
