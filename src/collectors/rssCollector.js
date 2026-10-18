import Parser from 'rss-parser';
import logger from '../logger.js';
import { validateAndNormalizeArticle } from '../services/sourceValidator.js';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'MaktabInfo-Bot/1.0 (Education News Aggregator)',
  },
});

export async function collectFromRss(source) {
  const articles = [];

  try {
    logger.info(`Collecting RSS from: ${source.name}`);

    const feed = await parser.parseURL(source.url);

    if (!feed || !feed.items || feed.items.length === 0) {
      logger.warn(`No items found in RSS feed: ${source.name}`);
      return articles;
    }

    logger.info(`Found ${feed.items.length} items in feed: ${source.name}`);

    for (const item of feed.items) {
      try {
        const article = {
          sourceId: source.id,
          title: item.title || '',
          description: item.contentSnippet || item.description || '',
          content: item.content || item['content:encoded'] || '',
          url: item.link || item.guid || '',
          publishedAt: item.pubDate || item.isoDate || null,
          author: item.creator || item.author || '',
          category: source.category,
        };

        // Validate and normalize
        const normalized = validateAndNormalizeArticle(article);
        if (normalized) {
          // Ensure sourceId is preserved
          normalized.sourceId = source.id;
          articles.push(normalized);
        }
      } catch (error) {
        logger.error(`Failed to process RSS item from ${source.name}:`, error.message);
      }
    }

    logger.info(`Successfully collected ${articles.length} valid articles from ${source.name}`);
  } catch (error) {
    logger.error(`Failed to collect RSS from ${source.name}:`, error.message);
  }

  return articles;
}

export default {
  collectFromRss,
};
