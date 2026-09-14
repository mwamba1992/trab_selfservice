<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import { SelfServiceDecisions, SelfServiceStats } from '@/service/SelfServiceApi.js';
import api from '@/service/Api.js';
import { apiErrorMessage } from '@/utils/format.js';

const { t } = useI18n();
const toast = useToast();

const rows = ref([]);
const total = ref(0);
const loading = ref(false);
const searchText = ref('');
const pageSize = ref(10);
const first = ref(0);
const viewVisible = ref(false);
const viewData = ref(null);

// Stat bar comes from a server aggregate so it reflects ALL records, not just
// the loaded page (lazy pagination only fetches one page at a time).
const stats = ref({ total: 0, wonByAppellant: 0, wonByTra: 0 });

const loadData = async (page = 1) => {
  loading.value = true;
  try {
    const result = await SelfServiceDecisions.getAll(page, pageSize.value, searchText.value.trim());
    rows.value = result.items || [];
    total.value = result.total ?? rows.value.length;
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('decisions.loadFailed')), life: 4000 });
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try { stats.value = (await SelfServiceStats.get()).decisions; } catch { /* stat bar is non-critical */ }
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

const openView = (row) => { viewData.value = row; viewVisible.value = true; };

const downloadingJudgement = ref(false);
const downloadJudgement = async () => {
  const filename = viewData.value?.judgementFile;
  if (!filename) return;
  downloadingJudgement.value = true;
  try {
    // Authenticated fetch — a plain link can't carry the Bearer token
    const res = await api.get(`/uploads/${filename}`, { responseType: 'blob', timeout: 120000 });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `Judgement_${viewData.value.appealNo || 'decision'}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('decisions.downloadFailed')), life: 4000 });
  } finally {
    downloadingJudgement.value = false;
  }
};

const wonSeverity = (w) => (/appellant/i.test(w || '') ? 'success' : /tra|commissioner|respondent/i.test(w || '') ? 'danger' : 'secondary');
</script>

<template>
  <div>
    <div class="page-header">
      <h2>{{ t('decisions.title') }}</h2>
      <p>{{ t('decisions.subtitle') }}</p>
    </div>

    <div class="stat-bar">
      <div class="stat-item"><div class="stat-dot" style="background:#1B6B3D"></div> {{ t('common.total') }}: <strong>{{ stats.total }}</strong></div>
      <div class="stat-item"><div class="stat-dot" style="background:#10B981"></div> {{ t('decisions.wonByYou') }}: <strong>{{ stats.wonByAppellant }}</strong></div>
      <div class="stat-item"><div class="stat-dot" style="background:#EF4444"></div> {{ t('decisions.wonByTra') }}: <strong>{{ stats.wonByTra }}</strong></div>
    </div>

    <div class="ss-card mb-3">
      <InputText v-model="searchText" :placeholder="t('decisions.searchPlaceholder')" :aria-label="t('common.search')" class="search-input" @input="onSearch" />
    </div>

    <div class="ss-card">
      <DataTable :value="rows" :loading="loading" lazy paginator :rows="pageSize" :first="first" :total-records="total" :rows-per-page-options="[10, 25, 50]" data-key="id" @page="onPage">
        <Column :header="t('common.sn')" style="width:3.5rem"><template #body="{ index }">{{ first + index + 1 }}</template></Column>
        <Column :header="t('fields.appealNo')"><template #body="{ data }">{{ data.appealNo || t('common.dash') }}</template></Column>
        <Column :header="t('fields.taxType')"><template #body="{ data }">{{ data.taxType?.name || t('common.dash') }}</template></Column>
        <Column :header="t('decisions.decided')"><template #body="{ data }">{{ data.decidedDate || t('common.dash') }}</template></Column>
        <Column :header="t('decisions.outcome')"><template #body="{ data }"><Tag :value="data.outcomeOfDecision" severity="info" /></template></Column>
        <Column :header="t('decisions.wonBy')"><template #body="{ data }"><Tag v-if="data.wonBy" :value="data.wonBy" :severity="wonSeverity(data.wonBy)" /><span v-else>{{ t('common.dash') }}</span></template></Column>
        <Column :header="t('common.actions')" style="width:6rem">
          <template #body="{ data }">
            <Button icon="pi pi-eye" text rounded size="small" :aria-label="t('decisions.viewDecision')" v-tooltip.top="t('decisions.viewDecision')" @click="openView(data)" />
          </template>
        </Column>
        <template #empty>
          <div class="text-center py-8">
            <i class="pi pi-verified text-3xl" style="color:#cbd5e1"></i>
            <p class="text-sm mt-2" style="color:#94a3b8">{{ t('decisions.empty') }}</p>
          </div>
        </template>
      </DataTable>
    </div>

    <Dialog v-model:visible="viewVisible" :header="t('decisions.dialogTitle')" modal :style="{ width: '620px' }" :breakpoints="{ '768px': '95vw' }" :content-style="{ maxHeight: '80vh', overflowY: 'auto' }">
      <div v-if="viewData">
        <div class="section-title">{{ t('decisions.summarySection') }}</div>
        <table>
          <tr><td class="label">{{ t('decisions.appealNumber') }}</td><td><strong>{{ viewData.appealNo || t('common.dash') }}</strong></td></tr>
          <tr><td class="label">{{ t('fields.taxType') }}</td><td>{{ viewData.taxType?.name || t('common.dash') }}</td></tr>
          <tr><td class="label">{{ t('decisions.decidedOn') }}</td><td>{{ viewData.decidedDate || t('common.dash') }}</td></tr>
          <tr><td class="label">{{ t('decisions.decidedBy') }}</td><td>{{ viewData.decidedBy || t('common.dash') }}</td></tr>
          <tr><td class="label">{{ t('decisions.outcome') }}</td><td><strong>{{ viewData.outcomeOfDecision }}</strong></td></tr>
          <tr><td class="label">{{ t('decisions.wonBy') }}</td><td>{{ viewData.wonBy || t('common.dash') }}</td></tr>
        </table>

        <div class="section-title">{{ t('decisions.decreeSection') }}</div>
        <p class="decree">{{ viewData.summaryOfDecree || t('decisions.noSummary') }}</p>

        <div v-if="viewData.judgementFile" style="margin-top:16px">
          <button type="button" class="dl-link" :disabled="downloadingJudgement" @click="downloadJudgement">
            <i :class="downloadingJudgement ? 'pi pi-spin pi-spinner' : 'pi pi-file-pdf'"></i> {{ t('decisions.downloadJudgement') }}
          </button>
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.close')" text @click="viewVisible = false" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.search-input { width: 320px; max-width: 100%; font-size: 0.82rem; border-radius: 8px; }
.section-title { font-size: 11px; font-weight: 700; color: #1B365D; text-transform: uppercase; border-bottom: 2px solid #1B365D; padding-bottom: 4px; margin: 14px 0 8px; }
table { width: 100%; border-collapse: collapse; }
td { padding: 5px 8px; font-size: 13px; vertical-align: top; }
.label { color: #666; width: 160px; }
.decree { font-size: 0.85rem; line-height: 1.6; color: #334155; white-space: pre-wrap; }
.dl-link { display: inline-flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 600; color: #1B6B3D; padding: 8px 14px; border: 1px solid #1B6B3D; border-radius: 8px; background: none; cursor: pointer; font-family: inherit; }
.dl-link:hover:not(:disabled) { background: rgba(27,107,61,0.06); }
.dl-link:disabled { opacity: 0.6; cursor: default; }
</style>
