<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import InputText from 'primevue/inputtext';
import { SelfServiceSummons, SelfServiceStats } from '@/service/SelfServiceApi.js';
import { useLabels } from '@/composables/useLabels.js';
import { apiErrorMessage } from '@/utils/format.js';

const { t } = useI18n();
const toast = useToast();
const { statusLabel } = useLabels();

const rows = ref([]);
const total = ref(0);
const loading = ref(false);
const searchText = ref('');
const pageSize = ref(10);
const first = ref(0);

// Stat bar comes from a server aggregate so it reflects ALL records, not just
// the loaded page (lazy pagination only fetches one page at a time).
const stats = ref({ total: 0, served: 0, pending: 0 });

const loadData = async (page = 1) => {
  loading.value = true;
  try {
    const result = await SelfServiceSummons.getAll(page, pageSize.value, searchText.value.trim());
    rows.value = result.items || [];
    total.value = result.total ?? rows.value.length;
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('summons.loadFailed')), life: 4000 });
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try { stats.value = (await SelfServiceStats.get()).summons; } catch { /* stat bar is non-critical */ }
};

const onPage = (event) => {
  first.value = event.first;
  pageSize.value = event.rows;
  loadData(event.page + 1);
};

let searchTimer = null;
const onSearch = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { first.value = 0; loadData(1); }, 350);
};

onMounted(() => { loadData(1); loadStats(); });

const severity = (s) => (s === 'SERVED' ? 'success' : s === 'CONCLUDED' ? 'secondary' : 'warn');
</script>

<template>
  <div>
    <div class="page-header">
      <h2>{{ t('summons.title') }}</h2>
      <p>{{ t('summons.subtitle') }}</p>
    </div>

    <div class="stat-bar">
      <div class="stat-item"><div class="stat-dot" style="background:#1B6B3D"></div> {{ t('common.total') }}: <strong>{{ stats.total }}</strong></div>
      <div class="stat-item"><div class="stat-dot" style="background:#10B981"></div> {{ t('summons.served') }}: <strong>{{ stats.served }}</strong></div>
      <div class="stat-item"><div class="stat-dot" style="background:#F59E0B"></div> {{ t('common.pending') }}: <strong>{{ stats.pending }}</strong></div>
    </div>

    <div class="ss-card mb-3">
      <InputText v-model="searchText" :placeholder="t('summons.searchPlaceholder')" :aria-label="t('common.search')" class="search-input" @input="onSearch" />
    </div>

    <div class="ss-card">
      <DataTable :value="rows" :loading="loading" lazy paginator :rows="pageSize" :first="first" :total-records="total" :rows-per-page-options="[10, 25, 50]" data-key="summonsAppealId" @page="onPage">
        <Column :header="t('common.sn')" style="width:3.5rem"><template #body="{ index }">{{ first + index + 1 }}</template></Column>
        <Column :header="t('fields.appealNo')"><template #body="{ data }">{{ data.appealNo || t('common.dash') }}</template></Column>
        <Column :header="t('summons.hearingDate')">
          <template #body="{ data }">{{ data.summons?.startDate }}<span v-if="data.summons?.time" style="color:#94a3b8"> · {{ data.summons.time }}</span></template>
        </Column>
        <Column :header="t('summons.venue')"><template #body="{ data }">{{ data.summons?.venue || t('common.dash') }}</template></Column>
        <Column :header="t('summons.panel')"><template #body="{ data }">{{ data.summons?.judge?.name || t('common.dash') }}</template></Column>
        <Column :header="t('common.status')"><template #body="{ data }"><Tag :value="statusLabel(data.summons?.status)" :severity="severity(data.summons?.status)" /></template></Column>
        <template #empty>
          <div class="text-center py-8">
            <i class="pi pi-calendar text-3xl" style="color:#cbd5e1"></i>
            <p class="text-sm mt-2" style="color:#94a3b8">{{ t('summons.empty') }}</p>
          </div>
        </template>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
.search-input { width: 320px; max-width: 100%; font-size: 0.82rem; border-radius: 8px; }
</style>
