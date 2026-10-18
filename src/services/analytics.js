import { getDatabase } from '../database.js';
import logger from '../logger.js';

export function getStatistics() {
  const db = getDatabase();
  if (!db) return null;

  try {
    // Total articles
    const totalArticles = db.prepare('SELECT COUNT(*) as count FROM articles').get();

    // Articles by status
    const byStatus = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM articles 
      GROUP BY status
    `).all();

    // Published today
    const publishedToday = db.prepare(`
      SELECT COUNT(*) as count 
      FROM published_posts 
      WHERE DATE(published_at) = DATE('now')
    `).get();

    // Published this week
    const publishedThisWeek = db.prepare(`
      SELECT COUNT(*) as count 
      FROM published_posts 
      WHERE published_at >= DATE('now', '-7 days')
    `).get();

    // Total published
    const totalPublished = db.prepare('SELECT COUNT(*) as count FROM published_posts').get();

    // Sources performance
    const sourceStats = db.prepare(`
      SELECT 
        s.name,
        s.enabled,
        COUNT(a.id) as articles_collected,
        SUM(CASE WHEN a.status = 'PUBLISHED' THEN 1 ELSE 0 END) as articles_published
      FROM sources s
      LEFT JOIN articles a ON s.id = a.source_id
      GROUP BY s.id
      ORDER BY articles_published DESC
    `).all();

    // Recent errors
    const recentErrors = db.prepare(`
      SELECT error_type, error_message, created_at
      FROM error_events
      ORDER BY created_at DESC
      LIMIT 5
    `).all();

    // Last collection
    const lastCollection = db.prepare(`
      SELECT started_at, articles_collected, articles_new, articles_duplicate
      FROM collection_runs
      ORDER BY started_at DESC
      LIMIT 1
    `).get();

    return {
      totalArticles: totalArticles.count,
      byStatus,
      publishedToday: publishedToday.count,
      publishedThisWeek: publishedThisWeek.count,
      totalPublished: totalPublished.count,
      sourceStats,
      recentErrors,
      lastCollection,
    };
  } catch (error) {
    logger.error('Failed to get statistics:', error);
    return null;
  }
}

export function formatStatisticsMessage(stats) {
  if (!stats) return 'Statistika mavjud emas.';

  let message = '📊 <b>STATISTIKA</b>\n\n';

  message += `📰 Jami maqolalar: ${stats.totalArticles}\n`;
  message += `✅ Nashr etilgan: ${stats.totalPublished}\n`;
  message += `📅 Bugun: ${stats.publishedToday}\n`;
  message += `📆 Shu hafta: ${stats.publishedThisWeek}\n\n`;

  message += '<b>Holati bo\'yicha:</b>\n';
  for (const status of stats.byStatus) {
    const statusLabel = status.status === 'NEW' ? 'Yangi' :
                       status.status === 'VALIDATED' ? 'Tekshirilgan' :
                       status.status === 'READY_TO_PUBLISH' ? 'Nashr uchun tayyor' :
                       status.status === 'PUBLISHED' ? 'Nashr etilgan' :
                       status.status.replace(/_/g, ' ');
    message += `  • ${statusLabel}: ${status.count}\n`;
  }

  if (stats.lastCollection) {
    message += `\n<b>Oxirgi yig'ish:</b>\n`;
    message += `  Vaqt: ${new Date(stats.lastCollection.started_at).toLocaleString('uz-UZ')}\n`;
    message += `  Yig'ilgan: ${stats.lastCollection.articles_collected || 0}\n`;
    message += `  Yangi: ${stats.lastCollection.articles_new || 0}\n`;
  }

  return message;
}

export default {
  getStatistics,
  formatStatisticsMessage,
};
