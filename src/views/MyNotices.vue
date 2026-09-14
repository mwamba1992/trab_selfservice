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
import { SelfServiceNotices as NoticeService, SelfServiceStats } from '@/service/SelfServiceApi.js';
import { useLabels } from '@/composables/useLabels.js';
import { apiErrorMessage } from '@/utils/format.js';
import { daysSince } from '@/utils/validators.js';

const { t } = useI18n();
const toast = useToast();
const { statusLabel } = useLabels();

const notices = ref([]);
const total = ref(0);
const loading = ref(false);
const searchText = ref('');
const pageSize = ref(10);
const first = ref(0);
const viewVisible = ref(false);
const viewData = ref(null);
const openingId = ref(null);

const docsVisible = ref(false);
const docsNotice = ref(null);

// Stat bar comes from a server aggregate so it reflects ALL records, not just
// the loaded page (lazy pagination only fetches one page at a time).
const stats = ref({ total: 0, paid: 0, pending: 0, valid: 0 });

const loadData = async (page = 1) => {
  loading.value = true;
  try {
    const result = await NoticeService.getAll(page, pageSize.value, searchText.value.trim());
    notices.value = result.items || [];
    total.value = result.total ?? notices.value.length;
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('notices.loadFailed')), life: 4000 });
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try { stats.value = (await SelfServiceStats.get()).notices; } catch { /* stat bar is non-critical */ }
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

const openView = async (notice) => {
  openingId.value = notice.id;
  try {
    viewData.value = await NoticeService.getById(notice.id);
    viewVisible.value = true;
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('notices.loadFailed')), life: 4000 });
  } finally {
    openingId.value = null;
  }
};

const openDocuments = (notice) => {
  docsNotice.value = notice;
  docsVisible.value = true;
};

// Mirrors the backend rule: a notice supports an appeal for 45 days unless exempted
const isValid = (notice) => notice.isExempted || (daysSince(notice.loggedAt) ?? 0) <= 45;
const paymentSeverity = (status) => (status === 'PAID' ? 'success' : 'warn');
</script>

