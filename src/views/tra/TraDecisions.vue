<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import RadioButton from 'primevue/radiobutton';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';
import { TraApi } from '@/service/TraApi.js';
import AuthService from '@/service/AuthService.js';
import { apiErrorMessage, formatDate, humanize } from '@/utils/format.js';
import { todayIso } from '@/utils/csv.js';
import { DECISION_ACTION_OPTIONS, decisionActionBadge, decisionActionProblem, isInteractiveTarget } from '@/utils/tra/lists.js';
import { openPreview } from '@/utils/tra/files.js';

// The TRA desk is English by policy, so this view carries no translation keys.
const router = useRouter();
const toast = useToast();

const canRecord = computed(() => AuthService.can('TRA File Reply'));

const wonSeverity = (wonBy) => (/tra|commissioner|respondent/i.test(wonBy || '') ? 'success' : 'danger');

// ─── Server-side paging ───
const rows = ref([]);
const total = ref(0);
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
    const result = await TraApi.decisions(page.value, size.value);
    if (seq !== requestSeq) return; // a newer request superseded this one
    rows.value = result.items;
    total.value = result.total;
  } catch (err) {
    if (seq !== requestSeq) return;
    rows.value = [];
    total.value = 0;
    loadError.value = apiErrorMessage(err, 'Could not load decisions.');
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
};

const onPage = (event) => {
  page.value = event.page + 1;
  size.value = event.rows;
  load();
};

// Rows are a mouse convenience; each row also carries the appeal link as the keyboard target.
const openAppeal = (event) => {
  if (isInteractiveTarget(event.originalEvent)) return;
  if (window.getSelection()?.toString()) return; // selecting text, not navigating
  router.push(`/tra/appeals/${event.data.id}`);
};

// Long decree summaries are clamped; expanded rows show the full text.
const SUMMARY_CLAMP = 140;
const expanded = ref([]);
const toggleSummary = (id) => {
  expanded.value = expanded.value.includes(id) ? expanded.value.filter((x) => x !== id) : [...expanded.value, id];
};

// Opens the judgement in the portal's preview window; download and print are available there.
const viewJudgement = (decision) => {
  if (!decision.judgementFile) return;
  const fileName = decision.judgementFile.split('/').pop() || decision.judgementFile;
  const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '.pdf';
  const label = decision.appealNo || decision.appellantName;
  openPreview({
    fileName,
    title: `Judgement · ${label}`,
    downloadName: `judgement-${label.replace(/[^\w.-]+/g, '-')}${ext}`,
  });
};

// ─── Recording what TRA did about the decision ───
const target = ref(null);
const form = reactive({ action: 'ASSESSMENT_REVISED', details: '', actionDate: '' });
const saving = ref(false);
const touched = ref(false);
const problem = computed(() => decisionActionProblem(form));

const visible = computed({
  get: () => target.value !== null,
  set: (open) => {
    if (!open) target.value = null;
  },
});

const openAction = (decision) => {
  const existing = decision.decisionAction;
  form.action = existing?.action ?? 'ASSESSMENT_REVISED';
  form.details = existing?.details ?? '';
  form.actionDate = existing?.actionDate ?? todayIso();
  touched.value = false;
  target.value = decision;
};

