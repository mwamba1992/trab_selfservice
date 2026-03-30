<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import { SelfServiceAppeals as AppealService } from '@/service/SelfServiceApi.js';

const toast = useToast();
const appeals = ref([]);
const loading = ref(false);
const searchText = ref('');
const viewVisible = ref(false);
const viewData = ref(null);

const loadData = async () => {
  loading.value = true;
  try {
    const result = await AppealService.getAll(1, 200);
    appeals.value = result.items || result;
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load appeals', life: 3000 });
  } finally { loading.value = false; }
};

onMounted(loadData);

const filtered = computed(() => {
  if (!searchText.value) return appeals.value;
  const q = searchText.value.toLowerCase();
  return appeals.value.filter(a =>
    (a.appealNo || '').toLowerCase().includes(q) ||
    (a.appellantName || '').toLowerCase().includes(q)
  );
});

const stats = computed(() => {
  const total = appeals.value.length;
  const decided = appeals.value.filter(a => a.statusTrend === 'DECIDED').length;
  const pending = total - decided;
  return { total, decided, pending };
});

const openView = async (appeal) => {
  try { viewData.value = await AppealService.getById(appeal.id); viewVisible.value = true; }
  catch { toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load', life: 3000 }); }
};

const statusSeverity = (s) => ({ NEW: 'info', HEARING_SCHEDULED: 'warn', CONCLUDED: 'secondary', DECIDED: 'success' }[s] || 'info');
</script>

<template>
  <div>
    <div class="page-header">
      <h2>My Appeals</h2>
      <p>Track the progress of your tax appeal cases</p>
    </div>

    <div class="stat-bar">
      <div class="stat-item"><div class="stat-dot" style="background:#1B6B3D"></div> Total: <strong>{{ stats.total }}</strong></div>
      <div class="stat-item"><div class="stat-dot" style="background:#10B981"></div> Decided: <strong>{{ stats.decided }}</strong></div>
      <div class="stat-item"><div class="stat-dot" style="background:#F59E0B"></div> Pending: <strong>{{ stats.pending }}</strong></div>
    </div>

    <div class="ss-card mb-3">
      <InputText v-model="searchText" placeholder="Search by appeal no. or appellant..." style="width:320px;max-width:100%;font-size:0.82rem;border-radius:8px" />
    </div>

    <div class="ss-card">
      <DataTable :value="filtered" :loading="loading" paginator :rows="10" :rowsPerPageOptions="[10,25,50]" dataKey="id">
        <Column header="S/N" style="width:3.5rem"><template #body="{index}">{{ index + 1 }}</template></Column>
        <Column field="appealNo" header="Appeal No." sortable />
        <Column field="dateOfFiling" header="Date Filed" sortable />
        <Column field="appellantName" header="Appellant" sortable />
        <Column header="Tax Type"><template #body="{data}">{{ data.taxType?.name || '-' }}</template></Column>
        <Column header="Status"><template #body="{data}"><Tag :value="data.statusTrend" :severity="statusSeverity(data.statusTrend)" /></template></Column>
        <Column header="Payment"><template #body="{data}"><Tag :value="data.paymentStatus || 'UNPAID'" :severity="data.paymentStatus==='PAID'?'success':'warn'" /></template></Column>
        <Column header="Actions" style="width:5rem">
          <template #body="{data}"><Button icon="pi pi-eye" text rounded size="small" @click="openView(data)" v-tooltip.top="'View'" /></template>
        </Column>
        <template #empty>
          <div class="text-center py-8">
            <i class="pi pi-briefcase text-3xl" style="color:#cbd5e1"></i>
            <p class="text-sm mt-2" style="color:#94a3b8">No appeals filed yet.</p>
          </div>
        </template>
      </DataTable>
    </div>

    <Dialog v-model:visible="viewVisible" header="Appeal Details" modal :style="{width:'550px'}">
      <div v-if="viewData" class="view-grid">
        <div class="view-row"><span class="view-label">Appeal No</span><span class="view-value"><strong>{{ viewData.appealNo }}</strong></span></div>
        <div class="view-row"><span class="view-label">Date Filed</span><span class="view-value">{{ viewData.dateOfFiling }}</span></div>
        <div class="view-row"><span class="view-label">Appellant</span><span class="view-value">{{ viewData.appellantName }}</span></div>
        <div class="view-row"><span class="view-label">Tax Type</span><span class="view-value">{{ viewData.taxType?.name }}</span></div>
        <div class="view-row"><span class="view-label">Status</span><span class="view-value"><Tag :value="viewData.statusTrend" :severity="statusSeverity(viewData.statusTrend)" /></span></div>
        <div class="view-row"><span class="view-label">Outcome</span><span class="view-value">{{ viewData.outcomeOfDecision || '-' }}</span></div>
        <template v-if="viewData.decidedDate">
          <div class="view-row"><span class="view-label">Decision Date</span><span class="view-value">{{ viewData.decidedDate }}</span></div>
          <div class="view-row"><span class="view-label">Won By</span><span class="view-value"><Tag :value="viewData.wonBy || '-'" :severity="viewData.wonBy === 'APPELLANT' ? 'success' : 'danger'" /></span></div>
        </template>
        <div v-if="viewData.summaryOfDecree" class="mt-3 p-3" style="background:#f8faf9;border-radius:8px;font-size:0.82rem">
          <strong style="color:#475569">Summary of Decision:</strong>
          <p class="mt-1" style="color:#1E293B;margin:0">{{ viewData.summaryOfDecree }}</p>
        </div>
      </div>
      <template #footer><Button label="Close" outlined @click="viewVisible=false" /></template>
    </Dialog>
  </div>
</template>

<style scoped>
.view-grid { display: flex; flex-direction: column; gap: 0; }
.view-row { display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0; border-bottom: 1px solid #f8f9fa; font-size: 0.84rem; }
.view-row:last-child { border-bottom: none; }
.view-label { color: #64748B; }
.view-value { color: #1E293B; font-weight: 500; }
</style>
