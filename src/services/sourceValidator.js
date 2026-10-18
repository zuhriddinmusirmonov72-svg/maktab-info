import { isValidUrl, normalizeUrl, extractDomain } from '../utils/urls.js';
import { isRecentArticle, isFutureDate, parseDate } from '../utils/dates.js';
import { stripHtml } from '../utils/text.js';
import { isSourceAllowed } from '../collectors/sourceRegistry.js';
import config from '../config.js';
import logger from '../logger.js';

const VALIDATION_STATUS = {
  VALID: 'VALIDATED',
  INVALID_URL: 'REJECTED_INVALID_URL',
  UNSAFE_URL: 'REJECTED_UNSAFE_URL',
  UNTRUSTED_SOURCE: 'REJECTED_UNTRUSTED_SOURCE',
  TOO_OLD: 'REJECTED_TOO_OLD',
  FUTURE_DATE: 'REJECTED_FUTURE_DATE',
  EMPTY_CONTENT: 'REJECTED_EMPTY_CONTENT',
  TOO_SHORT: 'REJECTED_TOO_SHORT',
};

const MIN_CONTENT_LENGTH = 50;
const MIN_TITLE_LENGTH = 10;

export function validateArticle(article) {
  const validation = {
    isValid: false,
    status: '',
    errors: [],
    normalizedUrl: '',
  };

  // Validate URL
  if (!article.url) {
    validation.errors.push('Missing URL');
    validation.status = VALIDATION_STATUS.INVALID_URL;
    return validation;
  }

  if (!isValidUrl(article.url)) {
    validation.errors.push('Invalid or unsafe URL');
    validation.status = VALIDATION_STATUS.UNSAFE_URL;
    return validation;
  }

  // Normalize URL
  validation.normalizedUrl = normalizeUrl(article.url);

  // Verify source is allowed
  const domain = extractDomain(article.url);
  if (!isSourceAllowed(article.url)) {
    validation.errors.push(`Source not in allowlist: ${domain}`);
    validation.status = VALIDATION_STATUS.UNTRUSTED_SOURCE;
    return validation;
  }

  // Validate title
  if (!article.title || article.title.trim().length < MIN_TITLE_LENGTH) {
    validation.errors.push('Title too short or missing');
    validation.status = VALIDATION_STATUS.TOO_SHORT;
    return validation;
  }

  // Validate content
  const content = stripHtml(article.description || article.content || '');
  if (!content || content.trim().length < MIN_CONTENT_LENGTH) {
    validation.errors.push('Content too short or empty');
    validation.status = VALIDATION_STATUS.EMPTY_CONTENT;
    return validation;
  }

  // Validate publication date
  if (article.publishedAt) {
    const publishedDate = parseDate(article.publishedAt);

    if (publishedDate && isFutureDate(publishedDate)) {
      validation.errors.push('Article has future publication date');
      validation.status = VALIDATION_STATUS.FUTURE_DATE;
      return validation;
    }

    if (publishedDate && !isRecentArticle(publishedDate, config.publishing.maxArticleAgeHours)) {
      validation.errors.push(`Article older than ${config.publishing.maxArticleAgeHours} hours`);
      validation.status = VALIDATION_STATUS.TOO_OLD;
      return validation;
    }
  }

  // All validations passed
  validation.isValid = true;
  validation.status = VALIDATION_STATUS.VALID;

  return validation;
}

export function validateAndNormalizeArticle(article) {
  const validation = validateArticle(article);

  if (!validation.isValid) {
    logger.debug(`Article validation failed: ${validation.errors.join(', ')}`);
    return null;
  }

  // Return normalized article
  return {
    ...article,
    url: validation.normalizedUrl,
    title: article.title.trim(),
    description: stripHtml(article.description || '').trim(),
    content: stripHtml(article.content || '').trim(),
  };
}

export { VALIDATION_STATUS };

export default {
  validateArticle,
  validateAndNormalizeArticle,
  VALIDATION_STATUS,
};
