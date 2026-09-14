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
import { SelfServiceApplications as ApplicationService, SelfServiceStats } from '@/service/SelfServiceApi.js';
import { useLabels } from '@/composables/useLabels.js';
import { apiErrorMessage } from '@/utils/format.js';

const { t } = useI18n();
const toast = useToast();
const { statusLabel, applicationTypeLabel } = useLabels();

const applications = ref([]);
const total = ref(0);
const loading = ref(false);
const searchText = ref('');
const pageSize = ref(10);
const first = ref(0);
const stats = ref({ total: 0, paid: 0, pending: 0 });

const viewVisible = ref(false);
const viewData = ref(null);
const openingId = ref(null);

const docsVisible = ref(false);
const docsApplication = ref(null);

const loadData = async (page = 1) => {
  loading.value = true;
  try {
    const result = await ApplicationService.getAll(page, pageSize.value, searchText.value.trim());
    applications.value = result.items || [];
    total.value = result.total ?? applications.value.length;
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('applications.loadFailed')), life: 4000 });
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try { stats.value = (await SelfServiceStats.get()).applications || stats.value; } catch { /* stat bar is non-critical */ }
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

const openView = async (application) => {
  openingId.value = application.id;
  try {
    viewData.value = await ApplicationService.getById(application.id);
    viewVisible.value = true;
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('applications.loadFailed')), life: 4000 });
  } finally {
    openingId.value = null;
  }
};

const openDocuments = (application) => {
  docsApplication.value = application;
  docsVisible.value = true;
};

const reference = (a) => a?.applicationNo || a?.controlNumber || a?.applicantName || '';
</script>

