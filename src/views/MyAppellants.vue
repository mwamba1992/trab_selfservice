<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Menu from 'primevue/menu';
import { SelfServiceAppellants } from '@/service/SelfServiceApi.js';

const toast = useToast();
const appellants = ref([]);
const loading = ref(false);
const filterText = ref('');
const menuRef = ref();
const menuItem = ref(null);

// Search by TIN
const tinSearch = ref('');
const searchResults = ref([]);
const searching = ref(false);

// Register new
const registerVisible = ref(false);
const newForm = ref({ firstName: '', lastName: '', phone: '', email: '', tinNumber: '', vatNumber: '', natureOfBusiness: '', address: '' });

const loadData = async () => {
  loading.value = true;
  try { appellants.value = await SelfServiceAppellants.getAll(); }
  catch { toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load', life: 3000 }); }
  finally { loading.value = false; }
};

onMounted(loadData);

const filtered = computed(() => {
  if (!filterText.value) return appellants.value;
  const q = filterText.value.toLowerCase();
  return appellants.value.filter(a =>
    (a.firstName || '').toLowerCase().includes(q) ||
    (a.lastName || '').toLowerCase().includes(q) ||
    (a.tinNumber || '').toLowerCase().includes(q)
  );
});

// Search global pool by TIN
const searchByTin = async () => {
  if (!tinSearch.value || tinSearch.value.length < 3) {
    toast.add({ severity: 'warn', summary: 'TIN Required', detail: 'Enter at least 3 characters of the TIN number', life: 3000 });
    return;
  }
  searching.value = true;
  try {
    searchResults.value = await SelfServiceAppellants.searchByTin(tinSearch.value);
    if (!searchResults.value.length) {
      toast.add({ severity: 'info', summary: 'Not Found', detail: 'No appellant found with this TIN. You can register a new one.', life: 4000 });
    }
  } catch { toast.add({ severity: 'error', summary: 'Error', detail: 'Search failed', life: 3000 }); }
  finally { searching.value = false; }
};

// Link existing appellant
const linkAppellant = async (appellant) => {
  try {
    await SelfServiceAppellants.link(appellant.id);
    toast.add({ severity: 'success', summary: 'Added', detail: `${appellant.firstName} added to your clients`, life: 3000 });
    searchResults.value = [];
    tinSearch.value = '';
    await loadData();
  } catch (err) {
    toast.add({ severity: 'warn', summary: 'Note', detail: err.response?.data?.description || 'Already in your list', life: 3000 });
  }
};

// Unlink
const unlinkAppellant = async (appellant) => {
  try {
    await SelfServiceAppellants.unlink(appellant.id);
    toast.add({ severity: 'success', summary: 'Removed', detail: 'Removed from your client list', life: 3000 });
    await loadData();
  } catch { toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to remove', life: 3000 }); }
};

// Register new
const openRegister = () => {
  newForm.value = { firstName: '', lastName: '', phone: '', email: '', tinNumber: tinSearch.value || '', vatNumber: '', natureOfBusiness: '', address: '' };
  registerVisible.value = true;
};

const saveNew = async () => {
  if (!newForm.value.firstName || !newForm.value.tinNumber) {
    toast.add({ severity: 'warn', summary: 'Required', detail: 'Name and TIN are required', life: 3000 });
    return;
  }
  try {
    await SelfServiceAppellants.create(newForm.value);
    toast.add({ severity: 'success', summary: 'Registered', detail: 'Appellant registered and added to your clients', life: 3000 });
    registerVisible.value = false;
    searchResults.value = [];
    tinSearch.value = '';
    await loadData();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.description || 'Failed', life: 3000 });
  }
};

const getMenuItems = (item) => [
  { label: 'Remove from Clients', icon: 'pi pi-times', command: () => unlinkAppellant(item) },
];
const toggleMenu = (event, item) => { menuItem.value = item; menuRef.value.toggle(event); };
</script>

