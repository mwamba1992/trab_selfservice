export const SUPPORTED_LOCALES = ['en', 'sw'];
const STORAGE_KEY = 'locale';

export function getStoredLocale() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LOCALES.includes(value) ? value : 'en';
  } catch {
    return 'en';
  }
}

export function storeLocale(locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* not persisted */
  }
}