const save = async () => {
  touched.value = true;
  if (!target.value || problem.value) return;
  saving.value = true;
  try {
    await TraApi.setDecisionAction(target.value.id, {
      action: form.action,
      details: form.details.trim() || undefined,
      actionDate: form.actionDate || undefined,
    });
    toast.add({ severity: 'success', summary: 'Recorded', detail: 'Action recorded against the decision', life: 3000 });
    target.value = null;
    load();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Not saved', detail: apiErrorMessage(err, 'The action could not be recorded'), life: 4500 });
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div>
    <div class="page-header">
      <h2>Decisions</h2>
      <p>Board decisions delivered to TRA. Record what TRA did about each one, or consider an onward appeal to the Tribunal.</p>
    </div>

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
        :total-records="total"
        :rows-per-page-options="[10, 25, 50]"
        data-key="id"
        row-hover
        @page="onPage"
        @row-click="openAppeal"
      >
        <Column header="Appeal No.">
          <template #body="{ data }">
            <router-link :to="`/tra/appeals/${data.id}`" class="row-link">{{ data.appealNo || 'No number yet' }}</router-link>
          </template>
        </Column>
        <Column field="appellantName" header="Appellant" />
        <Column header="Tax Type"
          ><template #body="{ data }">{{ data.taxType?.name || '-' }}</template></Column
        >
        <Column header="Decided"
          ><template #body="{ data }">{{ formatDate(data.decidedDate) }}</template></Column
        >
        <Column header="Outcome">
          <template #body="{ data }"><Tag :value="humanize(data.outcomeOfDecision)" severity="secondary" /></template>
        </Column>
        <Column header="Won By">
          <template #body="{ data }">
            <Tag v-if="data.wonBy" :value="humanize(data.wonBy)" :severity="wonSeverity(data.wonBy)" />
            <span v-else>-</span>
          </template>
        </Column>
        <Column header="TRA Action">
          <template #body="{ data }">
            <Tag :value="decisionActionBadge(data.decisionAction).text" :severity="decisionActionBadge(data.decisionAction).severity" />
            <div v-if="data.decisionAction?.actionDate" class="sub mt-1">
              {{ formatDate(data.decisionAction.actionDate) }}
            </div>
            <button v-if="canRecord" type="button" class="more-btn" @click="openAction(data)">
              {{ data.decisionAction ? 'Update' : 'Record action' }}
            </button>
          </template>
        </Column>
        <Column header="Summary of Decree" style="min-width: 16rem">
          <template #body="{ data }">
            <template v-if="data.summaryOfDecree">
              <span class="summary">{{
                expanded.includes(data.id) || data.summaryOfDecree.length <= SUMMARY_CLAMP
                  ? data.summaryOfDecree
                  : `${data.summaryOfDecree.slice(0, SUMMARY_CLAMP).trimEnd()}…`
              }}</span>
              <button
                v-if="data.summaryOfDecree.length > SUMMARY_CLAMP"
                type="button"
                class="more-btn"
                :aria-expanded="expanded.includes(data.id)"
                @click="toggleSummary(data.id)"
              >
                {{ expanded.includes(data.id) ? 'Show less' : 'Show more' }}
              </button>
            </template>
            <span v-else class="sub">-</span>
          </template>
        </Column>
        <Column header="Judgement">
          <template #body="{ data }">
            <Button
              v-if="data.judgementFile"
              label="View judgement"
              icon="pi pi-file-pdf"
              outlined
              size="small"
              class="judgement-btn"
              :aria-label="`View judgement for ${data.appealNo || data.appellantName}`"
              @click="viewJudgement(data)"
            />
            <span v-else class="sub">Not uploaded</span>
          </template>
        </Column>
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-verified"></i>
            <p>No decisions delivered yet.</p>
          </div>
        </template>
      </DataTable>
    </div>

    <Dialog v-model:visible="visible" modal header="Record TRA's Action" :style="{ width: 'min(620px, 96vw)' }">
      <form v-if="target" class="flex flex-col gap-4" @submit.prevent="save">
        <p class="case-line">
          <strong>{{ target.appealNo || 'Appeal' }}</strong> · {{ target.appellantName }} · decided {{ formatDate(target.decidedDate) }}
          <template v-if="target.wonBy"> · won by {{ humanize(target.wonBy).toLowerCase() }}</template>
        </p>

        <fieldset class="choices">
          <legend class="field-label">What did TRA do?</legend>
          <div v-for="o in DECISION_ACTION_OPTIONS" :key="o.value" class="choice" :class="{ active: form.action === o.value }">
            <RadioButton v-model="form.action" :input-id="`decision-action-${o.value}`" name="decision-action" :value="o.value" />
            <label :for="`decision-action-${o.value}`">{{ o.label }}</label>
          </div>
        </fieldset>

        <div>
          <!-- Only "No action required" may be filed without an explanation. -->
          <label for="action-details" class="field-label">
            {{ form.action === 'NO_ACTION_REQUIRED' ? 'Remarks (optional)' : 'Details (required)' }}
          </label>
          <Textarea
            id="action-details"
            v-model="form.details"
            rows="3"
            maxlength="4000"
            class="w-full"
            placeholder="e.g. Refund of TZS 12,400,000 paid on voucher 88231"
          />
        </div>

        <div>
          <label for="action-date" class="field-label">Date of the action (optional)</label>
          <input id="action-date" v-model="form.actionDate" type="date" class="date-input" />
        </div>

        <p v-if="touched && problem" class="form-error" role="alert">{{ problem }}</p>

        <div class="flex justify-end gap-2">
          <Button type="button" label="Cancel" outlined size="small" :disabled="saving" @click="target = null" />
          <Button
            type="submit"
            label="Save"
            :icon="saving ? 'pi pi-spin pi-spinner' : 'pi pi-check'"
            class="trab-btn"
            size="small"
            :disabled="saving"
          />
        </div>
      </form>
    </Dialog>
  </div>
</template>

<style scoped>
.row-link {
  font-weight: 700;
  color: var(--trab-primary);
  text-decoration: none;
}
.row-link:hover {
  text-decoration: underline;
}
.sub {
  font-size: 0.72rem;
  color: var(--trab-muted);
}
.summary {
  white-space: pre-line;
}
.more-btn {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--trab-primary);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  font-family: inherit;
}
.more-btn:focus-visible,
.row-link:focus-visible {
  outline: 2px solid var(--trab-primary);
  outline-offset: 2px;
  border-radius: 3px;
}
.judgement-btn {
  white-space: nowrap;
}
.case-line {
  margin: 0;
  font-size: 0.84rem;
}
.field-label {
  display: block;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--trab-heading, #1e293b);
  margin-bottom: 0.4rem;
}
.choices {
  border: 0;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}
.choice {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--trab-border);
  border-radius: 8px;
  font-size: 0.82rem;
  cursor: pointer;
}
.choice.active {
  border-color: var(--trab-primary);
  background: rgba(27, 107, 61, 0.06);
}
.choice label {
  cursor: pointer;
}
.date-input {
  width: 100%;
  padding: 0.5rem 0.6rem;
  border: 1px solid var(--trab-border);
  border-radius: 8px;
  font-size: 0.82rem;
  font-family: inherit;
  background: #fff;
}
.form-error {
  margin: 0;
  font-size: 0.82rem;
  color: var(--trab-danger);
}
</style>
