<script setup>
import { computed, onMounted, ref } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import OfficerDialog from '@/components/tra/OfficerDialog.vue';
import ReplyDeadlineCard from '@/components/tra/ReplyDeadlineCard.vue';
import { TraApi } from '@/service/TraApi.js';
import AuthService from '@/service/AuthService.js';
import { session } from '@/service/session.js';
import { apiErrorMessage, formatDate, humanize } from '@/utils/format.js';

// The TRA desk is English by policy, so this view carries no translation keys.
const toast = useToast();
const confirm = useConfirm();

const isAdminOfficer = (o) => o.role?.name === 'tra-admin';
const roleLabel = (o) => (isAdminOfficer(o) ? 'Admin' : 'Officer');
const fullName = (o) => `${o.firstName} ${o.lastName}`.trim();

// Changing the reply deadline is a settings action, gated separately from user admin.
const canSettings = computed(() => AuthService.can('TRA Manage Settings'));
const currentUserId = session.getUserId() || '';

// ─── List (server-side paging) ───
const rows = ref([]);
const total = ref(null);
const page = ref(1);
const size = ref(10);
const loading = ref(false);
const loadError = ref('');
let requestSeq = 0;

const load = async () => {
  const seq = ++requestSeq;
  loading.value = true;
  loadError.value = '';
  try {
    const result = await TraApi.officers(page.value, size.value);
    if (seq !== requestSeq) return; // a newer request superseded this one
    rows.value = result.items;
    total.value = result.total;
  } catch (err) {
    if (seq !== requestSeq) return;
    rows.value = [];
    total.value = null;
    loadError.value = apiErrorMessage(err, 'Could not load officers');
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
};

const onPage = (event) => {
  page.value = event.page + 1;
  size.value = event.rows;
  load();
};

const reload = () => load();

onMounted(load);

// ─── Create / edit ───
const dialogOpen = ref(false);
const editing = ref(null);

const openNew = () => {
  editing.value = null;
  dialogOpen.value = true;
};
const openEdit = (o) => {
  editing.value = o;
  dialogOpen.value = true;
};

// ─── Activate / deactivate (PATCH status) ───
const busyId = ref(null);
const isSelf = (o) => o.id === currentUserId;
const isActive = (o) => o.status === 'active';

const statusSeverity = { active: 'success', inactive: 'danger', suspended: 'warn' };

const setStatus = async (o, status) => {
  busyId.value = o.id;
  try {
    await TraApi.updateOfficer(o.id, { status });
    toast.add({
      severity: 'success',
      summary: status === 'active' ? 'Officer activated' : 'Officer deactivated',
      detail: fullName(o),
      life: 3000,
    });
    reload();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Status change failed', detail: apiErrorMessage(e), life: 5000 });
  } finally {
    busyId.value = null;
  }
};

const toggleStatus = (o) => {
  const deactivating = isActive(o);
  confirm.require({
    header: deactivating ? 'Deactivate officer?' : 'Activate officer?',
    message: deactivating
      ? `${fullName(o)} will no longer be able to sign in. Their assigned cases stay as they are.`
      : `${fullName(o)} will be able to sign in again.`,
    icon: deactivating ? 'pi pi-exclamation-triangle' : 'pi pi-check-circle',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: deactivating ? 'Deactivate' : 'Activate', severity: deactivating ? 'danger' : 'primary' },
    accept: () => setStatus(o, deactivating ? 'inactive' : 'active'),
  });
};
</script>

<template>
  <div>
    <div class="officers-head">
      <div class="page-header">
        <h2>TRA Officers</h2>
        <p>
          Provision and manage TRA officers who defend appeals on the Authority's behalf.
          <span v-if="total !== null" class="officers-count">{{ total }} {{ total === 1 ? 'officer' : 'officers' }}</span>
        </p>
      </div>
      <Button label="Add officer" icon="pi pi-plus" class="trab-btn" size="small" @click="openNew" />
    </div>

    <ReplyDeadlineCard v-if="canSettings" />

    <div class="ss-card">
      <div v-if="loadError" class="note note-error mb-3" role="alert">
        <i class="pi pi-exclamation-triangle"></i>
        <span class="flex-1">{{ loadError }}</span>
        <Button label="Try again" size="small" outlined @click="load" />
      </div>

      <DataTable
        :value="rows"
        :loading="loading"
        lazy
        paginator
        :rows="size"
        :first="(page - 1) * size"
        :total-records="total ?? 0"
        :rows-per-page-options="[10, 25, 50]"
        data-key="id"
        row-hover
        @page="onPage"
      >
        <Column header="Name">
          <template #body="{ data }">
            <div class="officer-name">{{ fullName(data) }}</div>
            <div class="officer-email">{{ data.email }}</div>
          </template>
        </Column>
        <Column header="Phone">
          <template #body="{ data }">{{ data.phone || '-' }}</template>
        </Column>
        <Column header="Role">
          <template #body="{ data }"><Tag :value="roleLabel(data)" :severity="isAdminOfficer(data) ? 'info' : 'secondary'" /></template>
        </Column>
        <Column header="Caseload">
          <template #body="{ data }"><Tag :value="String(data.caseload ?? 0)" :severity="data.caseload ? 'info' : 'secondary'" /></template>
        </Column>
        <Column header="Status">
          <template #body="{ data }"
            ><Tag :value="humanize(data.status)" :severity="statusSeverity[data.status] ?? 'secondary'"
          /></template>
        </Column>
        <Column header="Added">
          <template #body="{ data }">{{ formatDate(data.createdAt) }}</template>
        </Column>
        <Column header="Actions" class="officer-actions-col">
          <template #body="{ data }">
            <div class="officer-actions">
              <Button
                v-tooltip.top="'Edit'"
                text
                size="small"
                icon="pi pi-pencil"
                :aria-label="`Edit ${fullName(data)}`"
                @click="openEdit(data)"
              />
              <!-- An officer cannot switch off their own account. -->
              <Button
                v-if="!isSelf(data)"
                v-tooltip.top="isActive(data) ? 'Deactivate' : 'Activate'"
                text
                size="small"
                :severity="isActive(data) ? 'danger' : 'success'"
                :icon="busyId === data.id ? 'pi pi-spin pi-spinner' : isActive(data) ? 'pi pi-ban' : 'pi pi-check-circle'"
                :aria-label="`${isActive(data) ? 'Deactivate' : 'Activate'} ${fullName(data)}`"
                :disabled="busyId === data.id"
                @click="toggleStatus(data)"
              />
            </div>
          </template>
        </Column>
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-users"></i>
            <p>No officers yet.</p>
            <Button label="Add the first officer" icon="pi pi-plus" class="trab-btn officers-empty-cta" size="small" @click="openNew" />
          </div>
        </template>
      </DataTable>
    </div>

    <OfficerDialog v-model:visible="dialogOpen" :officer="editing" :current-user-id="currentUserId" @saved="reload" />
  </div>
</template>

<style scoped>
.officers-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.officers-count {
  margin-left: 0.4rem;
  font-weight: 700;
  color: var(--trab-heading, #1e293b);
}
.officer-name {
  font-weight: 700;
  color: var(--trab-heading, #1e293b);
}
.officer-email {
  font-size: 0.74rem;
  color: var(--trab-muted);
  overflow-wrap: anywhere;
}
.officer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.125rem;
}
:deep(.officer-actions-col) {
  width: 6rem;
}
.officers-empty-cta {
  margin-top: 0.75rem;
}
</style>
