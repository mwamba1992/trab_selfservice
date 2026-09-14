<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import QRCode from 'qrcode';
import { SelfServiceBills as BillingService, SelfServiceStats } from '@/service/SelfServiceApi.js';
import { profileStore } from '@/stores/profile.js';
import { useLabels } from '@/composables/useLabels.js';
import { apiErrorMessage, formatMoney, formatTime } from '@/utils/format.js';

const { t, locale } = useI18n();
const toast = useToast();
const { statusLabel } = useLabels();

const STATUS_POLL_MS = 20000;

const bills = ref([]);
const total = ref(0);
const loading = ref(false);
const searchText = ref('');
const pageSize = ref(10);
const first = ref(0);
const viewVisible = ref(false);
const viewData = ref(null);
const receiptVisible = ref(false);
const receiptData = ref(null);
const openingId = ref(null);
const qrDataUrl = ref('');

// Stat bar comes from a server aggregate so it reflects ALL records, not just
// the loaded page (lazy pagination only fetches one page at a time).
const stats = ref({ total: 0, paid: 0, unpaid: 0, totalAmt: 0 });

const fmt = (value) => formatMoney(value, locale.value);

const loadData = async (page = 1) => {
  loading.value = true;
  try {
    const result = await BillingService.getAll(page, pageSize.value, searchText.value.trim());
    bills.value = result.items || [];
    total.value = result.total ?? bills.value.length;
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('bills.loadFailed')), life: 4000 });
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try { stats.value = (await SelfServiceStats.get()).bills; } catch { /* stat bar is non-critical */ }
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

const refreshQr = async (bill) => {
  qrDataUrl.value = bill?.billControlNumber ? await QRCode.toDataURL(bill.billControlNumber, { width: 120, margin: 1 }) : '';
};

const openView = async (bill) => {
  openingId.value = bill.id;
  try {
    viewData.value = await BillingService.getById(bill.id);
    await refreshQr(viewData.value);
    lastChecked.value = new Date();
    viewVisible.value = true;
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('common.actionFailed')), life: 4000 });
  } finally {
    openingId.value = null;
  }
};

const openReceipt = async (bill) => {
  openingId.value = bill.id;
  try {
    receiptData.value = await BillingService.getById(bill.id);
    receiptVisible.value = true;
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('common.actionFailed')), life: 4000 });
  } finally {
    openingId.value = null;
  }
};

// ─── Payment status refresh ───
const checkingId = ref(null);
const lastChecked = ref(null);
let pollTimer = null;

const applyStatus = (status) => {
  const row = bills.value.find((b) => b.id === status.id);
  if (row) Object.assign(row, status);
  if (viewData.value?.id === status.id) Object.assign(viewData.value, status);
};

const stopPolling = () => {
  clearInterval(pollTimer);
  pollTimer = null;
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
      toast.add({ severity: 'success', summary: t('common.success'), detail: t('bills.statusPaid', { controlNumber: status.billControlNumber }), life: 6000 });
      stopPolling();
      loadStats();
      profileStore.refreshUnread();
    } else if (!silent) {
      toast.add(status.billPaid
        ? { severity: 'success', summary: statusLabel('PAID'), detail: t('bills.statusPaid', { controlNumber: status.billControlNumber }), life: 4000 }
        : { severity: 'info', summary: statusLabel('UNPAID'), detail: t('bills.statusUnpaid'), life: 4000 });
    }
  } catch (err) {
    if (!silent) toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('bills.statusFailed')), life: 4000 });
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

const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (num === 0) return 'Zero';
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
  if (num < 1000000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
  return numberToWords(Math.floor(num / 1000000)) + ' Million' + (num % 1000000 ? ' ' + numberToWords(num % 1000000) : '');
};