<template>
  <div>
    <div class="page-header">
      <h2>{{ t('notices.title') }}</h2>
      <p>{{ t('notices.subtitle') }}</p>
    </div>

    <div class="stat-bar">
      <div class="stat-item"><div class="stat-dot" style="background:#1B6B3D"></div> {{ t('common.total') }}: <strong>{{ stats.total }}</strong></div>
      <div class="stat-item"><div class="stat-dot" style="background:#10B981"></div> {{ t('common.paid') }}: <strong>{{ stats.paid }}</strong></div>
      <div class="stat-item"><div class="stat-dot" style="background:#F59E0B"></div> {{ t('common.pending') }}: <strong>{{ stats.pending }}</strong></div>
      <div class="stat-item"><div class="stat-dot" style="background:#3B82F6"></div> {{ statusLabel('VALID') }}: <strong>{{ stats.valid }}</strong></div>
    </div>

    <div class="ss-card mb-3">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <InputText v-model="searchText" :placeholder="t('notices.searchPlaceholder')" :aria-label="t('common.search')" class="search-input" @input="onSearch" />
        <router-link to="/notices/new" class="file-btn"><i class="pi pi-plus"></i> {{ t('notices.fileNew') }}</router-link>
      </div>
    </div>

    <div class="ss-card">
      <DataTable :value="notices" :loading="loading" lazy paginator :rows="pageSize" :first="first" :total-records="total" :rows-per-page-options="[10, 25, 50]" data-key="id" @page="onPage">
        <Column :header="t('common.sn')" style="width:3.5rem"><template #body="{ index }">{{ first + index + 1 }}</template></Column>
        <Column :header="t('fields.noticeNo')">
          <template #body="{ data }">
            <span v-if="data.noticeNo" class="font-semibold">{{ data.noticeNo }}</span>
            <span v-else class="awaiting">{{ t('notices.awaitingPayment') }}</span>
          </template>
        </Column>
        <Column field="loggedAt" :header="t('notices.dateLodged')" />
        <Column field="appellantName" :header="t('fields.appellant')" />
        <Column :header="t('fields.payment')">
          <template #body="{ data }"><Tag :value="statusLabel(data.paymentStatus || 'UNPAID')" :severity="paymentSeverity(data.paymentStatus)" /></template>
        </Column>
        <Column :header="t('fields.validity')">
          <template #body="{ data }"><Tag :value="statusLabel(isValid(data) ? 'VALID' : 'EXPIRED')" :severity="isValid(data) ? 'success' : 'danger'" /></template>
        </Column>
        <Column :header="t('common.actions')" style="width:10rem">
          <template #body="{ data }">
            <div class="flex gap-1 items-center">
              <Button icon="pi pi-eye" text rounded size="small" :loading="openingId === data.id" :aria-label="t('notices.viewDetails')" v-tooltip.top="t('notices.viewDetails')" @click="openView(data)" />
              <Button icon="pi pi-paperclip" text rounded size="small" :aria-label="t('notices.documents')" v-tooltip.top="t('notices.documents')" @click="openDocuments(data)" />
              <Button v-if="data.paymentStatus !== 'PAID'" icon="pi pi-wallet" text rounded size="small" severity="warn" :aria-label="t('notices.payBill')" v-tooltip.top="t('notices.payBill')" @click="$router.push('/bills')" />
              <Button
                v-if="data.paymentStatus === 'PAID' && isValid(data) && data.noticeNo"
                icon="pi pi-file-edit" text rounded size="small" severity="success"
                :aria-label="t('notices.fileStatement')" v-tooltip.top="t('notices.fileStatement')"
                @click="$router.push({ path: '/appeals/file', query: { noticeNo: data.noticeNo } })"
              />
            </div>
          </template>
        </Column>
        <template #empty>
          <div class="text-center py-8">
            <i class="pi pi-file text-3xl" style="color:#cbd5e1"></i>
            <p class="text-sm mt-2" style="color:#94a3b8">{{ t('notices.empty') }}</p>
            <router-link to="/notices/new" class="text-sm font-semibold" style="color:var(--trab-primary)">{{ t('notices.fileFirst') }}</router-link>
          </div>
        </template>
      </DataTable>
    </div>

    <Dialog v-model:visible="viewVisible" :header="t('notices.detailsTitle')" modal :style="{ width: '520px' }" :breakpoints="{ '640px': '95vw' }">
      <div v-if="viewData" class="view-grid">
        <div class="view-row"><span class="view-label">{{ t('fields.noticeNo') }}</span><span class="view-value"><strong v-if="viewData.noticeNo">{{ viewData.noticeNo }}</strong><span v-else class="awaiting">{{ t('notices.awaitingPayment') }}</span></span></div>
        <div class="view-row"><span class="view-label">{{ t('notices.dateLodged') }}</span><span class="view-value">{{ viewData.loggedAt }}</span></div>
        <div class="view-row"><span class="view-label">{{ t('fields.appellant') }}</span><span class="view-value">{{ viewData.appellantName }}</span></div>
        <div class="view-row"><span class="view-label">{{ t('fields.phone') }}</span><span class="view-value">{{ viewData.phone || t('common.dash') }}</span></div>
        <div class="view-row"><span class="view-label">{{ t('notices.decisionDate') }}</span><span class="view-value">{{ viewData.dateOfTaxationDecision }}</span></div>
        <div class="view-row"><span class="view-label">{{ t('notices.serviceDate') }}</span><span class="view-value">{{ viewData.dateOfServiceDecision }}</span></div>
        <div class="view-row"><span class="view-label">{{ t('fields.payment') }}</span><span class="view-value"><Tag :value="statusLabel(viewData.paymentStatus || 'UNPAID')" :severity="paymentSeverity(viewData.paymentStatus)" /></span></div>
        <div class="view-row"><span class="view-label">{{ t('fields.validity') }}</span><span class="view-value"><Tag :value="statusLabel(isValid(viewData) ? 'VALID' : 'EXPIRED')" :severity="isValid(viewData) ? 'success' : 'danger'" /></span></div>
        <div v-if="viewData.bill" class="view-row"><span class="view-label">{{ t('fields.controlNumber') }}</span><span class="view-value">{{ viewData.bill?.billControlNumber || t('bills.pendingControl') }}</span></div>
      </div>
      <template #footer><Button :label="t('common.close')" outlined @click="viewVisible = false" /></template>
    </Dialog>

    <DocumentsDialog
      v-model:visible="docsVisible"
      :api="NoticeService"
      :source-id="docsNotice?.id"
      :reference="docsNotice?.noticeNo || docsNotice?.appellantName || ''"
    />
  </div>
</template>

<style scoped>
.search-input { width: 320px; max-width: 100%; font-size: 0.82rem !important; border-radius: 8px !important; }
.awaiting { color: #B45309; font-weight: 600; font-size: 0.8rem; }
.file-btn {
  background: var(--trab-primary); color: #fff; padding: 0.55rem 1.15rem; border-radius: 8px; text-decoration: none;
  font-size: 0.82rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.4rem; transition: background 0.15s;
}
.file-btn:hover { background: var(--trab-primary-hover); }
.view-grid { display: flex; flex-direction: column; }
.view-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.6rem 0; border-bottom: 1px solid #f8f9fa; font-size: 0.84rem; }
.view-row:last-child { border-bottom: none; }
.view-label { color: #64748B; }
.view-value { color: #1E293B; font-weight: 500; text-align: right; }
</style>
