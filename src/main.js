import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';
import 'primeicons/primeicons.css';
import './assets/tailwind.css';
import './assets/styles.scss';

import App from './App.vue';
import router from './router/index.js';
import { i18n, applyPrimeLocale } from './i18n/index.js';
import { setSessionExpiredHandler } from './service/Api.js';
import { profileStore } from './stores/profile.js';

const app = createApp(App);

app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.app-dark',
    },
  },
});

app.use(ToastService);
app.use(ConfirmationService);
app.directive('tooltip', Tooltip);
app.use(i18n);
app.use(router);

const locale = i18n.global.locale.value;
document.documentElement.setAttribute('lang', locale);
applyPrimeLocale(app.config.globalProperties.$primevue, locale);

// When the session can no longer be refreshed, send the user to sign in and
// bring them back to the same page afterwards (drafts are kept).
setSessionExpiredHandler(() => {
  profileStore.reset();
  const current = router.currentRoute.value;
  if (current.name === 'Landing') return;
  router.push({ name: 'Landing', query: { expired: '1', redirect: current.fullPath } });
});

app.mount('#app');
