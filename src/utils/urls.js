import logger from '../logger.js';

// Unsafe URL patterns to block (SSRF protection)
const UNSAFE_PATTERNS = [
  /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)/i,
  /^(https?:\/\/)?10\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
  /^(https?:\/\/)?172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}/,
  /^(https?:\/\/)?192\.168\.\d{1,3}\.\d{1,3}/,
  /^(https?:\/\/)?169\.254\.\d{1,3}\.\d{1,3}/, // Link-local
  /^(https?:\/\/)?169\.254\.169\.254/, // AWS metadata
  /^(https?:\/\/)?metadata\.google\.internal/i,
  /^file:\/\//i,
  /^ftp:\/\//i,
];

export function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    
    // Only allow HTTP and HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      logger.warn(`Rejected URL with unsupported protocol: ${urlObj.protocol}`);
      return false;
    }

    // Check for unsafe patterns
    for (const pattern of UNSAFE_PATTERNS) {
      if (pattern.test(url)) {
        logger.warn(`Rejected unsafe URL: ${url}`);
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.warn(`Invalid URL format: ${url}`);
    return false;
  }
}

export function normalizeUrl(url) {
  if (!url) return '';

  try {
    const urlObj = new URL(url);
    
    // Remove common tracking parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'ref', 'source', 'share'
    ];
    
    trackingParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });

    // Normalize protocol to https where applicable
    if (urlObj.protocol === 'http:' && urlObj.hostname !== 'localhost') {
      // Keep as is, don't force HTTPS
    }

    // Remove trailing slash
    let normalized = urlObj.href.replace(/\/$/, '');
    
    // Remove www prefix for consistency
    normalized = normalized.replace(/\/\/(www\.)/, '//');

    return normalized;
  } catch (error) {
    logger.warn(`Failed to normalize URL: ${url}`);
    return url;
  }
}

export function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (error) {
    return '';
  }
}

export default {
  isValidUrl,
  normalizeUrl,
  extractDomain,
};