const PRINT_STYLES = `
  body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 700px; margin: 0 auto; }
  .section-title { font-size: 11px; font-weight: 700; color: #1B365D; text-transform: uppercase; border-bottom: 2px solid #1B365D; padding-bottom: 4px; margin: 14px 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 4px 8px; font-size: 13px; vertical-align: top; }
  .label { color: #666; width: 180px; }
  .items th { background: #f8f9fa; text-align: left; padding: 6px 8px; font-size: 12px; border-bottom: 2px solid #ddd; }
  .items td { padding: 6px 8px; font-size: 13px; border-bottom: 1px solid #eee; }
  .total-row { background: #f0fdf4; }
  .total-row td { border-top: 2px solid #1B365D; font-weight: 700; }
  .pay-box { border: 1px solid #ddd; border-radius: 4px; padding: 12px; font-size: 12px; }
  .pay-box h4 { margin: 0 0 8px; font-size: 13px; }
  @media print { body { padding: 0; } }
`;

const printArea = (elementId, title) => {
  const el = document.getElementById(elementId);
  if (!el) return;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<html><head><title>${title}</title><style>${PRINT_STYLES}</style></head><body>${el.innerHTML}</body></html>`);
  win.document.close();
  win.print();
};
</script>

<template>
  <div>
    <div class="page-header">
      <h2>{{ t('bills.title') }}</h2>
      <p>{{ t('bills.subtitle') }}</p>
    </div>

    <div class="stat-bar">
      <div class="stat-item"><div class="stat-dot" style="background:#1B6B3D"></div> {{ t('common.total') }}: <strong>{{ stats.total }}</strong></div>
      <div class="stat-item"><div class="stat-dot" style="background:#10B981"></div> {{ t('common.paid') }}: <strong>{{ stats.paid }}</strong></div>
      <div class="stat-item"><div class="stat-dot" style="background:#F59E0B"></div> {{ t('common.unpaid') }}: <strong>{{ stats.unpaid }}</strong></div>
      <div class="stat-item"><div class="stat-dot" style="background:#8B5CF6"></div> {{ t('bills.totalAmount') }}: <strong>TSh {{ fmt(stats.totalAmt) }}</strong></div>
    </div>

    <div class="ss-card mb-3">
      <InputText v-model="searchText" :placeholder="t('bills.searchPlaceholder')" :aria-label="t('common.search')" class="search-input" @input="onSearch" />
    </div>

    <div class="ss-card">
      <DataTable :value="bills" :loading="loading" lazy paginator :rows="pageSize" :first="first" :total-records="total" :rows-per-page-options="[10, 25, 50]" data-key="id" @page="onPage">
        <Column :header="t('common.sn')" style="width:3.5rem"><template #body="{ index }">{{ first + index + 1 }}</template></Column>
        <Column field="billReference" :header="t('fields.reference')" />
        <Column :header="t('fields.type')"><template #body="{ data }">{{ statusLabel(data.appType) }}</template></Column>
        <Column :header="t('fields.amount')"><template #body="{ data }">TSh {{ fmt(data.billedAmount) }}</template></Column>
        <Column field="generatedDate" :header="t('fields.date')" />
        <Column :header="t('fields.controlNumber')"><template #body="{ data }">{{ data.billControlNumber || t('bills.pendingControl') }}</template></Column>
        <Column :header="t('common.status')"><template #body="{ data }"><Tag :value="statusLabel(data.billPaid ? 'PAID' : 'UNPAID')" :severity="data.billPaid ? 'success' : 'warn'" /></template></Column>
        <Column :header="t('common.actions')" style="width:10rem">
          <template #body="{ data }">
            <div class="flex gap-1">
              <Button icon="pi pi-file" text rounded size="small" :loading="openingId === data.id" :aria-label="t('bills.invoice')" v-tooltip.top="t('bills.invoice')" @click="openView(data)" />
              <Button v-if="!data.billPaid" icon="pi pi-sync" text rounded size="small" severity="info" :loading="checkingId === data.id" :aria-label="t('bills.checkStatus')" v-tooltip.top="t('bills.checkStatus')" @click="checkStatus(data)" />
              <Button v-if="data.billPaid" icon="pi pi-receipt" text rounded size="small" severity="success" :aria-label="t('bills.receipt')" v-tooltip.top="t('bills.receipt')" @click="openReceipt(data)" />
            </div>
          </template>
        </Column>
        <template #empty>
          <div class="text-center py-8">
            <i class="pi pi-wallet text-3xl" style="color:#cbd5e1"></i>
            <p class="text-sm mt-2" style="color:#94a3b8">{{ t('bills.empty') }}</p>
          </div>
        </template>
      </DataTable>
    </div>

    <!-- Bill preview / print -->
    <Dialog v-model:visible="viewVisible" :header="t('bills.preview')" modal :style="{ width: '700px' }" :breakpoints="{ '768px': '96vw' }" :content-style="{ maxHeight: '80vh', overflowY: 'auto' }">
      <div v-if="viewData && !viewData.billPaid" class="status-strip">
        <span><i class="pi pi-sync"></i> {{ lastChecked ? t('bills.lastChecked', { time: formatTime(lastChecked, locale) }) : t('bills.checkStatus') }}</span>
        <Button :label="t('bills.checkStatus')" icon="pi pi-refresh" size="small" text :loading="checkingId === viewData.id" @click="checkStatus(viewData)" />
      </div>

      <div v-if="viewData" id="bill-print-area">
        <div style="text-align:center;margin-bottom:16px">
          <img src="/coat-of-arms.svg" alt="" style="height:50px" />
          <h2 style="margin:8px 0 2px;font-size:15px;color:#333">{{ t('common.republic').toUpperCase() }}</h2>
          <h3 style="margin:0 0 8px;font-size:13px;font-weight:700">{{ t('common.board') }} (TRAB)</h3>
          <span style="display:inline-block;border:1.5px solid #1B365D;color:#1B365D;padding:3px 14px;border-radius:3px;font-size:11px;font-weight:600">{{ t('bills.governmentBill') }}</span>
        </div>

        <div class="section-title">{{ t('bills.billInfo') }}</div>
        <div class="bill-info">
          <table style="flex:1">
            <tr><td class="label">{{ t('fields.controlNumber') }}</td><td><strong>{{ viewData.billControlNumber || t('bills.pendingControl') }}</strong></td></tr>
            <tr><td class="label">{{ t('bills.paymentReference') }}</td><td>{{ viewData.billReference }}</td></tr>
            <tr><td class="label">{{ t('bills.payerName') }}</td><td>{{ viewData.payerName }}</td></tr>
            <tr><td class="label">{{ t('bills.payerPhone') }}</td><td>{{ viewData.payerPhone || t('common.dash') }}</td></tr>
            <tr><td class="label">{{ t('bills.description') }}</td><td>{{ viewData.billDescription || statusLabel(viewData.appType) }}</td></tr>
            <tr><td class="label">{{ t('common.status') }}</td><td><strong :style="{ color: viewData.billPaid ? '#10B981' : '#F59E0B' }">{{ statusLabel(viewData.billPaid ? 'PAID' : 'UNPAID') }}</strong></td></tr>
          </table>
          <div v-if="qrDataUrl" style="text-align:center;padding:8px;flex-shrink:0">
            <img :src="qrDataUrl" alt="QR" style="width:110px;height:110px" />
            <div style="font-size:10px;color:#666;margin-top:4px">{{ t('bills.scanToPay') }}</div>
          </div>
        </div>

        <div class="section-title">{{ t('bills.items') }}</div>
        <table class="items">
          <thead><tr><th>#</th><th>{{ t('bills.itemDescription') }}</th><th style="text-align:right">{{ t('bills.amountTzs') }}</th></tr></thead>
          <tbody>
            <template v-if="viewData.items?.length">
              <tr v-for="(item, i) in viewData.items" :key="i"><td>{{ i + 1 }}</td><td>{{ item.description }}</td><td style="text-align:right">{{ fmt(item.amount) }}</td></tr>
            </template>
            <tr v-else><td>1</td><td>{{ viewData.billDescription || viewData.appType }}</td><td style="text-align:right">{{ fmt(viewData.billedAmount) }}</td></tr>
          </tbody>
          <tfoot><tr class="total-row"><td colspan="2"><strong>{{ t('common.total') }}</strong></td><td style="text-align:right"><strong>TZS {{ fmt(viewData.billedAmount) }}</strong></td></tr></tfoot>
        </table>

        <div class="section-title">{{ t('bills.additional') }}</div>
        <table>
          <tr><td class="label">{{ t('bills.amountWords') }}</td><td><em>{{ numberToWords(Math.floor(Number(viewData.billedAmount))) }}.</em></td></tr>
          <tr><td class="label">{{ t('bills.expiresOn') }}</td><td>{{ viewData.expiryDate || t('common.dash') }}</td></tr>
          <tr><td class="label">{{ t('bills.dateIssued') }}</td><td>{{ viewData.generatedDate }}</td></tr>
          <tr><td class="label">{{ t('bills.printedOn') }}</td><td>{{ new Date().toISOString().split('T')[0] }}</td></tr>
        </table>

        <div class="section-title">{{ t('bills.instructions') }}</div>
        <div class="pay-grid">
          <div class="pay-box" lang="sw">
            <h4>Jinsi ya Kulipa</h4>
            <p style="font-size:11px;line-height:1.5">Kupitia Benki: Fika tawi lolote au wakala wa benki NMB, BOT. Namba ya kumbukumbu: <strong>{{ viewData.billControlNumber || '-' }}</strong></p>
            <p style="font-size:11px;line-height:1.5;margin-top:8px">Kupitia Mitandao ya Simu:<br />Chagua 4 (Lipa Bili) → Chagua 5 (Malipo ya Serikali) → Ingiza <strong>{{ viewData.billControlNumber || '-' }}</strong></p>
          </div>
          <div class="pay-box" lang="en">
            <h4>How to Pay</h4>
            <p style="font-size:11px;line-height:1.5">Via Bank: Visit any NMB or BOT branch. Reference: <strong>{{ viewData.billControlNumber || '-' }}</strong></p>
            <p style="font-size:11px;line-height:1.5;margin-top:8px">Via Mobile:<br />Select 4 (Bill Payment) → 5 (Government) → Enter <strong>{{ viewData.billControlNumber || '-' }}</strong></p>
          </div>
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.close')" text @click="viewVisible = false" />
        <Button :label="t('common.print')" icon="pi pi-print" class="trab-btn" @click="printArea('bill-print-area', `Bill - ${viewData?.billReference}`)" />
      </template>
    </Dialog>

    <!-- Payment receipt -->
    <Dialog v-model:visible="receiptVisible" :header="t('bills.receipt')" modal :style="{ width: '650px' }" :breakpoints="{ '768px': '96vw' }" :content-style="{ maxHeight: '80vh', overflowY: 'auto' }">
      <div v-if="receiptData" id="receipt-print-area">
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;margin-bottom:4px;gap:8px">
          <img src="/coat-of-arms.svg" alt="" style="height:55px" />
          <div style="text-align:center;flex:1">
            <h2 style="margin:0;font-size:15px;color:#333">{{ t('common.republic').toUpperCase() }}</h2>
            <h3 style="margin:4px 0 8px;font-size:13px;font-weight:700">{{ t('common.board') }} (TRAB)</h3>
            <span style="display:inline-block;border:1.5px solid #10B981;color:#10B981;padding:3px 16px;border-radius:3px;font-size:11px;font-weight:600;letter-spacing:0.05em">{{ t('bills.exchequerReceipt') }}</span>
          </div>
          <img src="/coat-of-arms.svg" alt="" style="height:55px" />
        </div>

        <div class="section-title">{{ t('bills.receiptInfo') }}</div>
        <table>
          <tr><td class="label">{{ t('bills.receiptNumber') }}</td><td><strong>{{ receiptData.billReference }}</strong></td></tr>
          <tr><td class="label">{{ t('bills.receivedFrom') }}</td><td>{{ receiptData.payerName || t('common.dash') }}</td></tr>
          <tr><td class="label">{{ t('fields.amount') }}</td><td style="color:#10B981;font-weight:600">TZS {{ fmt(receiptData.paidAmount || receiptData.billedAmount) }}</td></tr>
          <tr><td class="label">{{ t('bills.amountWords') }}</td><td><em>{{ numberToWords(Math.floor(Number(receiptData.paidAmount || receiptData.billedAmount))) }}.</em></td></tr>
          <tr><td class="label">{{ t('bills.outstanding') }}</td><td>TZS {{ fmt(Math.max(0, Number(receiptData.billedAmount) - Number(receiptData.paidAmount || receiptData.billedAmount))) }}</td></tr>
        </table>

        <div class="section-title">{{ t('bills.inRespectOf') }}</div>
        <table class="items">
          <thead><tr><th style="width:40px">#</th><th>{{ t('bills.itemDescription') }}</th><th style="text-align:right">{{ t('bills.amountTzs') }}</th></tr></thead>
          <tbody>
            <template v-if="receiptData.items?.length">
              <tr v-for="(item, i) in receiptData.items" :key="i"><td>{{ i + 1 }}</td><td>{{ item.description }}</td><td style="text-align:right">{{ fmt(item.amount) }}</td></tr>
            </template>
            <tr v-else><td>1</td><td>{{ receiptData.billDescription || receiptData.appType }}</td><td style="text-align:right">{{ fmt(receiptData.billedAmount) }}</td></tr>
          </tbody>
          <tfoot><tr class="total-row"><td colspan="2"><strong>{{ t('bills.totalBilled') }}</strong></td><td style="text-align:right;color:#10B981"><strong>TZS {{ fmt(receiptData.billedAmount) }}</strong></td></tr></tfoot>
        </table>

        <div class="section-title">{{ t('bills.additional') }}</div>
        <table>
          <tr><td class="label">{{ t('bills.billReference') }}</td><td>{{ receiptData.billReference }}</td></tr>
          <tr><td class="label">{{ t('fields.controlNumber') }}</td><td><strong>{{ receiptData.billControlNumber || t('common.dash') }}</strong></td></tr>
          <tr><td class="label">{{ t('bills.paymentDate') }}</td><td>{{ receiptData.generatedDate || t('common.dash') }}</td></tr>
          <tr><td class="label">{{ t('bills.printedOn') }}</td><td>{{ new Date().toISOString().split('T')[0] }}</td></tr>
        </table>
        <div style="text-align:right;margin-top:24px">
          <span style="display:inline-block;border-top:1px dashed #999;padding-top:4px;font-size:11px;color:#666;min-width:160px;text-align:center">{{ t('bills.signature') }}</span>
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.close')" text @click="receiptVisible = false" />
        <Button :label="t('common.print')" icon="pi pi-print" class="trab-btn" @click="printArea('receipt-print-area', `Receipt - ${receiptData?.billReference}`)" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.search-input { width: 320px; max-width: 100%; font-size: 0.82rem; border-radius: 8px; }
.status-strip {
  display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;
  background: #eff6ff; color: #1d4ed8; border-radius: 8px; padding: 0.3rem 0.75rem; font-size: 0.78rem; margin-bottom: 0.75rem;
}
.bill-info { display: flex; gap: 16px; flex-wrap: wrap; }
.pay-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.section-title { font-size: 11px; font-weight: 700; color: #1B365D; text-transform: uppercase; border-bottom: 2px solid #1B365D; padding-bottom: 4px; margin: 14px 0 8px; }
table { width: 100%; border-collapse: collapse; }
td { padding: 4px 8px; font-size: 13px; vertical-align: top; }
.label { color: #666; width: 180px; }
.items th { background: #f8f9fa; text-align: left; padding: 6px 8px; font-size: 12px; border-bottom: 2px solid #ddd; }
.items td { padding: 6px 8px; font-size: 13px; border-bottom: 1px solid #eee; }
.total-row { background: #f0fdf4; }
.total-row td { border-top: 2px solid #1B365D; font-weight: 700; }
.pay-box { border: 1px solid #ddd; border-radius: 4px; padding: 12px; font-size: 12px; }
.pay-box h4 { margin: 0 0 8px; font-size: 13px; }
@media (max-width: 640px) {
  .pay-grid { grid-template-columns: 1fr; }
  .label { width: 120px; }
}
</style>
