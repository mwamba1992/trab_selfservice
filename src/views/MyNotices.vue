<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import QRCode from 'qrcode';
import BillDocument from '@/components/bills/BillDocument.vue';
import ResubmitDialog from '@/components/ResubmitDialog.vue';
import { SelfServiceNotices as NoticeService, SelfServiceBills as BillingService } from '@/service/SelfServiceApi.js';
import { printElement } from '@/utils/print.js';
import { useLabels } from '@/composables/useLabels.js';
import { usePagedList } from '@/composables/usePagedList.js';
import { apiErrorMessage } from '@/utils/format.js';
import { filingState, returnedFilings } from '@/utils/filingStatus.js';
import { daysSince } from '@/utils/validators.js';

const { t } = useI18n();
const toast = useToast();
const { statusLabel } = useLabels();

const {
  rows: notices,
  total,
  loading,
  search,
  rowsPerPage,
  first,
  stats,
  onPage,
  onSearch,
  refresh,
} = usePagedList(NoticeService.getAll, {
  errorKey: 'notices.loadFailed',
  statsKey: 'notices',
  statsDefault: { total: 0, paid: 0, pending: 0, valid: 0 },
});

const viewVisible = ref(false);
const viewData = ref(null);
const openingId = ref(null);

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

const returned = computed(() => returnedFilings(notices.value));

// The bill for a notice, printable from this list so the appellant can pay at a bank.
const billVisible = ref(false);
const billData = ref(null);
const billQr = ref('');
const billDocument = ref(null);

const openBill = async (notice) => {
  if (!notice.billId && !notice.bill?.id) return;
  openingId.value = notice.id;
  try {
    const full = await BillingService.getById(notice.billId || notice.bill.id);
    billData.value = full;
    billQr.value = full.billControlNumber ? await QRCode.toDataURL(full.billControlNumber, { width: 120, margin: 1 }) : '';
    billVisible.value = true;
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('common.actionFailed')), life: 4000 });
  } finally {
    openingId.value = null;
  }
};

const printBill = () => printElement(billDocument.value?.$el, `Bill - ${billData.value?.billReference || ''}`);

