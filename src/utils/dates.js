export function parseDate(dateString) {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch (error) {
    return null;
  }
}

export function isRecentArticle(publishedDate, maxAgeHours) {
  if (!publishedDate) return false;

  const date = typeof publishedDate === 'string' ? parseDate(publishedDate) : publishedDate;
  if (!date) return false;

  const now = new Date();
  const ageMs = now - date;
  const ageHours = ageMs / (1000 * 60 * 60);

  // Reject future dates
  if (ageHours < 0) {
    return false;
  }

  return ageHours <= maxAgeHours;
}

export function isFutureDate(date) {
  const dateObj = typeof date === 'string' ? parseDate(date) : date;
  if (!dateObj) return false;

  return dateObj > new Date();
}

export function formatDateUzbek(date) {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? parseDate(date) : date;
  if (!dateObj) return '';

  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();

  return `${day}.${month.toString().padStart(2, '0')}.${year}`;
}

export function getHoursAgo(hours) {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
}

export default {
  parseDate,
  isRecentArticle,
  isFutureDate,
  formatDateUzbek,
  getHoursAgo,
};
