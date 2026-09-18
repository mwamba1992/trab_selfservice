<script setup>
import Tag from 'primevue/tag';
import { formatDate, humanize } from '@/utils/format.js';
import SectionError from './SectionError.vue';

defineProps({
  appeal: { type: Object, required: true },
  parties: { type: Object, default: () => ({ appellants: [], respondents: [] }) },
  partiesError: { type: String, default: '' },
});
const emit = defineEmits(['retry-parties']);
</script>

<template>
  <div>
    <h2 class="side-head">Case Summary</h2>
    <table class="view-table">
      <tbody>
        <tr>
          <td class="view-label">Appeal No.</td>
          <td>{{ appeal.appealNo || '-' }}</td>
        </tr>
        <tr>
          <td class="view-label">Appellant</td>
          <td>{{ appeal.appellantName }}</td>
        </tr>
        <tr>
          <td class="view-label">Tax Type</td>
          <td>{{ appeal.taxType?.name || '-' }}</td>
        </tr>
        <tr>
          <td class="view-label">Region</td>
          <td>{{ appeal.region?.name || '-' }}</td>
        </tr>
        <tr>
          <td class="view-label">Filed</td>
          <td>{{ formatDate(appeal.dateOfFiling) }}</td>
        </tr>
        <tr>
          <td class="view-label">Reply Due</td>
          <td>{{ formatDate(appeal.replyDueDate) }}</td>
        </tr>
        <tr>
          <td class="view-label">Status</td>
          <td><Tag :value="humanize(appeal.statusTrend)" severity="secondary" /></td>
        </tr>
        <tr>
          <td class="view-label">Decision</td>
          <td>
            <Tag :value="humanize(appeal.outcomeOfDecision)" :severity="appeal.outcomeOfDecision === 'NO DECISION' ? 'warn' : 'success'" />
          </td>
        </tr>
      </tbody>
    </table>

    <div class="side-section">
      <h2 class="side-head">Respondents</h2>
      <SectionError v-if="partiesError" compact :message="partiesError" @retry="emit('retry-parties')" />
      <template v-else>
        <div v-for="r in parties.respondents" :key="r.id" class="respondent">
          <i class="pi pi-building" aria-hidden="true"></i>{{ r.respondent?.name || r.respondentId }}
        </div>
        <div v-if="!parties.respondents.length" class="no-records">No respondent records.</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.side-head {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--trab-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 0 0 0.6rem;
}
.view-table {
  width: 100%;
  border-collapse: collapse;
}
.view-table tr {
  border-bottom: 1px solid #f1f5f9;
}
.view-table tr:last-child {
  border-bottom: none;
}
.view-table td {
  padding: 0.4rem 0;
  font-size: 0.82rem;
  vertical-align: middle;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.view-table td.view-label {
  color: var(--trab-muted);
  font-weight: 500;
  width: 45%;
  white-space: nowrap;
}
.side-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--trab-border);
}
.respondent {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  font-size: 0.82rem;
}
.respondent .pi {
  font-size: 0.7rem;
  color: var(--trab-primary);
}
.no-records {
  font-size: 0.82rem;
  color: var(--trab-muted);
}
</style>