<template>
  <div>
    <div class="page-header">
      <h2>My Appellants</h2>
      <p>Manage companies and individuals you represent</p>
    </div>

    <!-- Search by TIN to add -->
    <div class="ss-card mb-3">
      <h4 class="text-sm font-semibold mb-2" style="color:#475569">Add Appellant by TIN Number</h4>
      <div class="flex items-center gap-3 flex-wrap">
        <InputText v-model="tinSearch" placeholder="Enter TIN number e.g. 123-456-789" style="width:300px;font-size:0.82rem;border-radius:8px" @keyup.enter="searchByTin" />
        <Button label="Search" icon="pi pi-search" class="trab-btn" size="small" :loading="searching" @click="searchByTin" />
        <Button label="Register New" icon="pi pi-plus" outlined size="small" @click="openRegister" />
      </div>

      <!-- Search Results -->
      <div v-if="searchResults.length" class="mt-3">
        <p class="text-xs font-semibold mb-2" style="color:#64748B">Found {{ searchResults.length }} result(s):</p>
        <div v-for="r in searchResults" :key="r.id" class="search-result">
          <div class="flex-1">
            <span class="text-sm font-semibold" style="color:#1E293B">{{ r.firstName }} {{ r.lastName || '' }}</span>
            <span class="text-xs ml-2" style="color:#64748B">TIN: {{ r.tinNumber }}</span>
            <span class="text-xs ml-2" style="color:#94a3b8">{{ r.phone || '' }}</span>
          </div>
          <Button label="Add to My Clients" icon="pi pi-plus" size="small" class="trab-btn" @click="linkAppellant(r)" />
        </div>
      </div>
    </div>

    <!-- My Clients List -->
    <div class="stat-bar">
      <div class="stat-item"><div class="stat-dot" style="background:#1B6B3D"></div> My Clients: <strong>{{ appellants.length }}</strong></div>
    </div>

    <div class="ss-card mb-3">
      <InputText v-model="filterText" placeholder="Filter by name or TIN..." style="width:320px;max-width:100%;font-size:0.82rem;border-radius:8px" />
    </div>

    <div class="ss-card">
      <DataTable :value="filtered" :loading="loading" paginator :rows="10" :rowsPerPageOptions="[10,25,50]" dataKey="id">
        <Column header="S/N" style="width:3.5rem"><template #body="{index}">{{ index + 1 }}</template></Column>
        <Column header="Name" sortable sortField="firstName">
          <template #body="{data}">{{ data.firstName }} {{ data.lastName || '' }}</template>
        </Column>
        <Column field="tinNumber" header="TIN" sortable />
        <Column field="phone" header="Phone" />
        <Column field="email" header="Email" />
        <Column field="natureOfBusiness" header="Business" />
        <Column header="Actions" style="width:4rem">
          <template #body="{data}"><Button icon="pi pi-ellipsis-v" text rounded size="small" @click="toggleMenu($event, data)" /></template>
        </Column>
        <template #empty>
          <div class="text-center py-8">
            <i class="pi pi-users text-3xl" style="color:#cbd5e1"></i>
            <p class="text-sm mt-2" style="color:#94a3b8">No clients yet. Search by TIN above to add appellants.</p>
          </div>
        </template>
      </DataTable>
    </div>

    <Menu ref="menuRef" :model="menuItem ? getMenuItems(menuItem) : []" popup />

    <!-- Register New Dialog -->
    <Dialog v-model:visible="registerVisible" header="Register New Appellant" modal :style="{width:'520px'}">
      <div class="flex flex-col gap-3 mt-2">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="field-label">Name / Company *</label><InputText v-model="newForm.firstName" class="w-full" /></div>
          <div><label class="field-label">Last Name</label><InputText v-model="newForm.lastName" class="w-full" /></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="field-label">TIN Number *</label><InputText v-model="newForm.tinNumber" class="w-full" /></div>
          <div><label class="field-label">VAT Number</label><InputText v-model="newForm.vatNumber" class="w-full" /></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="field-label">Phone</label><InputText v-model="newForm.phone" class="w-full" /></div>
          <div><label class="field-label">Email</label><InputText v-model="newForm.email" class="w-full" /></div>
        </div>
        <div><label class="field-label">Nature of Business</label><InputText v-model="newForm.natureOfBusiness" class="w-full" /></div>
        <div><label class="field-label">Address</label><InputText v-model="newForm.address" class="w-full" /></div>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="registerVisible = false" />
        <Button label="Register & Add" class="trab-btn" @click="saveNew" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.field-label { display: block; font-size: 0.78rem; font-weight: 600; color: #475569; margin-bottom: 0.3rem; font-family: 'Poppins', sans-serif; }
.search-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.75rem;
  background: #f8faf9;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  margin-bottom: 0.5rem;
}
</style>
