import { normalizeText } from '../utils/text.js';
import logger from '../logger.js';

// Suspicious patterns that might indicate malicious content
const SUSPICIOUS_PATTERNS = [
  /ignore\s+(previous|above|all)\s+instructions?/i,
  /you\s+are\s+now\s+a\s+different/i,
  /disregard\s+(previous|all)\s+instructions?/i,
  /new\s+instructions?:\s*/i,
  /system\s+prompt/i,
  /forget\s+everything/i,
];

// Spam indicators
const SPAM_INDICATORS = [
  /click\s+here\s+now/i,
  /limited\s+time\s+offer/i,
  /act\s+now/i,
  /guaranteed\s+income/i,
  /make\s+money\s+fast/i,
  /free\s+money/i,
  /casino/i,
  /viagra/i,
];

export function detectSuspiciousContent(text) {
  if (!text) return { isSuspicious: false, reasons: [] };

  const normalized = normalizeText(text);
  const reasons = [];

  // Check for suspicious instruction patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(text)) {
      reasons.push(`Suspicious instruction pattern detected`);
      break;
    }
  }

  // Check for spam
  for (const pattern of SPAM_INDICATORS) {
    if (pattern.test(text)) {
      reasons.push(`Spam indicator detected`);
      break;
    }
  }

  // Check for excessive capitals (possible spam)
  const uppercaseRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (text.length > 50 && uppercaseRatio > 0.5) {
    reasons.push('Excessive uppercase letters');
  }

  // Check for excessive special characters
  const specialCharRatio = (text.match(/[!@#$%^&*()]/g) || []).length / text.length;
  if (text.length > 50 && specialCharRatio > 0.15) {
    reasons.push('Excessive special characters');
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
  };
}

export function isSafeToPublish(article) {
  const fullText = `${article.title} ${article.description} ${article.content}`;
  const safety = detectSuspiciousContent(fullText);

  if (safety.isSuspicious) {
    logger.warn(`Article flagged as suspicious: ${article.title}`, safety.reasons);
    return false;
  }

  return true;
}

export default {
  detectSuspiciousContent,
  isSafeToPublish,
};
