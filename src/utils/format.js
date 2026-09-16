const intlLocale = (locale) => (locale === 'sw' ? 'sw-TZ' : 'en-GB');

export function formatMoney(value, locale = 'en') {
  return Number(value || 0).toLocaleString(intlLocale(locale), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDateTime(value, locale = 'en') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(intlLocale(locale), { dateStyle: 'medium', timeStyle: 'short' });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A plain day: "14 Sep 2026" ("-" when empty). Dates from the API are already YYYY-MM-DD. */
export function formatDate(value) {
  if (!value) return '-';
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (match) return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Backend enum-style values ("HEARING_SCHEDULED") as readable labels ("Hearing scheduled"). */
export function humanize(value) {
  if (!value) return '-';
  const text = String(value).replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatTime(value, locale = 'en') {
  return new Date(value).toLocaleTimeString(intlLocale(locale), { hour: '2-digit', minute: '2-digit' });
}

/** Extracts the backend's message from an axios error. */
export function apiErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (typeof data?.description === 'string' && data.description && data.description !== 'SUCCESS') return data.description;
  if (Array.isArray(data?.message)) return data.message.join(', ');
  if (typeof data?.message === 'string' && data.message) return data.message;
  return fallback;
}
