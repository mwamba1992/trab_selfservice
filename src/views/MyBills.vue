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

const toast = useToast();
const bills = ref([]);
const loading = ref(false);
const searchText = ref('');
const viewVisible = ref(false);
const viewData = ref(null);

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

const openView = async (bill) => {
  try { viewData.value = await BillingService.getById(bill.id); viewVisible.value = true; }
  catch { toast.add({ severity: 'error', summary: 'Error', detail: 'Failed', life: 3000 }); }
};

const fmt = (val) => Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
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
        <Column header="Actions" style="width:5rem">
          <template #body="{data}"><Button icon="pi pi-eye" text rounded size="small" @click="openView(data)" v-tooltip.top="'View'" /></template>
        </Column>
        <template #empty>
          <div class="text-center py-8">
            <i class="pi pi-wallet text-3xl" style="color:#cbd5e1"></i>
            <p class="text-sm mt-2" style="color:#94a3b8">No bills yet.</p>
          </div>
        </template>
      </DataTable>
    </div>

    <Dialog v-model:visible="viewVisible" header="Bill Details" modal :style="{width:'550px'}">
      <div v-if="viewData">
        <div class="flex justify-between items-center pb-3 mb-3" style="border-bottom:2px solid #f1f5f9">
          <span style="font-size:1rem;font-weight:700;color:var(--trab-primary)">{{ viewData.billReference }}</span>
          <Tag :value="viewData.billPaid?'PAID':'UNPAID'" :severity="viewData.billPaid?'success':'warn'" />
        </div>
        <div class="view-grid">
          <div class="view-row"><span class="view-label">Amount</span><span class="view-value"><strong>TSh {{ fmt(viewData.billedAmount) }}</strong></span></div>
          <div class="view-row"><span class="view-label">Control Number</span><span class="view-value">{{ viewData.billControlNumber || 'Pending' }}</span></div>
          <div class="view-row"><span class="view-label">Type</span><span class="view-value">{{ viewData.appType }}</span></div>
          <div class="view-row"><span class="view-label">Generated</span><span class="view-value">{{ viewData.generatedDate }}</span></div>
          <div class="view-row"><span class="view-label">Expiry</span><span class="view-value">{{ viewData.expiryDate || '-' }}</span></div>
        </div>
        <template v-if="viewData.items?.length">
          <h4 class="text-xs font-semibold mt-4 mb-2" style="color:#475569;text-transform:uppercase;letter-spacing:0.05em">Bill Items</h4>
          <div v-for="(item,i) in viewData.items" :key="i" class="view-row" style="font-size:0.82rem">
            <span class="view-label">{{ item.description }}</span>
            <span class="view-value">TSh {{ fmt(item.amount) }}</span>
          </div>
        </template>
      </div>
      <template #footer><Button label="Close" outlined @click="viewVisible=false" /></template>
    </Dialog>
  </div>
</template>

<style scoped>
.view-grid { display: flex; flex-direction: column; gap: 0; }
.view-row { display: flex; justify-content: space-between; align-items: center; padding: 0.55rem 0; border-bottom: 1px solid #f8f9fa; font-size: 0.84rem; }
.view-row:last-child { border-bottom: none; }
.view-label { color: #64748B; }
.view-value { color: #1E293B; font-weight: 500; }
</style>
