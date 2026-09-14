import { createI18n } from 'vue-i18n';
import en from './en.js';
import sw from './sw.js';
import { getStoredLocale, storeLocale, SUPPORTED_LOCALES } from './locale.js';

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: getStoredLocale(),
  fallbackLocale: 'en',
  messages: { en, sw },
});

// PrimeVue's own texts (calendar, paginator, file upload). English values are
// captured from PrimeVue on first switch so we can restore them.
const primeSw = {
  accept: 'Ndiyo',
  reject: 'Hapana',
  choose: 'Chagua',
  upload: 'Pakia',
  cancel: 'Ghairi',
  clear: 'Futa',
  today: 'Leo',
  weekHeader: 'Wk',
  firstDayOfWeek: 1,
  dayNames: ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'],
  dayNamesShort: ['Jpl', 'Jtt', 'Jnn', 'Jtn', 'Alh', 'Iju', 'Jmo'],
  dayNamesMin: ['Jp', 'Jt', 'Jn', 'Jt', 'Al', 'Ij', 'Jm'],
  monthNames: ['Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni', 'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba'],
  monthNamesShort: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'],
  emptyMessage: 'Hakuna matokeo',
  emptyFilterMessage: 'Hakuna matokeo',
  emptySearchMessage: 'Hakuna matokeo',
  searchMessage: 'Matokeo {0} yanapatikana',
  selectionMessage: 'Vipengele {0} vimechaguliwa',
};
let primeEn = null;

export function applyPrimeLocale(primevue, locale) {
  if (!primevue?.config?.locale) return;
  if (!primeEn) primeEn = JSON.parse(JSON.stringify(primevue.config.locale));
  Object.assign(primevue.config.locale, locale === 'sw' ? primeSw : primeEn);
}

export function setLocale(locale, primevue) {
  if (!SUPPORTED_LOCALES.includes(locale)) return;
  i18n.global.locale.value = locale;
  storeLocale(locale);
  document.documentElement.setAttribute('lang', locale);
  applyPrimeLocale(primevue, locale);
}
