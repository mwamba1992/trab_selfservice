<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import { SelfServiceBills as BillingService } from '@/service/SelfServiceApi.js';
import QRCode from 'qrcode';

const toast = useToast();
const bills = ref([]);
const loading = ref(false);
const searchText = ref('');
const viewVisible = ref(false);
const viewData = ref(null);
const receiptVisible = ref(false);
const receiptData = ref(null);

const loadData = async () => {
  loading.value = true;
  try {
    const result = await BillingService.getAll(1, 200);
    bills.value = result.items || result;
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load bills', life: 3000 });
  } finally { loading.value = false; }
};

onMounted(loadData);

const filtered = computed(() => {
  if (!searchText.value) return bills.value;
  const q = searchText.value.toLowerCase();
  return bills.value.filter(b =>
    (b.billReference || '').toLowerCase().includes(q) ||
    (b.billControlNumber || '').toLowerCase().includes(q) ||
    (b.payerName || '').toLowerCase().includes(q)
  );
});

const stats = computed(() => {
  const total = bills.value.length;
  const paid = bills.value.filter(b => b.billPaid).length;
  const totalAmt = bills.value.reduce((s, b) => s + Number(b.billedAmount || 0), 0);
  return { total, paid, unpaid: total - paid, totalAmt };
});

const qrDataUrl = ref('');

const openView = async (bill) => {
  try {
    viewData.value = await BillingService.getById(bill.id);
    qrDataUrl.value = viewData.value.billControlNumber
      ? await QRCode.toDataURL(viewData.value.billControlNumber, { width: 120, margin: 1 })
      : '';
    viewVisible.value = true;
  } catch { toast.add({ severity: 'error', summary: 'Error', detail: 'Failed', life: 3000 }); }
};

const fmt = (val) => Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

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

const openReceipt = async (bill) => {
  try { receiptData.value = await BillingService.getById(bill.id); receiptVisible.value = true; }
  catch { toast.add({ severity: 'error', summary: 'Error', detail: 'Failed', life: 3000 }); }
};

const printReceipt = () => {
  const el = document.getElementById('receipt-print-area');
  if (!el) return;
  const win = window.open('', '_blank');
  win.document.write(`<html><head><title>Receipt - ${receiptData.value?.billReference}</title><style>
    body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; }
    .r-header { text-align: center; padding-bottom: 12px; margin-bottom: 4px; }
    .r-header h2 { margin: 0; font-size: 15px; }
    .r-header h3 { margin: 4px 0; font-size: 13px; }
    .r-section { font-size: 11px; font-weight: 700; color: #1B365D; text-transform: uppercase; border-bottom: 2px solid #1B365D; padding-bottom: 4px; margin: 14px 0 8px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 4px 8px; font-size: 13px; }
    .label { color: #666; width: 180px; }
    .items th { background: #f8f9fa; text-align: left; padding: 6px 10px; font-size: 11px; font-weight: 600; border-bottom: 2px solid #ddd; }
    .items td { padding: 6px 10px; font-size: 13px; border-bottom: 1px solid #eee; }
    .items tfoot td { border-top: 2px solid #1B365D; border-bottom: none; padding: 8px 10px; }
    .sig-line { text-align: right; margin-top: 20px; }
    .sig-line span { display: inline-block; border-top: 1px dashed #999; padding-top: 4px; font-size: 11px; color: #666; min-width: 160px; text-align: center; }
    @media print { body { padding: 0; } }
  </style></head><body>${el.innerHTML}</body></html>`);
  win.document.close();
  win.print();
};

