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
