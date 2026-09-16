<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import RadioButton from 'primevue/radiobutton';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';
import { TraApi } from '@/service/TraApi.js';
import AuthService from '@/service/AuthService.js';
import { apiErrorMessage, formatDate, humanize } from '@/utils/format.js';
import { ATTENDANCE_OPTIONS, hearingResponseBadge, hearingResponseProblem, isInteractiveTarget } from '@/utils/tra/lists.js';

// The TRA desk is English by policy, so this view carries no translation keys.
const router = useRouter();
const toast = useToast();

const canRespond = computed(() => AuthService.can('TRA File Reply'));

const statusSeverity = (status) => (status === 'SERVED' ? 'success' : status === 'CONCLUDED' ? 'secondary' : 'warn');

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
    const result = await TraApi.summons(page.value, size.value);
    if (seq !== requestSeq) return; // a newer request superseded this one
    rows.value = result.items;
    total.value = result.total;
  } catch (err) {
    if (seq !== requestSeq) return;
    rows.value = [];
    total.value = 0;
    loadError.value = apiErrorMessage(err, 'Could not load summons.');
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
  router.push(`/tra/appeals/${event.data.appealId}`);
};

// ─── Response dialog ───
const target = ref(null);
const form = reactive({ attendance: 'ATTENDING', appearingCounsel: '', witnesses: '', remarks: '' });
const saving = ref(false);
const touched = ref(false);
const problem = computed(() => hearingResponseProblem(form));

const visible = computed({
  get: () => target.value !== null,
  set: (open) => {
    if (!open) target.value = null;
  },
});

const openResponse = (item) => {
  const response = item.response;
  form.attendance = response?.attendance ?? 'ATTENDING';
  form.appearingCounsel = response?.appearingCounsel ?? '';
  form.witnesses = response?.witnesses ?? '';
  form.remarks = response?.remarks ?? '';
  touched.value = false;
  target.value = item;
};

const save = async () => {
  touched.value = true;
  if (!target.value || problem.value) return;
  saving.value = true;
  try {
    await TraApi.respondToHearing(target.value.summonsAppealId, {
      attendance: form.attendance,
      appearingCounsel: form.appearingCounsel.trim() || undefined,
      witnesses: form.witnesses.trim() || undefined,
      remarks: form.remarks.trim() || undefined,
    });
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Hearing response sent to the Board', life: 3000 });
    target.value = null;
    load();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Not saved', detail: apiErrorMessage(err, 'The response could not be saved'), life: 4500 });
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div>
    <div class="page-header">
      <h2>Summons</h2>
      <p>Hearing summons served on TRA. Confirm attendance and the appearing counsel, or request an adjournment.</p>
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
        data-key="summonsAppealId"
        row-hover
        @page="onPage"
        @row-click="openAppeal"
      >
        <Column header="Appeal No.">
          <template #body="{ data }">
            <router-link :to="`/tra/appeals/${data.appealId}`" class="row-link">{{ data.appealNo || 'No number yet' }}</router-link>
            <div class="sub">{{ data.appellantName || '-' }}</div>
          </template>
        </Column>
        <Column header="Hearing">
          <template #body="{ data }">
            <div>
              {{ formatDate(data.summons?.startDate) }}<span v-if="data.summons?.time" class="sub-inline"> · {{ data.summons.time }}</span>
            </div>
            <div class="sub">{{ data.summons?.venue || '-' }}</div>
          </template>
        </Column>
        <Column header="Panel"
          ><template #body="{ data }">{{ data.summons?.judge?.name || '-' }}</template></Column
        >
        <Column header="Status">
          <template #body="{ data }">
            <Tag :value="humanize(data.summons?.status)" :severity="statusSeverity(data.summons?.status)" />
          </template>
        </Column>
        <Column header="TRA Response">
          <template #body="{ data }">
            <Tag
              :value="hearingResponseBadge(data.response, data.summons?.status).text"
              :severity="hearingResponseBadge(data.response, data.summons?.status).severity"
            />
            <div v-if="data.response?.appearingCounsel" class="sub mt-1">{{ data.response.appearingCounsel }}</div>
          </template>
        </Column>
        <Column v-if="canRespond" header="">
          <template #body="{ data }">
            <Button
              v-if="data.summons?.status !== 'CONCLUDED'"
              :label="data.response ? 'Update' : 'Respond'"
              outlined
              size="small"
              @click="openResponse(data)"
            />
          </template>
        </Column>
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-calendar"></i>
            <p>No summons served on TRA.</p>
          </div>
        </template>
      </DataTable>
    </div>

    <Dialog v-model:visible="visible" modal header="Respond to Summons" :style="{ width: 'min(620px, 96vw)' }">
      <form v-if="target" class="flex flex-col gap-4" @submit.prevent="save">
        <p class="case-line">
          <strong>{{ target.appealNo || 'Appeal' }}</strong> · {{ target.appellantName || '-' }} · hearing
          {{ formatDate(target.summons?.startDate) }}<template v-if="target.summons?.venue"> at {{ target.summons.venue }}</template>
        </p>

        <fieldset class="choices">
          <legend class="field-label">Attendance</legend>
          <div v-for="o in ATTENDANCE_OPTIONS" :key="o.value" class="choice" :class="{ active: form.attendance === o.value }">
            <RadioButton v-model="form.attendance" :input-id="`attendance-${o.value}`" name="attendance" :value="o.value" />
            <label :for="`attendance-${o.value}`">{{ o.label }}</label>
          </div>
        </fieldset>

        <div v-if="form.attendance === 'ATTENDING'">
          <label for="counsel" class="field-label">Appearing counsel or officer (required)</label>
          <InputText
            id="counsel"
            v-model="form.appearingCounsel"
            maxlength="1000"
            class="w-full"
            placeholder="e.g. Adv. Jane Mushi, TRA Legal Services"
          />
        </div>
        <div v-if="form.attendance === 'ATTENDING'">
          <label for="witnesses" class="field-label">Witnesses (optional)</label>
          <Textarea id="witnesses" v-model="form.witnesses" rows="3" maxlength="4000" class="w-full" placeholder="One witness per line" />
        </div>
        <div>
          <label for="remarks" class="field-label">{{
            form.attendance === 'ATTENDING' ? 'Remarks (optional)' : 'Reason (required)'
          }}</label>
          <Textarea
            id="remarks"
            v-model="form.remarks"
            rows="3"
            maxlength="4000"
            class="w-full"
            :placeholder="form.attendance === 'ADJOURNMENT_REQUESTED' ? 'Why TRA seeks an adjournment…' : 'Anything the Board should know…'"
          />
        </div>

        <p v-if="touched && problem" class="form-error" role="alert">{{ problem }}</p>

        <div class="flex justify-end gap-2">
          <Button type="button" label="Cancel" outlined size="small" :disabled="saving" @click="target = null" />
          <Button
            type="submit"
            label="Send to Board"
            :icon="saving ? 'pi pi-spin pi-spinner' : 'pi pi-send'"
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
.sub-inline {
  color: var(--trab-muted);
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
.form-error {
  margin: 0;
  font-size: 0.82rem;
  color: var(--trab-danger);
}
</style>