const printBill = () => {
  const el = document.getElementById('bill-print-area');
  if (!el) return;
  const win = window.open('', '_blank');
  win.document.write(`<html><head><title>Bill - ${viewData.value?.billReference}</title><style>
    body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 700px; margin: 0 auto; }
    .bill-header { text-align: center; margin-bottom: 16px; }
    .bill-header h2 { margin: 8px 0 2px; font-size: 15px; }
    .bill-header h3 { margin: 0 0 8px; font-size: 13px; font-weight: 700; }
    .bill-badge { display: inline-block; border: 1.5px solid #1B365D; color: #1B365D; padding: 3px 14px; border-radius: 3px; font-size: 11px; font-weight: 600; }
    .section-title { font-size: 11px; font-weight: 700; color: #1B365D; text-transform: uppercase; border-bottom: 2px solid #1B365D; padding-bottom: 4px; margin: 14px 0 8px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 4px 8px; font-size: 13px; vertical-align: top; }
    .label { color: #666; width: 180px; }
    .items th { background: #f8f9fa; text-align: left; padding: 6px 8px; font-size: 12px; border-bottom: 2px solid #ddd; }
    .items td { padding: 6px 8px; font-size: 13px; border-bottom: 1px solid #eee; }
    .total-row { background: #f0fdf4; }
    .total-row td { border-top: 2px solid #1B365D; font-weight: 700; }
    .pay-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
    .pay-box { border: 1px solid #ddd; border-radius: 4px; padding: 12px; font-size: 12px; }
    .pay-box h4 { margin: 0 0 8px; font-size: 13px; }
    .sig-line { text-align: right; margin-top: 20px; }
    .sig-line span { display: inline-block; border-top: 1px dashed #999; padding-top: 4px; font-size: 11px; color: #666; min-width: 160px; text-align: center; }
    @media print { body { padding: 0; } }
  </style></head><body>${el.innerHTML}</body></html>`);
  win.document.close();
  win.print();
};
</script>

