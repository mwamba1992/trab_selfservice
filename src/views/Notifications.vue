<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import Paginator from 'primevue/paginator';
import SelectButton from 'primevue/selectbutton';
import { SelfServiceNotifications } from '@/service/SelfServiceApi.js';
import { profileStore } from '@/stores/profile.js';
import { apiErrorMessage, formatDateTime } from '@/utils/format.js';

const { t, te, locale } = useI18n();
const toast = useToast();
const router = useRouter();

const items = ref([]);
const total = ref(0);
const loading = ref(false);
const failed = ref(false);
const first = ref(0);
const pageSize = ref(10);
const filter = ref('all');
const markingAll = ref(false);

const filterOptions = [
  { value: 'all', key: 'notifications.all' },
  { value: 'unread', key: 'notifications.unread' },
];

const ICONS = {
  NOTICE_FILED: 'pi pi-file',
  APPEAL_FILED: 'pi pi-briefcase',
  APPLICATION_FILED: 'pi pi-inbox',
  PAYMENT_RECEIVED: 'pi pi-wallet',
  SUMMONS_ISSUED: 'pi pi-calendar',
  SUMMONS_SERVED: 'pi pi-calendar-plus',
  DECISION_DELIVERED: 'pi pi-verified',
};

const load = async (page = 1) => {
  loading.value = true;
  failed.value = false;
  try {
    const result = await SelfServiceNotifications.getAll(page, pageSize.value, filter.value === 'unread');
    items.value = result.items || [];
    total.value = result.total ?? items.value.length;
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  load(1);
  profileStore.refreshUnread();
});

const onFilter = () => {
  first.value = 0;
  load(1);
};

const onPage = (event) => {
  first.value = event.first;
  pageSize.value = event.rows;
  load(event.page + 1);
};

/** Renders in the current language from type + params; falls back to the stored English text. */
const render = (item) => {
  const base = `notifications.types.${item.type}`;
  if (!te(`${base}.title`)) return { title: item.title, message: item.message };
  const params = Object.fromEntries(Object.entries(item.params || {}).map(([k, v]) => [k, v ?? t('common.dash')]));
  let messageKey = `${base}.message`;
  if (item.type === 'PAYMENT_RECEIVED' && item.params?.caseNo) messageKey = `${base}.messageWithCase`;
  if (item.type === 'SUMMONS_ISSUED' && item.params?.time) messageKey = `${base}.messageWithTime`;
  return { title: t(`${base}.title`), message: t(messageKey, params) };
};

const open = async (item) => {
  if (!item.readAt) {
    try {
      await SelfServiceNotifications.markRead(item.id);
      item.readAt = new Date().toISOString();
      profileStore.setUnread(profileStore.state.unreadCount - 1);
    } catch { /* still navigate */ }
  }
  if (item.link) router.push(item.link);
};

const markAllRead = async () => {
  markingAll.value = true;
  try {
    await SelfServiceNotifications.markAllRead();
    profileStore.setUnread(0);
    toast.add({ severity: 'success', summary: t('common.success'), detail: t('notifications.markedAll'), life: 3000 });
    first.value = 0;
    await load(1);
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('common.actionFailed')), life: 4000 });
  } finally {
    markingAll.value = false;
  }
};
</script>

<template>
  <div>
    <div class="page-header">
      <h2>{{ t('notifications.title') }}</h2>
      <p>{{ t('notifications.subtitle') }}</p>
    </div>

    <div class="ss-card mb-3">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <SelectButton v-model="filter" :options="filterOptions" option-value="value" :allow-empty="false" @change="onFilter">
          <template #option="{ option }">{{ t(option.key) }}</template>
        </SelectButton>
        <Button :label="t('notifications.markAllRead')" icon="pi pi-check-square" size="small" outlined :loading="markingAll" :disabled="profileStore.state.unreadCount === 0" @click="markAllRead" />
      </div>
    </div>

    <div class="ss-card">
      <div v-if="failed" class="state-box" role="alert">
        <i class="pi pi-exclamation-triangle" style="color:#dc2626"></i>
        <p>{{ t('notifications.loadFailed') }}</p>
        <Button :label="t('common.retry')" size="small" outlined @click="load(first / pageSize + 1)" />
      </div>

      <div v-else-if="loading && !items.length" class="state-box"><i class="pi pi-spin pi-spinner"></i></div>

      <div v-else-if="!items.length" class="state-box">
        <i class="pi pi-bell" style="color:#cbd5e1;font-size:1.8rem"></i>
        <p>{{ filter === 'unread' ? t('notifications.emptyUnread') : t('notifications.empty') }}</p>
      </div>

      <ul v-else class="notification-list" :class="{ dimmed: loading }">
        <li v-for="item in items" :key="item.id">
          <button type="button" class="notification" :class="{ unread: !item.readAt }" @click="open(item)">
            <span class="n-icon"><i :class="ICONS[item.type] || 'pi pi-info-circle'"></i></span>
            <span class="n-body">
              <span class="n-title">{{ render(item).title }}</span>
              <span class="n-message">{{ render(item).message }}</span>
              <span class="n-time">{{ formatDateTime(item.createdAt, locale) }}</span>
            </span>
            <span v-if="!item.readAt" class="n-dot" :aria-label="t('notifications.unread')"></span>
          </button>
        </li>
      </ul>

      <Paginator v-if="total > pageSize" :first="first" :rows="pageSize" :total-records="total" :rows-per-page-options="[10, 25, 50]" @page="onPage" />
    </div>
  </div>
</template>

<style scoped>
.state-box { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 2.5rem 1rem; color: #94a3b8; font-size: 0.86rem; text-align: center; }
.notification-list { list-style: none; margin: 0; padding: 0; }
.notification-list.dimmed { opacity: 0.6; }
.notification-list li + li { border-top: 1px solid #f1f5f9; }
.notification {
  width: 100%; display: flex; align-items: flex-start; gap: 0.8rem;
  padding: 0.9rem 0.5rem; background: none; border: none; text-align: left;
  cursor: pointer; font-family: inherit; border-radius: 8px;
}
.notification:hover, .notification:focus-visible { background: #f8faf9; }
.n-icon {
  width: 2.2rem; height: 2.2rem; border-radius: 10px; flex-shrink: 0;
  background: rgba(27,107,61,0.08); color: var(--trab-primary);
  display: inline-flex; align-items: center; justify-content: center;
}
.n-body { flex: 1; min-width: 0; }
.n-title { display: block; font-size: 0.86rem; font-weight: 500; color: #1E293B; }
.unread .n-title { font-weight: 700; }
.n-message { display: block; font-size: 0.8rem; color: #475569; margin-top: 0.15rem; line-height: 1.45; }
.n-time { display: block; font-size: 0.72rem; color: #94a3b8; margin-top: 0.3rem; }
.n-dot { width: 0.55rem; height: 0.55rem; border-radius: 50%; background: #3B82F6; margin-top: 0.4rem; flex-shrink: 0; }
</style>
