<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
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
import ReceiptDocument from '@/components/bills/ReceiptDocument.vue';
import { SelfServiceBills as BillingService } from '@/service/SelfServiceApi.js';
import { profileStore } from '@/stores/profile.js';
import { useLabels } from '@/composables/useLabels.js';
import { usePagedList } from '@/composables/usePagedList.js';
import { apiErrorMessage, formatMoney, formatTime } from '@/utils/format.js';
import { printElement } from '@/utils/print.js';

const STATUS_POLL_MS = 20000;

const { t, locale } = useI18n();
const toast = useToast();
const { statusLabel } = useLabels();

const {
  rows: bills,
  total,
  loading,
  search,
  rowsPerPage,
  first,
  stats,
  loadStats,
  onPage,
  onSearch,
} = usePagedList(BillingService.getAll, {
  errorKey: 'bills.loadFailed',
  statsKey: 'bills',
  statsDefault: { total: 0, paid: 0, unpaid: 0, totalAmt: 0 },
});

const viewVisible = ref(false);
const viewData = ref(null);
const receiptVisible = ref(false);
const receiptData = ref(null);
const openingId = ref(null);
const qrDataUrl = ref('');
const billDocument = ref(null);
const receiptDocument = ref(null);

const refreshQr = async (bill) => {
  qrDataUrl.value = bill?.billControlNumber ? await QRCode.toDataURL(bill.billControlNumber, { width: 120, margin: 1 }) : '';
};

const withBill = async (bill, onLoaded) => {
  openingId.value = bill.id;
  try {
    await onLoaded(await BillingService.getById(bill.id));
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('common.actionFailed')), life: 4000 });
  } finally {
    openingId.value = null;
  }
};

const openView = (bill) =>
  withBill(bill, async (full) => {
    viewData.value = full;
    await refreshQr(full);
    lastChecked.value = new Date();
    viewVisible.value = true;
  });

const openReceipt = (bill) =>
  withBill(bill, (full) => {
    receiptData.value = full;
    receiptVisible.value = true;
  });

const print = (componentRef, title) => {
  printElement(componentRef.value?.$el, title);
};

// ─── Payment status refresh ───
const checkingId = ref(null);
const lastChecked = ref(null);
let pollTimer = null;

const stopPolling = () => {
  clearInterval(pollTimer);
  pollTimer = null;
};

const applyStatus = (status) => {
  const row = bills.value.find((b) => b.id === status.id);
  if (row) Object.assign(row, status);
  if (viewData.value?.id === status.id) Object.assign(viewData.value, status);
};

const checkStatus = async (bill, { silent = false } = {}) => {
  const wasPaid = bill.billPaid;
  const hadControlNumber = !!bill.billControlNumber;
  checkingId.value = bill.id;
  try {
    const status = await BillingService.getStatus(bill.id);
    applyStatus(status);
    lastChecked.value = new Date();
    if (!hadControlNumber && status.billControlNumber && viewData.value?.id === status.id) await refreshQr(viewData.value);

    if (status.billPaid && !wasPaid) {
      toast.add({
        severity: 'success',
        summary: t('common.success'),
        detail: t('bills.statusPaid', { controlNumber: status.billControlNumber }),
        life: 6000,
      });
      stopPolling();
      loadStats();
      profileStore.refreshUnread();
    } else if (!silent) {
      toast.add(
        status.billPaid
          ? {
              severity: 'success',
              summary: statusLabel('PAID'),
              detail: t('bills.statusPaid', { controlNumber: status.billControlNumber }),
              life: 4000,
            }
          : { severity: 'info', summary: statusLabel('UNPAID'), detail: t('bills.statusUnpaid'), life: 4000 },
      );
    }
  } catch (err) {
    if (!silent)
      toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('bills.statusFailed')), life: 4000 });
  } finally {
    checkingId.value = null;
  }
};

// While an unpaid bill is open, check for payment automatically
watch(viewVisible, (open) => {
  stopPolling();
  if (open && viewData.value && !viewData.value.billPaid) {
    pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible' && viewData.value) checkStatus(viewData.value, { silent: true });
    }, STATUS_POLL_MS);
  }
});

onBeforeUnmount(stopPolling);
</script>

