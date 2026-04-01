<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import { SelfServiceAppeals as AppealService } from '@/service/SelfServiceApi.js';
import api from '@/service/Api.js';

const toast = useToast();
const appeals = ref([]);
const loading = ref(false);
const searchText = ref('');
const viewVisible = ref(false);
const viewData = ref(null);

// Documents
const docsVisible = ref(false);
const docsAppealId = ref(null);
const docsAppealNo = ref('');
const docsList = ref([]);
const docsLoading = ref(false);
const docFile = ref(null);
const docType = ref('OTHER');
const docRemarks = ref('');
const docUploading = ref(false);
const docTypeOptions = ['ANNEXTURE', 'EVIDENCE', 'SUPPORTING', 'OTHER'];

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

const viewParties = ref({ appellants: [], respondents: [] });

const openView = async (appeal) => {
  try {
    viewData.value = await AppealService.getById(appeal.id);
    try { viewParties.value = await AppealService.getParties(appeal.id); } catch { viewParties.value = { appellants: [], respondents: [] }; }
    viewVisible.value = true;
  } catch { toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load', life: 3000 }); }
};

const statusSeverity = (s) => ({ NEW: 'info', HEARING_SCHEDULED: 'warn', CONCLUDED: 'secondary', DECIDED: 'success' }[s] || 'info');

const openDocuments = async (appeal) => {
  docsAppealId.value = appeal.id;
  docsAppealNo.value = appeal.appealNo || appeal.id;
  docsVisible.value = true;
  docFile.value = null;
  docType.value = 'OTHER';
  docRemarks.value = '';
  await loadDocuments();
};

const loadDocuments = async () => {
  docsLoading.value = true;
  try { docsList.value = await AppealService.getDocuments(docsAppealId.value); }
  catch { toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load documents', life: 3000 }); }
  finally { docsLoading.value = false; }
};

const onDocFileSelect = (event) => { docFile.value = event.target.files[0]; };

const uploadDocument = async () => {
  if (!docFile.value) return;
  docUploading.value = true;
  try {
    await AppealService.uploadDocument(docsAppealId.value, docFile.value, docType.value, docRemarks.value);
    toast.add({ severity: 'success', summary: 'Uploaded', detail: 'Document uploaded', life: 3000 });
    docFile.value = null; docRemarks.value = ''; docType.value = 'OTHER';
    await loadDocuments();
  } catch { toast.add({ severity: 'error', summary: 'Error', detail: 'Upload failed', life: 3000 }); }
  finally { docUploading.value = false; }
};

const previewVisible = ref(false);
const previewUrl = ref('');
const previewName = ref('');

const downloadDoc = async (doc) => {
  try {
    const res = await api.get(`/uploads/${doc.fileName}`, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/pdf' });
    previewUrl.value = URL.createObjectURL(blob);
    previewName.value = doc.originalName || doc.fileName;
    previewVisible.value = true;
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load document', life: 3000 });
  }
};

const downloadFile = () => {
  const a = document.createElement('a');
  a.href = previewUrl.value;
  a.download = previewName.value;
  a.click();
};
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
        <Column header="Actions" style="width:7rem">
          <template #body="{data}">
            <div class="flex gap-1">
              <Button icon="pi pi-eye" text rounded size="small" @click="openView(data)" v-tooltip.top="'View'" />
              <Button icon="pi pi-file" text rounded size="small" @click="openDocuments(data)" v-tooltip.top="'Documents'" />
            </div>
          </template>
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
        <!-- Case Parties -->
        <div v-if="viewParties.appellants.length || viewParties.respondents.length" class="mt-3 p-3" style="background:#f8faf9;border-radius:8px">
          <div v-if="viewParties.appellants.length" class="mb-3">
            <p class="text-xs font-semibold mb-2" style="color:#475569">APPELLANTS</p>
            <div v-for="a in viewParties.appellants" :key="a.id" style="font-size:0.82rem;padding:0.3rem 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center">
              <span>{{ a.appellant?.firstName }} {{ a.appellant?.lastName || '' }}</span>
              <Tag :value="a.role" severity="info" style="font-size:0.65rem" />
            </div>
          </div>
          <div v-if="viewParties.respondents.length">
            <p class="text-xs font-semibold mb-2" style="color:#475569">RESPONDENTS</p>
            <div v-for="r in viewParties.respondents" :key="r.id" style="font-size:0.82rem;padding:0.3rem 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center">
              <span>{{ r.respondent?.name }}</span>
              <Tag v-if="r.respondent?.isDefault" value="Default" severity="success" style="font-size:0.65rem" />
            </div>
          </div>
        </div>
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

    <!-- Documents Dialog -->
    <Dialog v-model:visible="docsVisible" :header="`Documents — ${docsAppealNo}`" modal :style="{width:'650px'}">
      <div class="flex flex-col gap-4 mt-2">
        <!-- Upload -->
        <div class="p-3" style="background:#f8faf9; border-radius:8px; border:1px solid #e2e8f0">
          <h4 class="text-sm font-semibold mb-3" style="color:#1B6B3D">Upload Document</h4>
          <div class="flex gap-3 items-end flex-wrap">
            <div style="min-width:130px">
              <label class="view-label" style="display:block;margin-bottom:4px;font-size:0.78rem">Type</label>
              <Select v-model="docType" :options="docTypeOptions" style="width:100%" />
            </div>
            <div style="min-width:180px">
              <label class="view-label" style="display:block;margin-bottom:4px;font-size:0.78rem">File</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" @change="onDocFileSelect" style="font-size:0.82rem" />
            </div>
            <div style="min-width:130px">
              <label class="view-label" style="display:block;margin-bottom:4px;font-size:0.78rem">Remarks</label>
              <InputText v-model="docRemarks" placeholder="Optional" style="width:100%;font-size:0.82rem" />
            </div>
            <Button label="Upload" icon="pi pi-upload" size="small" :loading="docUploading" @click="uploadDocument" :disabled="!docFile" style="background:#1B6B3D;border-color:#1B6B3D" />
          </div>
        </div>

        <!-- List -->
        <DataTable :value="docsList" :loading="docsLoading" dataKey="id" stripedRows size="small">
          <Column header="#" style="width:3rem"><template #body="{index}">{{ index + 1 }}</template></Column>
          <Column field="originalName" header="File Name" />
          <Column field="documentType" header="Type">
            <template #body="{data}"><Tag :value="data.documentType" severity="info" /></template>
          </Column>
          <Column header="Size"><template #body="{data}">{{ (data.fileSize / 1024).toFixed(1) }} KB</template></Column>
          <Column header="" style="width:4rem">
            <template #body="{data}"><Button icon="pi pi-eye" text rounded size="small" @click="downloadDoc(data)" v-tooltip.top="'Preview'" /></template>
          </Column>
          <template #empty><div class="text-center py-4" style="color:#94a3b8;font-size:0.84rem">No documents uploaded yet.</div></template>
        </DataTable>
      </div>
      <template #footer><Button label="Close" outlined @click="docsVisible=false" /></template>
    </Dialog>

    <!-- Document Preview Dialog -->
    <Dialog v-model:visible="previewVisible" :header="previewName" modal :style="{width:'850px',maxWidth:'95vw'}" :contentStyle="{padding:0,height:'75vh'}">
      <iframe :src="previewUrl" style="width:100%;height:100%;border:none" />
      <template #footer>
        <Button label="Download" icon="pi pi-download" outlined @click="downloadFile" />
        <Button label="Close" outlined @click="previewVisible=false" />
      </template>
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
