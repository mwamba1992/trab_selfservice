import { mount, flushPromises } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';
import { createRouter, createMemoryHistory } from 'vue-router';
import { i18n } from '@/i18n/index.js';

/** Mounts a page with the app's plugins (PrimeVue unstyled, i18n, in-memory router). */
export async function mountPage(component, { route = '/' } = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
  });
  router.push(route);
  await router.isReady();

  const wrapper = mount(component, {
    attachTo: document.body,
    global: {
      plugins: [[PrimeVue, { unstyled: true }], ToastService, ConfirmationService, i18n, router],
      directives: { tooltip: Tooltip },
      stubs: { teleport: true, transition: false },
    },
  });
  await flushPromises();
  return { wrapper, router };
}

/** Finds a visible button by its text or aria-label. */
export function findButton(wrapper, label) {
  return wrapper.findAll('button').find((b) => b.isVisible() && (b.attributes('aria-label') === label || b.text().trim() === label));
}

/** Local YYYY-MM-DD for `daysAgo` days before today. */
export function isoDaysAgo(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
