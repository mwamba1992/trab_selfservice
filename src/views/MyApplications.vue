<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import DocumentsDialog from '@/components/DocumentsDialog.vue';
import { SelfServiceApplications as ApplicationService } from '@/service/SelfServiceApi.js';
import { useLabels } from '@/composables/useLabels.js';
import { usePagedList } from '@/composables/usePagedList.js';
import { apiErrorMessage } from '@/utils/format.js';

const { t } = useI18n();
const toast = useToast();
const { statusLabel, applicationTypeLabel } = useLabels();

const {
  rows: applications,
  total,
  loading,
  search,
  rowsPerPage,
  first,
  stats,
  onPage,
  onSearch,
} = usePagedList(ApplicationService.getAll, {
  errorKey: 'applications.loadFailed',
  statsKey: 'applications',
  statsDefault: { total: 0, paid: 0, pending: 0 },
});

const viewVisible = ref(false);
const viewData = ref(null);
const openingId = ref(null);
const docsVisible = ref(false);
const docsApplication = ref(null);

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
const paymentTag = (a) => ({ value: statusLabel(a.paymentStatus || 'UNPAID'), severity: a.paymentStatus === 'PAID' ? 'success' : 'warn' });
</script>

<template>
  <div>
    <div class="page-header">
      <h2>{{ t('applications.title') }}</h2>
      <p>{{ t('applications.subtitle') }}</p>
    </div>

    <div class="stat-bar">
      <div class="stat-item">
        <div class="stat-dot bg-[#1B6B3D]"></div>
        {{ t('common.total') }}: <strong>{{ stats.total }}</strong>
      </div>
      <div class="stat-item">
        <div class="stat-dot bg-[#10B981]"></div>
        {{ t('common.paid') }}: <strong>{{ stats.paid }}</strong>
      </div>
      <div class="stat-item">
        <div class="stat-dot bg-[#F59E0B]"></div>
        {{ t('common.pending') }}: <strong>{{ stats.pending }}</strong>
      </div>
    </div>

    <div class="ss-card mb-3">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <InputText
          v-model="search"
          :placeholder="t('applications.searchPlaceholder')"
          :aria-label="t('common.search')"
          class="search-input"
          @input="onSearch"
        />
        <router-link to="/applications/new" class="primary-link-btn"
          ><i class="pi pi-plus"></i> {{ t('applications.fileNew') }}</router-link
        >
      </div>
    </div>

    <div class="ss-card">
      <DataTable
        :value="applications"
        :loading="loading"
        lazy
        paginator
        :rows="rowsPerPage"
        :first="first"
        :total-records="total"
        :rows-per-page-options="[10, 25, 50]"
        data-key="id"
        @page="onPage"
      >
        <Column :header="t('common.sn')" class="w-14"
          ><template #body="{ index }">{{ first + index + 1 }}</template></Column
        >
        <Column :header="t('fields.applicationNo')">
          <template #body="{ data }">
            <span v-if="data.applicationNo" class="font-semibold">{{ data.applicationNo }}</span>
            <span v-else class="awaiting">{{ t('applications.awaitingPayment') }}</span>
          </template>
        </Column>
        <Column field="dateOfFiling" :header="t('applications.dateFiled')" />
        <Column field="applicantName" :header="t('applications.applicant')" />
        <Column :header="t('applications.applicationType')"
          ><template #body="{ data }">{{ applicationTypeLabel(data.applicationType) }}</template></Column
        >
        <Column :header="t('applications.relatedAppeal')"
          ><template #body="{ data }">{{ data.appeal?.appealNo || t('common.dash') }}</template></Column
        >
        <Column :header="t('fields.payment')"
          ><template #body="{ data }"><Tag v-bind="paymentTag(data)" /></template
        ></Column>
        <Column :header="t('common.actions')" class="w-36">
          <template #body="{ data }">
            <div class="flex gap-1">
              <Button
                v-tooltip.top="t('common.view')"
                icon="pi pi-eye"
                text
                rounded
                size="small"
                :loading="openingId === data.id"
                :aria-label="t('common.view')"
                @click="openView(data)"
              />
              <Button
                v-tooltip.top="t('applications.documents')"
                icon="pi pi-paperclip"
                text
                rounded
                size="small"
                :aria-label="t('applications.documents')"
                @click="openDocuments(data)"
              />
              <Button
                v-if="data.paymentStatus !== 'PAID'"
                v-tooltip.top="t('nav.bills')"
                icon="pi pi-wallet"
                text
                rounded
                size="small"
                severity="warn"
                :aria-label="t('nav.bills')"
                @click="$router.push('/bills')"
              />
            </div>
          </template>
        </Column>
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-inbox"></i>
            <p>{{ t('applications.empty') }}</p>
            <router-link to="/applications/new">{{ t('applications.fileFirst') }}</router-link>
          </div>
        </template>
      </DataTable>
    </div>

    <Dialog
      v-model:visible="viewVisible"
      :header="t('applications.detailsTitle')"
      modal
      :style="{ width: '560px' }"
      :breakpoints="{ '640px': '95vw' }"
    >
      <div v-if="viewData" class="view-grid">
        <div class="view-row">
          <span class="view-label">{{ t('fields.applicationNo') }}</span>
          <span class="view-value"
            ><strong v-if="viewData.applicationNo">{{ viewData.applicationNo }}</strong
            ><span v-else class="awaiting">{{ t('applications.awaitingPayment') }}</span></span
          >
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('applications.dateFiled') }}</span
          ><span class="view-value">{{ viewData.dateOfFiling }}</span>
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('applications.applicant') }}</span
          ><span class="view-value">{{ viewData.applicantName }}</span>
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('applications.applicationType') }}</span
          ><span class="view-value">{{ applicationTypeLabel(viewData.applicationType) }}</span>
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('applications.relatedAppeal') }}</span
          ><span class="view-value">{{ viewData.appeal?.appealNo || t('common.dash') }}</span>
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('fields.region') }}</span
          ><span class="view-value">{{ viewData.region?.name || t('common.dash') }}</span>
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('fields.taxType') }}</span
          ><span class="view-value">{{ viewData.taxType?.name || t('common.dash') }}</span>
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('fields.controlNumber') }}</span
          ><span class="view-value">{{ viewData.controlNumber || t('bills.pendingControl') }}</span>
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('fields.payment') }}</span
          ><span class="view-value"><Tag v-bind="paymentTag(viewData)" /></span>
        </div>
        <div v-if="viewData.natureOfApplication" class="soft-panel">
          <strong class="text-label">{{ t('applications.nature') }}:</strong>
          <p class="mt-1 mb-0 whitespace-pre-wrap">{{ viewData.natureOfApplication }}</p>
        </div>
      </div>
      <template #footer><Button :label="t('common.close')" outlined @click="viewVisible = false" /></template>
    </Dialog>

    <DocumentsDialog
      v-model:visible="docsVisible"
      :api="ApplicationService"
      :source-id="docsApplication?.id"
      :reference="reference(docsApplication)"
    />
  </div>
</template>