<template>
  <div>
    <div class="page-header">
      <h2>My Bills</h2>
      <p>View your billing records and payment status</p>
    </div>

    <div class="stat-bar">
      <div class="stat-item"><div class="stat-dot" style="background:#1B6B3D"></div> Total: <strong>{{ stats.total }}</strong></div>
      <div class="stat-item"><div class="stat-dot" style="background:#10B981"></div> Paid: <strong>{{ stats.paid }}</strong></div>
      <div class="stat-item"><div class="stat-dot" style="background:#F59E0B"></div> Unpaid: <strong>{{ stats.unpaid }}</strong></div>
      <div class="stat-item"><div class="stat-dot" style="background:#8B5CF6"></div> Total: <strong>TSh {{ fmt(stats.totalAmt) }}</strong></div>
    </div>

    <div class="ss-card mb-3">
      <InputText v-model="searchText" placeholder="Search by reference, control no. or payer..." style="width:320px;max-width:100%;font-size:0.82rem;border-radius:8px" />
    </div>

    <div class="ss-card">
      <DataTable :value="filtered" :loading="loading" paginator :rows="10" :rowsPerPageOptions="[10,25,50]" dataKey="id">
        <Column header="S/N" style="width:3.5rem"><template #body="{index}">{{ index + 1 }}</template></Column>
        <Column field="billReference" header="Reference" sortable />
        <Column field="appType" header="Type" sortable />
        <Column header="Amount"><template #body="{data}">TSh {{ fmt(data.billedAmount) }}</template></Column>
        <Column field="generatedDate" header="Date" sortable />
        <Column header="Control No."><template #body="{data}">{{ data.billControlNumber || 'Pending' }}</template></Column>
        <Column header="Status"><template #body="{data}"><Tag :value="data.billPaid?'PAID':'UNPAID'" :severity="data.billPaid?'success':'warn'" /></template></Column>
        <Column header="Actions" style="width:9rem">
          <template #body="{data}">
            <div class="flex gap-1">
              <Button icon="pi pi-file" text rounded size="small" @click="openView(data)" v-tooltip.top="'Invoice'" />
              <Button v-if="data.billPaid" icon="pi pi-receipt" text rounded size="small" severity="success" @click="openReceipt(data)" v-tooltip.top="'Payment Receipt'" />
            </div>
          </template>
        </Column>
        <template #empty>
          <div class="text-center py-8">
            <i class="pi pi-wallet text-3xl" style="color:#cbd5e1"></i>
            <p class="text-sm mt-2" style="color:#94a3b8">No bills yet.</p>
          </div>
        </template>
      </DataTable>
    </div>

    <!-- Bill Preview / Print Dialog -->
    <Dialog v-model:visible="viewVisible" header="Bill Preview" modal :style="{width:'700px'}" :contentStyle="{maxHeight:'80vh',overflowY:'auto'}">
      <div v-if="viewData" id="bill-print-area">
        <div style="text-align:center;margin-bottom:16px">
          <img src="/coat-of-arms.svg" alt="" style="height:50px" />
          <h2 style="margin:8px 0 2px;font-size:15px;color:#333">THE UNITED REPUBLIC OF TANZANIA</h2>
          <h3 style="margin:0 0 8px;font-size:13px;font-weight:700">Tax Revenue Appeals Board (TRAB)</h3>
          <span style="display:inline-block;border:1.5px solid #1B365D;color:#1B365D;padding:3px 14px;border-radius:3px;font-size:11px;font-weight:600">GOVERNMENT BILL</span>
        </div>

        <div class="section-title">BILL INFORMATION</div>
        <div style="display:flex;gap:16px">
          <table style="flex:1">
            <tr><td class="label">Control Number</td><td><strong>{{ viewData.billControlNumber || 'Pending' }}</strong></td></tr>
            <tr><td class="label">Payment Reference</td><td>{{ viewData.billReference }}</td></tr>
            <tr><td class="label">Payer Name</td><td>{{ viewData.payerName }}</td></tr>
            <tr><td class="label">Payer Phone</td><td>{{ viewData.payerPhone || '-' }}</td></tr>
            <tr><td class="label">Bill Description</td><td>{{ viewData.billDescription || viewData.appType }}</td></tr>
            <tr><td class="label">Status</td><td><strong :style="{color: viewData.billPaid ? '#10B981' : '#F59E0B'}">{{ viewData.billPaid ? 'PAID' : 'UNPAID' }}</strong></td></tr>
          </table>
          <div v-if="qrDataUrl" style="text-align:center;padding:8px;flex-shrink:0">
            <img :src="qrDataUrl" alt="QR Code" style="width:110px;height:110px" />
            <div style="font-size:10px;color:#666;margin-top:4px">Scan to Pay</div>
          </div>
        </div>

        <div class="section-title">BILL ITEMS</div>
        <table class="items">
          <thead><tr><th>#</th><th>Description</th><th style="text-align:right">Amount (TZS)</th></tr></thead>
          <tbody>
            <tr v-if="viewData.items?.length" v-for="(item, i) in viewData.items" :key="i">
              <td>{{ i + 1 }}</td><td>{{ item.description }}</td><td style="text-align:right">{{ fmt(item.amount) }}</td>
            </tr>
            <tr v-else><td>1</td><td>{{ viewData.billDescription || viewData.appType }}</td><td style="text-align:right">{{ fmt(viewData.billedAmount) }}</td></tr>
          </tbody>
          <tfoot><tr class="total-row"><td colspan="2"><strong>Total</strong></td><td style="text-align:right"><strong>TZS {{ fmt(viewData.billedAmount) }}</strong></td></tr></tfoot>
        </table>

        <div class="section-title">ADDITIONAL DETAILS</div>
        <table>
          <tr><td class="label">Amount in Words</td><td><em>{{ numberToWords(Math.floor(Number(viewData.billedAmount))) }}.</em></td></tr>
          <tr><td class="label">Expires On</td><td>{{ viewData.expiryDate || '-' }}</td></tr>
          <tr><td class="label">Date Issued</td><td>{{ viewData.generatedDate }}</td></tr>
          <tr><td class="label">Printed On</td><td>{{ new Date().toISOString().split('T')[0] }}</td></tr>
        </table>

        <div class="section-title">PAYMENT INSTRUCTIONS</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="pay-box">
            <h4>Jinsi ya Kulipa</h4>
            <p style="font-size:11px;line-height:1.5">Kupitia Benki: Fika tawi lolote au wakala wa benki NMB, BOT. Namba ya kumbukumbu: <strong>{{ viewData.billControlNumber || '-' }}</strong></p>
            <p style="font-size:11px;line-height:1.5;margin-top:8px">Kupitia Mitandao ya Simu:<br/>Chagua 4 (Lipa Bili) → Chagua 5 (Malipo ya Serikali) → Ingiza <strong>{{ viewData.billControlNumber || '-' }}</strong></p>
          </div>
          <div class="pay-box">
            <h4>How to Pay</h4>
            <p style="font-size:11px;line-height:1.5">Via Bank: Visit any NMB or BOT branch. Reference: <strong>{{ viewData.billControlNumber || '-' }}</strong></p>
            <p style="font-size:11px;line-height:1.5;margin-top:8px">Via Mobile:<br/>Select 4 (Bill Payment) → 5 (Government) → Enter <strong>{{ viewData.billControlNumber || '-' }}</strong></p>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Close" text @click="viewVisible=false" />
        <Button label="Print / Save" icon="pi pi-print" style="background:#1B6B3D;border-color:#1B6B3D" @click="printBill" />
      </template>
    </Dialog>
    <!-- Payment Receipt Dialog -->
    <Dialog v-model:visible="receiptVisible" header="Payment Receipt" modal :style="{width:'650px'}" :contentStyle="{maxHeight:'80vh',overflowY:'auto'}">
      <div v-if="receiptData" id="receipt-print-area">
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;margin-bottom:4px">
          <img src="/coat-of-arms.svg" alt="" style="height:55px" />
          <div style="text-align:center;flex:1">
            <h2 style="margin:0;font-size:15px;color:#333">THE UNITED REPUBLIC OF TANZANIA</h2>
            <h3 style="margin:4px 0 8px;font-size:13px;font-weight:700">Tax Revenue Appeals Board (TRAB)</h3>
            <span style="display:inline-block;border:1.5px solid #10B981;color:#10B981;padding:3px 16px;border-radius:3px;font-size:11px;font-weight:600;letter-spacing:0.05em">EXCHEQUER RECEIPT</span>
          </div>
          <img src="/coat-of-arms.svg" alt="" style="height:55px" />
        </div>

        <div class="section-title">RECEIPT INFORMATION</div>
        <table>
          <tr><td class="label">Receipt Number</td><td><strong>{{ receiptData.billReference }}</strong></td></tr>
          <tr><td class="label">Received From</td><td>{{ receiptData.payerName || '-' }}</td></tr>
          <tr><td class="label">Amount</td><td style="color:#10B981;font-weight:600">TZS {{ fmt(receiptData.paidAmount || receiptData.billedAmount) }}</td></tr>
          <tr><td class="label">Amount In Words</td><td><em>{{ numberToWords(Math.floor(Number(receiptData.paidAmount || receiptData.billedAmount))) }}.</em></td></tr>
          <tr><td class="label">Outstanding Amount</td><td>TZS {{ fmt(Math.max(0, Number(receiptData.billedAmount) - Number(receiptData.paidAmount || receiptData.billedAmount))) }}</td></tr>
        </table>

        <div class="section-title">IN RESPECT OF</div>
        <table class="items">
          <thead><tr><th style="width:40px">#</th><th>Description</th><th style="text-align:right">Amount (TZS)</th></tr></thead>
          <tbody>
            <tr v-if="receiptData.items?.length" v-for="(item, i) in receiptData.items" :key="i">
              <td>{{ i + 1 }}</td><td>{{ item.description }}</td><td style="text-align:right">{{ fmt(item.amount) }}</td>
            </tr>
            <tr v-else><td>1</td><td>{{ receiptData.billDescription || receiptData.appType }}</td><td style="text-align:right">{{ fmt(receiptData.billedAmount) }}</td></tr>
          </tbody>
          <tfoot><tr style="background:#f0fdf4"><td colspan="2"><strong>Total Billed Amount</strong></td><td style="text-align:right;color:#10B981"><strong>TZS {{ fmt(receiptData.billedAmount) }}</strong></td></tr></tfoot>
        </table>

        <div class="section-title">ADDITIONAL DETAILS</div>
        <table>
          <tr><td class="label">Bill Reference</td><td>{{ receiptData.billReference }}</td></tr>
          <tr><td class="label">Control Number</td><td><strong>{{ receiptData.billControlNumber || '-' }}</strong></td></tr>
          <tr><td class="label">Payment Date</td><td>{{ receiptData.generatedDate || '-' }}</td></tr>
          <tr>
            <td class="label">Printed On</td>
            <td style="position:relative">
              {{ new Date().toISOString().split('T')[0] }}
              <span style="position:absolute;right:0;top:0;display:inline-block;border-top:1px dashed #999;padding-top:4px;font-size:11px;color:#666;min-width:160px;text-align:center">Authorized Signature</span>
            </td>
          </tr>
        </table>
      </div>
      <template #footer>
        <Button label="Close" text @click="receiptVisible=false" />
        <Button label="Print / Save" icon="pi pi-print" style="background:#1B6B3D;border-color:#1B6B3D" @click="printReceipt" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
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
</style>