<template>
  <div>
    <div class="page-header">
      <h2>{{ t('bills.title') }}</h2>
      <p>{{ t('bills.subtitle') }}</p>
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
        {{ t('common.unpaid') }}: <strong>{{ stats.unpaid }}</strong>
      </div>
      <div class="stat-item">
        <div class="stat-dot bg-[#8B5CF6]"></div>
        {{ t('bills.totalAmount') }}: <strong>TSh {{ formatMoney(stats.totalAmt, locale) }}</strong>
      </div>
    </div>

    <div class="ss-card mb-3">
      <InputText
        v-model="search"
        :placeholder="t('bills.searchPlaceholder')"
        :aria-label="t('common.search')"
        class="search-input"
        @input="onSearch"
      />
    </div>

    <div class="ss-card">
      <DataTable
        :value="bills"
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
        <Column field="billReference" :header="t('fields.reference')" />
        <Column :header="t('fields.type')"
          ><template #body="{ data }">{{ statusLabel(data.appType) }}</template></Column
        >
        <Column :header="t('fields.amount')"
          ><template #body="{ data }">TSh {{ formatMoney(data.billedAmount, locale) }}</template></Column
        >
        <Column field="generatedDate" :header="t('fields.date')" />
        <Column :header="t('fields.controlNumber')"
          ><template #body="{ data }">{{ data.billControlNumber || t('bills.pendingControl') }}</template></Column
        >
        <Column :header="t('common.status')">
          <template #body="{ data }"
            ><Tag :value="statusLabel(data.billPaid ? 'PAID' : 'UNPAID')" :severity="data.billPaid ? 'success' : 'warn'"
          /></template>
        </Column>
        <Column :header="t('common.actions')" class="w-40">
          <template #body="{ data }">
            <div class="flex gap-1">
              <Button
                v-tooltip.top="t('bills.invoice')"
                icon="pi pi-file"
                text
                rounded
                size="small"
                :loading="openingId === data.id"
                :aria-label="t('bills.invoice')"
                @click="openView(data)"
              />
              <Button
                v-if="!data.billPaid"
                v-tooltip.top="t('bills.checkStatus')"
                icon="pi pi-sync"
                text
                rounded
                size="small"
                severity="info"
                :loading="checkingId === data.id"
                :aria-label="t('bills.checkStatus')"
                @click="checkStatus(data)"
              />
              <Button
                v-if="data.billPaid"
                v-tooltip.top="t('bills.receipt')"
                icon="pi pi-receipt"
                text
                rounded
                size="small"
                severity="success"
                :aria-label="t('bills.receipt')"
                @click="openReceipt(data)"
              />
            </div>
          </template>
        </Column>
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-wallet"></i>
            <p>{{ t('bills.empty') }}</p>
          </div>
        </template>
      </DataTable>
    </div>

    <Dialog
      v-model:visible="viewVisible"
      :header="t('bills.preview')"
      modal
      :style="{ width: '700px' }"
      :breakpoints="{ '768px': '96vw' }"
      :content-style="{ maxHeight: '80vh', overflowY: 'auto' }"
    >
      <div v-if="viewData && !viewData.billPaid" class="note note-info">
        <i class="pi pi-sync"></i>
        <span class="flex-1">{{
          lastChecked ? t('bills.lastChecked', { time: formatTime(lastChecked, locale) }) : t('bills.checkStatus')
        }}</span>
        <Button
          :label="t('bills.checkStatus')"
          icon="pi pi-refresh"
          size="small"
          text
          :loading="checkingId === viewData.id"
          @click="checkStatus(viewData)"
        />
      </div>
      <BillDocument v-if="viewData" ref="billDocument" :bill="viewData" :qr-data-url="qrDataUrl" />
      <template #footer>
        <Button :label="t('common.close')" text @click="viewVisible = false" />
        <Button
          :label="t('common.print')"
          icon="pi pi-print"
          class="trab-btn"
          @click="print(billDocument, `Bill - ${viewData?.billReference}`)"
        />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="receiptVisible"
      :header="t('bills.receipt')"
      modal
      :style="{ width: '650px' }"
      :breakpoints="{ '768px': '96vw' }"
      :content-style="{ maxHeight: '80vh', overflowY: 'auto' }"
    >
      <ReceiptDocument v-if="receiptData" ref="receiptDocument" :bill="receiptData" />
      <template #footer>
        <Button :label="t('common.close')" text @click="receiptVisible = false" />
        <Button
          :label="t('common.print')"
          icon="pi pi-print"
          class="trab-btn"
          @click="print(receiptDocument, `Receipt - ${receiptData?.billReference}`)"
        />
      </template>
    </Dialog>
  </div>
</template>