// Correcting what the registry sent back.
const correctVisible = ref(false);
const correctData = ref(null);
const openCorrect = (notice) => {
  correctData.value = notice;
  correctVisible.value = true;
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
      <div class="stat-item">
        <div class="stat-dot bg-[#3B82F6]"></div>
        {{ statusLabel('VALID') }}: <strong>{{ stats.valid }}</strong>
      </div>
    </div>

    <div v-if="returned.length" class="returned-banner" role="alert">
      <i class="pi pi-exclamation-circle"></i>
      <div>
        <strong>{{
          returned.length === 1 ? t('filingStatus.returnedBannerOne') : t('filingStatus.returnedBannerMany', { count: returned.length })
        }}</strong>
        <ul>
          <li v-for="r in returned" :key="r.id">
            {{ r.appellantName }}<template v-if="r.returnReason"> — {{ t('filingStatus.reason') }}: {{ r.returnReason }}</template>
          </li>
        </ul>
      </div>
    </div>

    <div class="ss-card mb-3">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <InputText
          v-model="search"
          :placeholder="t('notices.searchPlaceholder')"
          :aria-label="t('common.search')"
          class="search-input"
          @input="onSearch"
        />
        <router-link to="/notices/new" class="primary-link-btn"><i class="pi pi-plus"></i> {{ t('notices.fileNew') }}</router-link>
      </div>
    </div>

    <div class="ss-card">
      <DataTable
        :value="notices"
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
        <Column :header="t('fields.noticeNo')">
          <template #body="{ data }">
            <span v-if="data.noticeNo" class="font-semibold">{{ data.noticeNo }}</span>
            <span v-else class="awaiting">{{ t('notices.awaitingPayment') }}</span>
          </template>
        </Column>
        <Column field="loggedAt" :header="t('notices.dateLodged')" />
        <Column field="appellantName" :header="t('fields.appellant')" />
        <Column :header="t('filingStatus.label')">
          <template #body="{ data }">
            <Tag :value="t(filingState(data).key)" :severity="filingState(data).severity" />
            <p v-if="data.filingStatus === 'RETURNED' && data.returnReason" class="reason">{{ data.returnReason }}</p>
          </template>
        </Column>
        <Column :header="t('fields.payment')">
          <template #body="{ data }"
            ><Tag :value="statusLabel(data.paymentStatus || 'UNPAID')" :severity="paymentSeverity(data.paymentStatus)"
          /></template>
        </Column>
        <Column :header="t('fields.validity')">
          <template #body="{ data }"
            ><Tag :value="statusLabel(isValid(data) ? 'VALID' : 'EXPIRED')" :severity="isValid(data) ? 'success' : 'danger'"
          /></template>
        </Column>
        <Column :header="t('common.actions')" class="w-40">
          <template #body="{ data }">
            <div class="flex gap-1 items-center">
              <Button
                v-tooltip.top="t('notices.viewDetails')"
                icon="pi pi-eye"
                text
                rounded
                size="small"
                :loading="openingId === data.id"
                :aria-label="t('notices.viewDetails')"
                @click="openView(data)"
              />
              <Button
                v-if="data.filingStatus === 'RETURNED'"
                v-tooltip.top="t('filingStatus.correctTitle')"
                icon="pi pi-pencil"
                text
                rounded
                size="small"
                severity="danger"
                :aria-label="t('filingStatus.correctTitle')"
                @click="openCorrect(data)"
              />
              <Button
                v-if="data.billId || data.bill"
                v-tooltip.top="t('notices.printBill')"
                icon="pi pi-print"
                text
                rounded
                size="small"
                :aria-label="t('notices.printBill')"
                @click="openBill(data)"
              />
              <Button
                v-if="data.paymentStatus !== 'PAID'"
                v-tooltip.top="t('notices.payBill')"
                icon="pi pi-wallet"
                text
                rounded
                size="small"
                severity="warn"
                :aria-label="t('notices.payBill')"
                @click="$router.push('/bills')"
              />
              <Button
                v-if="data.paymentStatus === 'PAID' && isValid(data) && data.noticeNo"
                v-tooltip.top="t('notices.fileStatement')"
                icon="pi pi-file-edit"
                text
                rounded
                size="small"
                severity="success"
                :aria-label="t('notices.fileStatement')"
                @click="$router.push({ path: '/appeals/file', query: { noticeNo: data.noticeNo } })"
              />
            </div>
          </template>
        </Column>
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-file"></i>
            <p>{{ t('notices.empty') }}</p>
            <router-link to="/notices/new">{{ t('notices.fileFirst') }}</router-link>
          </div>
        </template>
      </DataTable>
    </div>

    <Dialog
      v-model:visible="viewVisible"
      :header="t('notices.detailsTitle')"
      modal
      :style="{ width: '520px' }"
      :breakpoints="{ '640px': '95vw' }"
    >
      <div v-if="viewData" class="view-grid">
        <div class="view-row">
          <span class="view-label">{{ t('fields.noticeNo') }}</span>
          <span class="view-value"
            ><strong v-if="viewData.noticeNo">{{ viewData.noticeNo }}</strong
            ><span v-else class="awaiting">{{ t('notices.awaitingPayment') }}</span></span
          >
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('notices.dateLodged') }}</span
          ><span class="view-value">{{ viewData.loggedAt }}</span>
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('fields.appellant') }}</span
          ><span class="view-value">{{ viewData.appellantName }}</span>
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('fields.phone') }}</span
          ><span class="view-value">{{ viewData.phone || t('common.dash') }}</span>
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('notices.decisionDate') }}</span
          ><span class="view-value">{{ viewData.dateOfTaxationDecision }}</span>
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('notices.serviceDate') }}</span
          ><span class="view-value">{{ viewData.dateOfServiceDecision }}</span>
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('fields.payment') }}</span>
          <span class="view-value"
            ><Tag :value="statusLabel(viewData.paymentStatus || 'UNPAID')" :severity="paymentSeverity(viewData.paymentStatus)"
          /></span>
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('fields.validity') }}</span>
          <span class="view-value"
            ><Tag :value="statusLabel(isValid(viewData) ? 'VALID' : 'EXPIRED')" :severity="isValid(viewData) ? 'success' : 'danger'"
          /></span>
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('filingStatus.label') }}</span>
          <span class="view-value"><Tag :value="t(filingState(viewData).key)" :severity="filingState(viewData).severity" /></span>
        </div>
        <div v-if="viewData.returnReason" class="view-row">
          <span class="view-label">{{ t('filingStatus.reason') }}</span>
          <span class="view-value">{{ viewData.returnReason }}</span>
        </div>
        <div v-if="viewData.bill" class="view-row">
          <span class="view-label">{{ t('fields.controlNumber') }}</span>
          <span class="view-value">{{ viewData.bill?.billControlNumber || t('bills.pendingControl') }}</span>
        </div>
      </div>
      <template #footer><Button :label="t('common.close')" outlined @click="viewVisible = false" /></template>
    </Dialog>

    <Dialog
      v-model:visible="billVisible"
      :header="t('bills.title')"
      modal
      :style="{ width: '650px' }"
      :breakpoints="{ '768px': '96vw' }"
      :content-style="{ maxHeight: '80vh', overflowY: 'auto' }"
    >
      <BillDocument v-if="billData" ref="billDocument" :bill="billData" :qr-data-url="billQr" />
      <template #footer>
        <Button :label="t('common.close')" text @click="billVisible = false" />
        <Button :label="t('common.print')" icon="pi pi-print" class="trab-btn" @click="printBill" />
      </template>
    </Dialog>

    <ResubmitDialog v-model:visible="correctVisible" kind="notice" :record="correctData" :api="NoticeService" @resubmitted="refresh" />
  </div>
</template>

<style scoped>
.returned-banner {
  display: flex;
  gap: 0.7rem;
  align-items: flex-start;
  padding: 0.85rem 1rem;
  margin-bottom: 0.75rem;
  border: 1px solid #fecaca;
  border-left: 4px solid #dc2626;
  border-radius: 10px;
  background: #fef2f2;
  color: #991b1b;
  font-size: 0.875rem;
}
.returned-banner ul {
  margin: 0.3rem 0 0;
  padding-left: 1.1rem;
}
.reason {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: #991b1b;
}
</style>
