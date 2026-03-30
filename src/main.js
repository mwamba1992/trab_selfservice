import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import ToastService from 'primevue/toastservice';
import 'primeicons/primeicons.css';
import './assets/tailwind.css';
import './assets/styles.scss';

import App from './App.vue';
import router from './router/index.js';

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
app.use(router);
app.mount('#app');
