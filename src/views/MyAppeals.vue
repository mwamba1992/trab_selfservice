<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import DocumentsDialog from '@/components/DocumentsDialog.vue';
import { SelfServiceAppeals as AppealService, SelfServiceStats } from '@/service/SelfServiceApi.js';
import { useLabels } from '@/composables/useLabels.js';
import { apiErrorMessage } from '@/utils/format.js';

const { t } = useI18n();
const toast = useToast();
const { statusLabel } = useLabels();

const appeals = ref([]);
const total = ref(0);
const loading = ref(false);
const searchText = ref('');
const pageSize = ref(10);
const first = ref(0);
const viewVisible = ref(false);
const viewData = ref(null);
const viewParties = ref({ appellants: [], respondents: [] });
const openingId = ref(null);

const docsVisible = ref(false);
const docsAppeal = ref(null);

// Stat bar comes from a server aggregate so it reflects ALL records, not just
// the loaded page (lazy pagination only fetches one page at a time).
const stats = ref({ total: 0, decided: 0, pending: 0 });

const loadData = async (page = 1) => {
  loading.value = true;
  try {
    const result = await AppealService.getAll(page, pageSize.value, searchText.value.trim());
    appeals.value = result.items || [];
    total.value = result.total ?? appeals.value.length;
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('appeals.loadFailed')), life: 4000 });
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try { stats.value = (await SelfServiceStats.get()).appeals; } catch { /* stat bar is non-critical */ }
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

const openView = async (appeal) => {
  openingId.value = appeal.id;
  try {
    const [details, parties] = await Promise.all([
      AppealService.getById(appeal.id),
      AppealService.getParties(appeal.id).catch(() => ({ appellants: [], respondents: [] })),
    ]);
    viewData.value = details;
    viewParties.value = parties;
    viewVisible.value = true;
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('appeals.loadFailed')), life: 4000 });
  } finally {
    openingId.value = null;
  }
};

const openDocuments = (appeal) => {
  docsAppeal.value = appeal;
  docsVisible.value = true;
};

const statusSeverity = (s) => ({ NEW: 'info', HEARING_SCHEDULED: 'warn', CONCLUDED: 'secondary', DECIDED: 'success' }[s] || 'info');
</script>

