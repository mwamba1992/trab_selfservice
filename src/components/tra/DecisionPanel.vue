<script setup>
import { computed } from 'vue';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { formatDate, humanize } from '@/utils/format.js';
import { useStoredFile } from '@/utils/tra/files.js';

const props = defineProps({
  appeal: { type: Object, required: true },
});

const { busy, openFile } = useStoredFile();

// A case counts as decided once any of the three decision fields is filled in
const decided = computed(() => {
  const a = props.appeal;
  return (!!a.outcomeOfDecision && a.outcomeOfDecision !== 'NO DECISION') || !!a.decidedDate || !!a.judgementFile;
});
const judgementName = computed(
  () => `Judgement-${props.appeal.appealNo || props.appeal.id}${props.appeal.judgementFile?.match(/\.[a-z0-9]+$/i)?.[0] ?? ''}`,
);
</script>

<template>
  <section class="decision" :class="{ pending: !decided }" aria-labelledby="decision-head">
    <h2 id="decision-head" class="sec-head"><i class="pi pi-verified" aria-hidden="true"></i> Board Decision</h2>

    <template v-if="decided">
      <dl class="decision-grid">
        <div>
          <dt>Outcome</dt>
          <dd>
            <Tag :value="humanize(appeal.outcomeOfDecision)" severity="success" />
          </dd>
        </div>
        <div>
          <dt>Decision date</dt>
          <dd>{{ formatDate(appeal.decidedDate) }}</dd>
        </div>
        <div>
          <dt>Won by</dt>
          <dd>{{ humanize(appeal.wonBy) }}</dd>
        </div>
        <div v-if="appeal.decidedBy">
          <dt>Decided by</dt>
          <dd>{{ appeal.decidedBy }}</dd>
        </div>
      </dl>
      <div v-if="appeal.summaryOfDecree" class="decree-block">
        <div class="lbl">Summary of decree</div>
        <p class="decree">{{ appeal.summaryOfDecree }}</p>
      </div>
      <div v-if="appeal.judgementFile" class="decision-actions">
        <Button
          type="button"
          label="View judgement"
          :icon="busy === `view:${appeal.judgementFile}` ? 'pi pi-spin pi-spinner' : 'pi pi-external-link'"
          class="trab-btn"
          :disabled="!!busy"
          @click="openFile(appeal.judgementFile, 'view')"
        />
        <Button
          type="button"
          label="Download"
          :icon="busy === `download:${appeal.judgementFile}` ? 'pi pi-spin pi-spinner' : 'pi pi-download'"
          outlined
          size="small"
          :disabled="!!busy"
          @click="openFile(appeal.judgementFile, 'download', judgementName)"
        />
      </div>
    </template>
    <p v-else class="pending-note">
      No decision has been delivered yet.
      <template v-if="appeal.expectedDecisionDate"> Expected by {{ formatDate(appeal.expectedDecisionDate) }}.</template>
    </p>
  </section>
</template>

<style scoped>
.decision {
  border: 1px solid #a6f4c5;
  background: #f6fef9;
  border-radius: 9px;
  padding: 0.9rem 1rem;
  margin-bottom: 1.15rem;
}
.decision.pending {
  border-color: var(--trab-border);
  background: #fcfcfd;
}
.sec-head {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--trab-label);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 0 0 0.6rem;
}
.decision-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
  gap: 0.6rem 1.15rem;
  margin: 0;
}
.decision-grid dt,
.lbl {
  font-size: 0.7rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  margin-bottom: 0.2rem;
}
.decision-grid dd {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--trab-heading);
}
.decree-block {
  margin-top: 0.75rem;
}
.decree {
  margin: 0;
  font-size: 0.82rem;
  color: var(--trab-label);
  white-space: pre-wrap;
}
.decision-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
.pending-note {
  margin: 0;
  font-size: 0.82rem;
  color: #6b7280;
}
</style>
