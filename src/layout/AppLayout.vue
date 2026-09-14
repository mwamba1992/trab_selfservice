<script setup>
import { useI18n } from 'vue-i18n';
import AppTopbar from './AppTopbar.vue';
import AppFooter from './AppFooter.vue';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';

const { t } = useI18n();
</script>

<template>
  <div class="layout-wrapper">
    <AppTopbar />
    <main class="layout-content">
      <Toast position="top-right" :breakpoints="{ '640px': { width: '92vw', right: '4vw', left: '4vw' } }" />
      <ConfirmDialog :breakpoints="{ '640px': '92vw' }" :accept-label="t('confirm.accept')" :reject-label="t('confirm.reject')" />
      <router-view />
    </main>
    <AppFooter />
  </div>
</template>

<style>
/* Small screens: tighter page padding, wrapping stat bars and toolbars */
@media (max-width: 768px) {
  .layout-content { padding: 1rem 0.85rem !important; }
  .page-header h2 { font-size: 1.1rem !important; }
  .stat-bar { flex-wrap: wrap; gap: 0.6rem 1.1rem !important; padding: 0.75rem 0.9rem !important; }
  .ss-card { padding: 0.9rem !important; }
  .p-datatable .p-datatable-thead > tr > th,
  .p-datatable .p-datatable-tbody > tr > td { padding: 0.55rem 0.6rem !important; }
  .p-stepper .p-steplist { overflow-x: auto; }
  .p-step-title { white-space: nowrap; }
}
</style>
