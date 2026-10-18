export function normalizeText(text) {
  if (!text) return '';

  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
}

export function truncate(text, maxLength) {
  if (!text || text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + '...';
}

export function stripHtml(html) {
  if (!html) return '';

  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeMarkdown(text) {
  if (!text) return '';

  return text
    .replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

export function extractKeywords(text, minLength = 3) {
  if (!text) return [];

  const words = normalizeText(text).split(/\s+/);
  const keywords = words.filter(word => word.length >= minLength);

  // Remove duplicates
  return [...new Set(keywords)];
}

export function containsAnyKeyword(text, keywords) {
  if (!text || !keywords || keywords.length === 0) {
    return false;
  }

  const normalized = normalizeText(text);
  return keywords.some(keyword => normalized.includes(normalizeText(keyword)));
}

export default {
  normalizeText,
  truncate,
  stripHtml,
  escapeMarkdown,
  extractKeywords,
  containsAnyKeyword,
};
