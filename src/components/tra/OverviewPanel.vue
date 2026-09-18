<script setup>
import { computed } from 'vue';
import { formatMoney } from '@/utils/format.js';
import DecisionPanel from './DecisionPanel.vue';
import SectionError from './SectionError.vue';

const props = defineProps({
  appeal: { type: Object, required: true },
  parties: { type: Object, default: () => ({ appellants: [], respondents: [] }) },
  partiesError: { type: String, default: '' },
});
const emit = defineEmits(['retry-parties']);

const appellantName = (p) => [p.appellant?.firstName, p.appellant?.lastName].filter(Boolean).join(' ') || props.appeal.appellantName || '-';

const particulars = computed(() =>
  [
    { label: 'Nature of appeal', value: props.appeal.natureOfAppeal },
    { label: 'Assessment No.', value: props.appeal.assessmentNo },
    { label: 'Taxed office', value: props.appeal.taxedOffice },
  ].filter((p) => !!p.value),
);
</script>

<template>
  <div>
    <DecisionPanel :appeal="appeal" />

    <h2 class="sec-head">Appellants</h2>
    <SectionError v-if="partiesError" :message="partiesError" @retry="emit('retry-parties')" />
    <template v-else>
      <div v-for="p in parties.appellants" :key="p.id" class="party-chip">
        <i class="pi pi-user" aria-hidden="true"></i>{{ appellantName(p) }}
        <span v-if="p.appellant?.tinNumber" class="tin">TIN {{ p.appellant.tinNumber }}</span>
      </div>
      <div v-if="!parties.appellants.length" class="no-records">No appellant records.</div>
    </template>

    <template v-if="particulars.length || appeal.amounts?.length || appeal.remarks">
      <h2 class="sec-head mt-5">Particulars</h2>
      <table class="view-table">
        <tbody>
          <tr v-for="p in particulars" :key="p.label">
            <td class="view-label">{{ p.label }}</td>
            <td>{{ p.value }}</td>
          </tr>
          <tr v-if="appeal.amounts?.length">
            <td class="view-label">Amount in dispute</td>
            <td>
              <div v-for="a in appeal.amounts" :key="a.id">{{ a.currency }} {{ formatMoney(a.amount) }}</div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="appeal.remarks" class="remarks">
        <div class="lbl">Remarks</div>
        <p>{{ appeal.remarks }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.sec-head {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--trab-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 0 0 0.6rem;
}
.party-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #f1f7f3;
  border: 1px solid var(--trab-line);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  margin: 0 0.5rem 0.5rem 0;
}
.party-chip .pi {
  color: var(--trab-primary);
  font-size: 0.75rem;
}
.tin {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--trab-muted);
}
.no-records {
  font-size: 0.82rem;
  color: var(--trab-muted);
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
  padding: 0.45rem 0.5rem 0.45rem 0;
  font-size: 0.82rem;
  font-weight: 600;
  vertical-align: top;
  overflow-wrap: anywhere;
}
.view-table td.view-label {
  color: var(--trab-muted);
  font-weight: 500;
  width: 12.5rem;
}
.remarks {
  margin-top: 0.75rem;
}
.lbl {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--trab-muted);
  text-transform: uppercase;
  margin-bottom: 0.2rem;
}
.remarks p {
  margin: 0;
  font-size: 0.82rem;
  white-space: pre-wrap;
}
</style>
