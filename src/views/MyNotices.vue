<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import { SelfServiceNotices as NoticeService } from '@/service/SelfServiceApi.js';

const toast = useToast();
const notices = ref([]);
const loading = ref(false);
const searchText = ref('');
const viewVisible = ref(false);
const viewData = ref(null);

const loadData = async () => {
  loading.value = true;
  try {
    const result = await NoticeService.getAll(1, 200);
    notices.value = result.items || result;
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load notices', life: 3000 });
  } finally { loading.value = false; }
};

onMounted(loadData);

const filtered = computed(() => {
  if (!searchText.value) return notices.value;
  const q = searchText.value.toLowerCase();
  return notices.value.filter(n =>
    (n.noticeNo || '').toLowerCase().includes(q) ||
    (n.appellantName || '').toLowerCase().includes(q)
  );
});

const stats = computed(() => {
  const total = notices.value.length;
  const paid = notices.value.filter(n => n.paymentStatus === 'PAID').length;
  const valid = notices.value.filter(n => isValid(n)).length;
  return { total, paid, pending: total - paid, valid };
});

const openView = async (notice) => {
  try { viewData.value = await NoticeService.getById(notice.id); viewVisible.value = true; }
  catch { toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load', life: 3000 }); }
};

const isValid = (notice) => {
  if (notice.isExempted) return true;
  const days = Math.floor((new Date().getTime() - new Date(notice.loggedAt).getTime()) / 86400000);
  return days <= 45;
};
</script>

<template>
  <div>
    <div class="page-header">
      <h2>My Notices</h2>
      <p>View and manage your filed notices of appeal</p>
    </div>

    <!-- Stat Bar -->
    <div class="stat-bar">
      <div class="stat-item"><div class="stat-dot" style="background:#1B6B3D"></div> Total: <strong>{{ stats.total }}</strong></div>
      <div class="stat-item"><div class="stat-dot" style="background:#10B981"></div> Paid: <strong>{{ stats.paid }}</strong></div>
      <div class="stat-item"><div class="stat-dot" style="background:#F59E0B"></div> Pending: <strong>{{ stats.pending }}</strong></div>
      <div class="stat-item"><div class="stat-dot" style="background:#3B82F6"></div> Valid: <strong>{{ stats.valid }}</strong></div>
    </div>

    <!-- Toolbar -->
    <div class="ss-card mb-3">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <InputText v-model="searchText" placeholder="Search by notice no. or appellant..." class="search-input" />
        <router-link to="/notices/new" class="file-btn"><i class="pi pi-plus"></i> File New Notice</router-link>
      </div>
    </div>

    <!-- Table -->
    <div class="ss-card">
      <DataTable :value="filtered" :loading="loading" paginator :rows="10" :rowsPerPageOptions="[10,25,50]" dataKey="id">
        <Column header="S/N" style="width:3.5rem"><template #body="{index}">{{ index + 1 }}</template></Column>
        <Column header="Notice No." sortable sortField="noticeNo">
          <template #body="{data}">
            <span v-if="data.noticeNo" class="font-semibold">{{ data.noticeNo }}</span>
            <span v-else class="text-xs" style="color:#F59E0B;font-weight:600">Awaiting Payment</span>
          </template>
        </Column>
        <Column field="loggedAt" header="Date Lodged" sortable />
        <Column field="appellantName" header="Appellant" sortable />
        <Column header="Payment">
          <template #body="{data}"><Tag :value="data.paymentStatus || 'UNPAID'" :severity="data.paymentStatus==='PAID'?'success':'warn'" /></template>
        </Column>
        <Column header="Validity">
          <template #body="{data}"><Tag :value="isValid(data)?'Valid':'Expired'" :severity="isValid(data)?'success':'danger'" /></template>
        </Column>
        <Column header="Actions" style="width:8rem">
          <template #body="{data}">
            <div class="flex gap-1 items-center">
              <Button icon="pi pi-eye" text rounded size="small" @click="openView(data)" v-tooltip.top="'View Notice Details'" />
              <Button v-if="data.paymentStatus !== 'PAID'"
                icon="pi pi-wallet" text rounded size="small" severity="warn"
                @click="$router.push('/bills')"
                v-tooltip.top="'Go to Bills page to make payment for this notice'" />
              <Button v-if="data.paymentStatus === 'PAID' && isValid(data) && data.noticeNo"
                icon="pi pi-file-edit" text rounded size="small" severity="success"
                @click="$router.push(`/appeals/file?noticeNo=${data.noticeNo}`)"
                v-tooltip.top="'File a Statement of Appeal for this notice'" />
            </div>
          </template>
        </Column>
        <template #empty>
          <div class="text-center py-8">
            <i class="pi pi-file text-3xl" style="color:#cbd5e1"></i>
            <p class="text-sm mt-2" style="color:#94a3b8">No notices filed yet.</p>
            <router-link to="/notices/new" class="text-sm font-semibold" style="color:var(--trab-primary)">File your first notice</router-link>
          </div>
        </template>
      </DataTable>
    </div>

    <!-- View Dialog -->
    <Dialog v-model:visible="viewVisible" header="Notice Details" modal :style="{width:'520px'}">
      <div v-if="viewData" class="view-grid">
        <div class="view-row"><span class="view-label">Notice No</span><span class="view-value"><strong v-if="viewData.noticeNo">{{ viewData.noticeNo }}</strong><span v-else style="color:#F59E0B;font-weight:600;font-size:0.82rem">Awaiting Payment</span></span></div>
        <div class="view-row"><span class="view-label">Date Lodged</span><span class="view-value">{{ viewData.loggedAt }}</span></div>
        <div class="view-row"><span class="view-label">Appellant</span><span class="view-value">{{ viewData.appellantName }}</span></div>
        <div class="view-row"><span class="view-label">Phone</span><span class="view-value">{{ viewData.phone || '-' }}</span></div>
        <div class="view-row"><span class="view-label">Decision Date</span><span class="view-value">{{ viewData.dateOfTaxationDecision }}</span></div>
        <div class="view-row"><span class="view-label">Service Date</span><span class="view-value">{{ viewData.dateOfServiceDecision }}</span></div>
        <div class="view-row"><span class="view-label">Payment</span><span class="view-value"><Tag :value="viewData.paymentStatus || 'UNPAID'" :severity="viewData.paymentStatus==='PAID'?'success':'warn'" /></span></div>
        <div class="view-row"><span class="view-label">Validity</span><span class="view-value"><Tag :value="viewData.validForAppeal?'Valid':'Expired'" :severity="viewData.validForAppeal?'success':'danger'" /></span></div>
        <div v-if="viewData.bill" class="view-row"><span class="view-label">Control No.</span><span class="view-value">{{ viewData.bill?.billControlNumber || 'Pending' }}</span></div>
      </div>
      <template #footer><Button label="Close" outlined @click="viewVisible=false" /></template>
    </Dialog>
  </div>
</template>

<style scoped>
.search-input {
  width: 320px;
  max-width: 100%;
  font-size: 0.82rem !important;
  border-radius: 8px !important;
}
.file-btn {
  background: var(--trab-primary);
  color: #fff;
  padding: 0.55rem 1.15rem;
  border-radius: 8px;
  text-decoration: none;
  font-size: 0.82rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transition: background 0.15s;
  font-family: 'Poppins', sans-serif;
}
.file-btn:hover { background: var(--trab-primary-hover); }

.view-grid { display: flex; flex-direction: column; gap: 0; }
.view-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0;
  border-bottom: 1px solid #f8f9fa;
  font-size: 0.84rem;
}
.view-row:last-child { border-bottom: none; }
.view-label { color: #64748B; }
.view-value { color: #1E293B; font-weight: 500; }
</style>
