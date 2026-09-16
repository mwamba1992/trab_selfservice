<script setup>
import { computed, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { TraApi } from '@/service/TraApi.js';
import { apiErrorMessage, formatDateTime, humanize } from '@/utils/format.js';
import SectionError from './SectionError.vue';

const props = defineProps({
  appeal: { type: Object, required: true },
  canAssign: { type: Boolean, default: false },
  officers: { type: Array, default: () => [] },
  assignments: { type: Array, default: () => [] },
  officersError: { type: String, default: '' },
  assignmentsError: { type: String, default: '' },
});
const emit = defineEmits(['changed', 'retryOfficers', 'retryAssignments']);

const toast = useToast();
const selectedOfficer = ref(props.appeal.assignedOfficerId || null);
const assigning = ref(false);
const showHistory = ref(false);

const officerOptions = computed(() => props.officers.map((o) => ({ value: o.id, label: `${o.firstName} ${o.lastName}` })));

watch(
  () => props.appeal.assignedOfficerId,
  (v) => {
    selectedOfficer.value = v || null;
  },
);

const assign = async () => {
  if (!selectedOfficer.value) return;
  assigning.value = true;
  try {
    emit('changed', await TraApi.assign(props.appeal.id, selectedOfficer.value));
    toast.add({ severity: 'success', summary: 'Assigned', detail: 'Case assigned to officer', life: 3000 });
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Assignment failed',
      detail: apiErrorMessage(e, 'The case could not be assigned.'),
      life: 4000,
    });
  } finally {
    assigning.value = false;
  }
};

const unassign = async () => {
  assigning.value = true;
  try {
    emit('changed', await TraApi.unassign(props.appeal.id));
    selectedOfficer.value = null;
    toast.add({ severity: 'success', summary: 'Unassigned', detail: 'Case unassigned', life: 3000 });
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Unassign failed',
      detail: apiErrorMessage(e, 'The case could not be unassigned.'),
      life: 4000,
    });
  } finally {
    assigning.value = false;
  }
};
</script>

<template>
  <div class="side-section">
    <h2 class="side-head">Handling Officer</h2>
    <div class="current">
      <i class="pi pi-user-edit" aria-hidden="true"></i>
      <span v-if="appeal.assignedOfficerName" class="officer-name">{{ appeal.assignedOfficerName }}</span>
      <Tag v-else value="Unassigned" severity="warn" />
    </div>

    <template v-if="canAssign">
      <SectionError v-if="officersError" compact :message="officersError" @retry="emit('retryOfficers')" />
      <div v-else class="assign-form">
        <label for="assign-officer" class="sr-only">Assign to officer</label>
        <Select
          id="assign-officer"
          v-model="selectedOfficer"
          :options="officerOptions"
          option-label="label"
          option-value="value"
          placeholder="Select officer…"
          class="w-full"
          :disabled="assigning"
        />
        <div class="assign-actions">
          <!-- Assigning to the officer already holding the case would be a no-op -->
          <Button
            type="button"
            label="Assign"
            icon="pi pi-check"
            class="trab-btn flex-1"
            :loading="assigning"
            :disabled="assigning || !selectedOfficer || selectedOfficer === appeal.assignedOfficerId"
            @click="assign"
          />
          <Button
            v-if="appeal.assignedOfficerId"
            v-tooltip.top="'Unassign'"
            type="button"
            icon="pi pi-times"
            outlined
            size="small"
            :disabled="assigning"
            aria-label="Unassign officer"
            @click="unassign"
          />
        </div>
      </div>

      <!-- Assignment history -->
      <div class="history">
        <SectionError v-if="assignmentsError" compact :message="assignmentsError" @retry="emit('retryAssignments')" />
        <template v-else-if="assignments.length">
          <button
            type="button"
            class="hist-toggle"
            :aria-expanded="showHistory"
            aria-controls="assign-history"
            @click="showHistory = !showHistory"
          >
            <i class="pi" :class="showHistory ? 'pi-chevron-down' : 'pi-chevron-right'" aria-hidden="true"></i>
            Assignment history ({{ assignments.length }})
          </button>
          <ul v-show="showHistory" id="assign-history" class="hist-list">
            <li v-for="h in assignments" :key="h.id" class="hist-row">
              <Tag :value="humanize(h.action)" :severity="h.action === 'UNASSIGNED' ? 'danger' : 'success'" />
              <div class="hist-body">
                <span v-if="h.action === 'UNASSIGNED'">{{ h.previousOfficerName || '-' }} removed</span>
                <span v-else-if="h.action === 'REASSIGNED'"
                  >{{ h.previousOfficerName || '-' }} → <strong>{{ h.officerName }}</strong></span
                >
                <span v-else
                  ><strong>{{ h.officerName }}</strong></span
                >
                <div class="hist-meta">{{ h.changedByName || 'System' }} · {{ formatDateTime(h.createdAt) }}</div>
              </div>
            </li>
          </ul>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.side-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--trab-border);
}
.side-head {
  font-size: 0.75rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 0 0 0.5rem;
}
.current {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.current i {
  font-size: 0.75rem;
  color: var(--trab-primary);
}
.officer-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--trab-heading);
}
.assign-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.assign-actions {
  display: flex;
  gap: 0.5rem;
}
.history {
  margin-top: 0.75rem;
}
.hist-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #6b7280;
  cursor: pointer;
  background: none;
  border: 0;
  padding: 0;
  font-family: inherit;
}
.hist-toggle:hover {
  color: var(--trab-heading);
}
.hist-list {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
}
.hist-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid var(--trab-line);
}
.hist-body {
  font-size: 0.75rem;
  color: var(--trab-label);
  min-width: 0;
}
.hist-meta {
  font-size: 0.7rem;
  color: #6b7280;
  margin-top: 0.1rem;
}
</style>