<template>
  <div>
    <div class="page-header">
      <h2>{{ t('appeals.title') }}</h2>
      <p>{{ t('appeals.subtitle') }}</p>
    </div>

    <div class="stat-bar">
      <div class="stat-item"><div class="stat-dot" style="background:#1B6B3D"></div> {{ t('common.total') }}: <strong>{{ stats.total }}</strong></div>
      <div class="stat-item"><div class="stat-dot" style="background:#10B981"></div> {{ t('appeals.decided') }}: <strong>{{ stats.decided }}</strong></div>
      <div class="stat-item"><div class="stat-dot" style="background:#F59E0B"></div> {{ t('common.pending') }}: <strong>{{ stats.pending }}</strong></div>
    </div>

    <div class="ss-card mb-3">
      <InputText v-model="searchText" :placeholder="t('appeals.searchPlaceholder')" :aria-label="t('common.search')" class="search-input" @input="onSearch" />
    </div>

    <div class="ss-card">
      <DataTable :value="appeals" :loading="loading" lazy paginator :rows="pageSize" :first="first" :total-records="total" :rows-per-page-options="[10, 25, 50]" data-key="id" @page="onPage">
        <Column :header="t('common.sn')" style="width:3.5rem"><template #body="{ index }">{{ first + index + 1 }}</template></Column>
        <Column :header="t('fields.appealNo')">
          <template #body="{ data }">
            <span v-if="data.appealNo" class="font-semibold">{{ data.appealNo }}</span>
            <span v-else class="awaiting">{{ t('notices.awaitingPayment') }}</span>
          </template>
        </Column>
        <Column field="dateOfFiling" :header="t('appeals.dateFiled')" />
        <Column field="appellantName" :header="t('fields.appellant')" />
        <Column :header="t('fields.taxType')"><template #body="{ data }">{{ data.taxType?.name || t('common.dash') }}</template></Column>
        <Column :header="t('common.status')"><template #body="{ data }"><Tag :value="statusLabel(data.statusTrend)" :severity="statusSeverity(data.statusTrend)" /></template></Column>
        <Column :header="t('fields.payment')"><template #body="{ data }"><Tag :value="statusLabel(data.paymentStatus || 'UNPAID')" :severity="data.paymentStatus === 'PAID' ? 'success' : 'warn'" /></template></Column>
        <Column :header="t('common.actions')" style="width:7rem">
          <template #body="{ data }">
            <div class="flex gap-1">
              <Button icon="pi pi-eye" text rounded size="small" :loading="openingId === data.id" :aria-label="t('common.view')" v-tooltip.top="t('common.view')" @click="openView(data)" />
              <Button icon="pi pi-paperclip" text rounded size="small" :aria-label="t('appeals.documents')" v-tooltip.top="t('appeals.documents')" @click="openDocuments(data)" />
            </div>
          </template>
        </Column>
        <template #empty>
          <div class="text-center py-8">
            <i class="pi pi-briefcase text-3xl" style="color:#cbd5e1"></i>
            <p class="text-sm mt-2" style="color:#94a3b8">{{ t('appeals.empty') }}</p>
          </div>
        </template>
      </DataTable>
    </div>

    <Dialog v-model:visible="viewVisible" :header="t('appeals.detailsTitle')" modal :style="{ width: '560px' }" :breakpoints="{ '640px': '95vw' }">
      <div v-if="viewData" class="view-grid">
        <div class="view-row"><span class="view-label">{{ t('fields.appealNo') }}</span><span class="view-value"><strong>{{ viewData.appealNo || t('notices.awaitingPayment') }}</strong></span></div>
        <div class="view-row"><span class="view-label">{{ t('appeals.dateFiled') }}</span><span class="view-value">{{ viewData.dateOfFiling }}</span></div>
        <div class="view-row"><span class="view-label">{{ t('fields.appellant') }}</span><span class="view-value">{{ viewData.appellantName }}</span></div>
        <div class="view-row"><span class="view-label">{{ t('fields.taxType') }}</span><span class="view-value">{{ viewData.taxType?.name || t('common.dash') }}</span></div>
        <div class="view-row"><span class="view-label">{{ t('common.status') }}</span><span class="view-value"><Tag :value="statusLabel(viewData.statusTrend)" :severity="statusSeverity(viewData.statusTrend)" /></span></div>
        <div class="view-row"><span class="view-label">{{ t('appeals.outcome') }}</span><span class="view-value">{{ viewData.outcomeOfDecision || t('common.dash') }}</span></div>

        <div v-if="viewParties.appellants.length || viewParties.respondents.length" class="parties">
          <div v-if="viewParties.appellants.length" class="mb-3">
            <p class="parties-title">{{ t('fields.appellants') }}</p>
            <div v-for="a in viewParties.appellants" :key="a.id" class="party-row">
              <span>{{ a.appellant?.firstName }} {{ a.appellant?.lastName || '' }}</span>
              <Tag :value="statusLabel(a.role)" severity="info" />
            </div>
          </div>
          <div v-if="viewParties.respondents.length">
            <p class="parties-title">{{ t('fields.respondents') }}</p>
            <div v-for="r in viewParties.respondents" :key="r.id" class="party-row">
              <span>{{ r.respondent?.name }}</span>
              <Tag v-if="r.respondent?.isDefault" :value="statusLabel('DEFAULT')" severity="success" />
            </div>
          </div>
        </div>

        <template v-if="viewData.decidedDate">
          <div class="view-row"><span class="view-label">{{ t('appeals.decisionDate') }}</span><span class="view-value">{{ viewData.decidedDate }}</span></div>
          <div class="view-row"><span class="view-label">{{ t('appeals.wonBy') }}</span><span class="view-value"><Tag :value="viewData.wonBy || t('common.dash')" :severity="/appellant/i.test(viewData.wonBy || '') ? 'success' : 'danger'" /></span></div>
        </template>
        <div v-if="viewData.summaryOfDecree" class="summary">
          <strong style="color:#475569">{{ t('appeals.summary') }}:</strong>
          <p class="mt-1" style="color:#1E293B;margin:0">{{ viewData.summaryOfDecree }}</p>
        </div>
      </div>
      <template #footer><Button :label="t('common.close')" outlined @click="viewVisible = false" /></template>
    </Dialog>

    <DocumentsDialog
      v-model:visible="docsVisible"
      :api="AppealService"
      :source-id="docsAppeal?.id"
      :reference="docsAppeal?.appealNo || docsAppeal?.appellantName || ''"
    />
  </div>
</template>

<style scoped>
.search-input { width: 320px; max-width: 100%; font-size: 0.82rem; border-radius: 8px; }
.awaiting { color: #B45309; font-weight: 600; font-size: 0.8rem; }
.view-grid { display: flex; flex-direction: column; }
.view-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.6rem 0; border-bottom: 1px solid #f8f9fa; font-size: 0.84rem; }
.view-row:last-child { border-bottom: none; }
.view-label { color: #64748B; }
.view-value { color: #1E293B; font-weight: 500; text-align: right; }
.parties { margin-top: 0.75rem; padding: 0.75rem; background: #f8faf9; border-radius: 8px; }
.parties-title { font-size: 0.72rem; font-weight: 600; color: #475569; margin-bottom: 0.4rem; text-transform: uppercase; }
.party-row { font-size: 0.82rem; padding: 0.3rem 0; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
.summary { margin-top: 0.75rem; padding: 0.75rem; background: #f8faf9; border-radius: 8px; font-size: 0.82rem; }
</style>