<template>
  <div>
    <div class="page-header">
      <h2>{{ t('applications.title') }}</h2>
      <p>{{ t('applications.subtitle') }}</p>
    </div>

    <div class="stat-bar">
      <div class="stat-item"><div class="stat-dot" style="background:#1B6B3D"></div> {{ t('common.total') }}: <strong>{{ stats.total }}</strong></div>
      <div class="stat-item"><div class="stat-dot" style="background:#10B981"></div> {{ t('common.paid') }}: <strong>{{ stats.paid }}</strong></div>
      <div class="stat-item"><div class="stat-dot" style="background:#F59E0B"></div> {{ t('common.pending') }}: <strong>{{ stats.pending }}</strong></div>
    </div>

    <div class="ss-card mb-3">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <InputText v-model="searchText" :placeholder="t('applications.searchPlaceholder')" :aria-label="t('common.search')" class="search-input" @input="onSearch" />
        <router-link to="/applications/new" class="file-btn"><i class="pi pi-plus"></i> {{ t('applications.fileNew') }}</router-link>
      </div>
    </div>

    <div class="ss-card">
      <DataTable :value="applications" :loading="loading" lazy paginator :rows="pageSize" :first="first" :total-records="total" :rows-per-page-options="[10, 25, 50]" data-key="id" @page="onPage">
        <Column :header="t('common.sn')" style="width:3.5rem"><template #body="{ index }">{{ first + index + 1 }}</template></Column>
        <Column :header="t('fields.applicationNo')">
          <template #body="{ data }">
            <span v-if="data.applicationNo" class="font-semibold">{{ data.applicationNo }}</span>
            <span v-else class="awaiting">{{ t('applications.awaitingPayment') }}</span>
          </template>
        </Column>
        <Column field="dateOfFiling" :header="t('applications.dateFiled')" />
        <Column field="applicantName" :header="t('applications.applicant')" />
        <Column :header="t('applications.applicationType')"><template #body="{ data }">{{ applicationTypeLabel(data.applicationType) }}</template></Column>
        <Column :header="t('applications.relatedAppeal')"><template #body="{ data }">{{ data.appeal?.appealNo || t('common.dash') }}</template></Column>
        <Column :header="t('fields.payment')">
          <template #body="{ data }"><Tag :value="statusLabel(data.paymentStatus || 'UNPAID')" :severity="data.paymentStatus === 'PAID' ? 'success' : 'warn'" /></template>
        </Column>
        <Column :header="t('common.actions')" style="width:9rem">
          <template #body="{ data }">
            <div class="flex gap-1">
              <Button icon="pi pi-eye" text rounded size="small" :loading="openingId === data.id" :aria-label="t('common.view')" v-tooltip.top="t('common.view')" @click="openView(data)" />
              <Button icon="pi pi-paperclip" text rounded size="small" :aria-label="t('applications.documents')" v-tooltip.top="t('applications.documents')" @click="openDocuments(data)" />
              <Button v-if="data.paymentStatus !== 'PAID'" icon="pi pi-wallet" text rounded size="small" severity="warn" :aria-label="t('nav.bills')" v-tooltip.top="t('nav.bills')" @click="$router.push('/bills')" />
            </div>
          </template>
        </Column>
        <template #empty>
          <div class="text-center py-8">
            <i class="pi pi-inbox text-3xl" style="color:#cbd5e1"></i>
            <p class="text-sm mt-2" style="color:#94a3b8">{{ t('applications.empty') }}</p>
            <router-link to="/applications/new" class="text-sm font-semibold" style="color:var(--trab-primary)">{{ t('applications.fileFirst') }}</router-link>
          </div>
        </template>
      </DataTable>
    </div>

    <Dialog v-model:visible="viewVisible" :header="t('applications.detailsTitle')" modal :style="{ width: '560px' }" :breakpoints="{ '640px': '95vw' }">
      <div v-if="viewData" class="view-grid">
        <div class="view-row"><span class="view-label">{{ t('fields.applicationNo') }}</span><span class="view-value"><strong v-if="viewData.applicationNo">{{ viewData.applicationNo }}</strong><span v-else class="awaiting">{{ t('applications.awaitingPayment') }}</span></span></div>
        <div class="view-row"><span class="view-label">{{ t('applications.dateFiled') }}</span><span class="view-value">{{ viewData.dateOfFiling }}</span></div>
        <div class="view-row"><span class="view-label">{{ t('applications.applicant') }}</span><span class="view-value">{{ viewData.applicantName }}</span></div>
        <div class="view-row"><span class="view-label">{{ t('applications.applicationType') }}</span><span class="view-value">{{ applicationTypeLabel(viewData.applicationType) }}</span></div>
        <div class="view-row"><span class="view-label">{{ t('applications.relatedAppeal') }}</span><span class="view-value">{{ viewData.appeal?.appealNo || t('common.dash') }}</span></div>
        <div class="view-row"><span class="view-label">{{ t('fields.region') }}</span><span class="view-value">{{ viewData.region?.name || t('common.dash') }}</span></div>
        <div class="view-row"><span class="view-label">{{ t('fields.taxType') }}</span><span class="view-value">{{ viewData.taxType?.name || t('common.dash') }}</span></div>
        <div class="view-row"><span class="view-label">{{ t('fields.controlNumber') }}</span><span class="view-value">{{ viewData.controlNumber || t('bills.pendingControl') }}</span></div>
        <div class="view-row"><span class="view-label">{{ t('fields.payment') }}</span><span class="view-value"><Tag :value="statusLabel(viewData.paymentStatus || 'UNPAID')" :severity="viewData.paymentStatus === 'PAID' ? 'success' : 'warn'" /></span></div>
        <div v-if="viewData.natureOfApplication" class="nature">
          <strong style="color:#475569">{{ t('applications.nature') }}:</strong>
          <p class="mt-1" style="margin:0;white-space:pre-wrap">{{ viewData.natureOfApplication }}</p>
        </div>
      </div>
      <template #footer><Button :label="t('common.close')" outlined @click="viewVisible = false" /></template>
    </Dialog>

    <DocumentsDialog v-model:visible="docsVisible" :api="ApplicationService" :source-id="docsApplication?.id" :reference="reference(docsApplication)" />
  </div>
</template>

<style scoped>
.search-input { width: 360px; max-width: 100%; font-size: 0.82rem; border-radius: 8px; }
.awaiting { color: #B45309; font-weight: 600; font-size: 0.8rem; }
.file-btn {
  background: var(--trab-primary); color: #fff; padding: 0.55rem 1.15rem; border-radius: 8px; text-decoration: none;
  font-size: 0.82rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.4rem;
}
.file-btn:hover { background: var(--trab-primary-hover); }
.view-grid { display: flex; flex-direction: column; }
.view-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.6rem 0; border-bottom: 1px solid #f8f9fa; font-size: 0.84rem; }
.view-label { color: #64748B; }
.view-value { color: #1E293B; font-weight: 500; text-align: right; }
.nature { margin-top: 0.75rem; padding: 0.75rem; background: #f8faf9; border-radius: 8px; font-size: 0.82rem; color: #1E293B; }
</style>
