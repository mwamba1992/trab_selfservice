<script setup>
import { computed, onMounted, ref } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import { useToast } from 'primevue/usetoast';
import { TraApi } from '@/service/TraApi.js';
import AuthService from '@/service/AuthService.js';
import { apiErrorMessage, formatDate, formatDateTime, humanize } from '@/utils/format.js';
import { isInteractiveTarget } from '@/utils/tra/lists.js';
import SectionError from '@/components/tra/SectionError.vue';

// The TRA desk is English by policy, so this view carries no translation keys.
const toast = useToast();
const canRespond = computed(() => AuthService.can('TRA File Reply'));

const search = ref('');

const rows = ref([]);
const total = ref(0);
const page = ref(1);
const size = ref(10);
const loading = ref(false);
const loadError = ref('');
let requestSeq = 0;

// Searching is server-side; the current search text is read at fetch time.
const load = async () => {
  const seq = ++requestSeq;
  loading.value = true;
  loadError.value = '';
  try {
    const result = await TraApi.applications(page.value, size.value, search.value);
    if (seq !== requestSeq) return; // a newer request superseded this one
    rows.value = result.items;
    total.value = result.total;
  } catch (err) {
    if (seq !== requestSeq) return;
    rows.value = [];
    total.value = 0;
    loadError.value = apiErrorMessage(err, 'Could not load applications');
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
};

// Reload from page 1 (after a search or a clear).
const reload = () => {
  page.value = 1;
  load();
};

const runSearch = () => reload();
const clearSearch = () => {
  search.value = '';
  reload();
};

const onPage = (event) => {
  page.value = event.page + 1;
  size.value = event.rows;
  load();
};

// Detail dialog: the application, TRA's responses and the response form.
const selected = ref(null);
const responses = ref([]);
const responsesError = ref('');
const loadingResponses = ref(false);
const draft = ref('');
const filing = ref(false);

const visible = computed({
  get: () => selected.value !== null,
  set: (open) => {
    if (!open) selected.value = null;
  },
});

const loadResponses = async () => {
  if (!selected.value) return;
  loadingResponses.value = true;
  responsesError.value = '';
  try {
    responses.value = await TraApi.applicationResponses(selected.value.id);
  } catch (e) {
    responsesError.value = apiErrorMessage(e, 'Responses could not be loaded.');
  } finally {
    loadingResponses.value = false;
  }
};

const open = (row) => {
  selected.value = row;
  responses.value = [];
  draft.value = '';
  loadResponses();
};

// Row click is a mouse convenience; the application number in each row is the keyboard target.
const onRowClick = (event) => {
  if (isInteractiveTarget(event.originalEvent)) return;
  open(event.data);
};

const submit = async () => {
  if (!selected.value || !draft.value.trim()) return;
  filing.value = true;
  try {
    await TraApi.respondToApplication(selected.value.id, draft.value);
    draft.value = '';
    toast.add({ severity: 'success', summary: 'Filed', detail: 'Response filed', life: 3000 });
    await loadResponses();
    load();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Filing failed', detail: apiErrorMessage(e, 'The response could not be filed'), life: 4500 });
  } finally {
    filing.value = false;
  }
};

// A decided application shows its outcome; an undecided one shows where it has reached.
const statusBadge = (application) =>
  application.decided
    ? { severity: 'secondary', text: application.outcome ? humanize(application.outcome) : 'Decided' }
    : { severity: 'warn', text: humanize(application.status) || 'Pending' };

onMounted(load);
</script>

<template>
  <div>
    <div class="page-header">
      <h2>Applications</h2>
      <p>Applications before the Board on appeals against TRA, and standalone applications. Open one to read it and file TRA's response.</p>
    </div>

    <div class="ss-card">
      <form class="search-bar" role="search" @submit.prevent="runSearch">
        <label for="application-search" class="sr-only">Search applications</label>
        <InputText
          id="application-search"
          v-model="search"
          type="search"
          placeholder="Search application no., applicant or appeal no."
          class="search-input"
        />
        <Button type="submit" label="Search" icon="pi pi-search" class="trab-btn" size="small" />
        <Button v-if="search" type="button" label="Clear" outlined size="small" @click="clearSearch" />
      </form>

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
        @row-click="onRowClick"
      >
        <Column header="Application No.">
          <template #body="{ data }">
            <button type="button" class="row-link" @click="open(data)">{{ data.applicationNo || 'No number yet' }}</button>
            <div class="sub">{{ data.applicationType }}</div>
          </template>
        </Column>
        <Column header="Applicant">
          <template #body="{ data }">
            <div>{{ data.applicantName }}</div>
            <Tag v-if="data.applicantType === 'Respondent'" value="Lodged by TRA" severity="info" />
          </template>
        </Column>
        <Column header="Appeal">
          <template #body="{ data }">
            <router-link v-if="data.appealId" :to="`/tra/appeals/${data.appealId}`" class="row-link">{{
              data.appealNo || 'Open appeal'
            }}</router-link>
            <span v-else class="sub">Standalone</span>
          </template>
        </Column>
        <Column header="Filed"
          ><template #body="{ data }">{{ formatDate(data.dateOfFiling) }}</template></Column
        >
        <Column header="Status">
          <template #body="{ data }"><Tag :value="statusBadge(data).text" :severity="statusBadge(data).severity" /></template>
        </Column>
        <Column header="TRA Response">
          <template #body="{ data }">
            <Tag v-if="data.responseCount" :value="`Filed (${data.responseCount})`" severity="success" />
            <Tag v-else-if="data.decided" value="Not filed" severity="secondary" />
            <Tag v-else value="Awaiting response" severity="danger" />
          </template>
        </Column>
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-file-check"></i>
            <p>No applications found.</p>
          </div>
        </template>
      </DataTable>
    </div>

    <Dialog v-model:visible="visible" modal :header="selected?.applicationNo || 'Application'" :style="{ width: 'min(720px, 96vw)' }">
      <div v-if="selected">
        <dl class="facts">
          <div>
            <dt>Applicant</dt>
            <dd>{{ selected.applicantName }} ({{ selected.applicantType }})</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{{ selected.applicationType }} · {{ selected.applicationCategory }}</dd>
          </div>
          <div>
            <dt>Appeal</dt>
            <dd>{{ selected.appealNo || 'Standalone' }}</dd>
          </div>
          <div>
            <dt>Filed</dt>
            <dd>{{ formatDate(selected.dateOfFiling) }}</dd>
          </div>
          <div v-if="selected.taxType">
            <dt>Tax Type</dt>
            <dd>{{ selected.taxType }}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{{ statusBadge(selected).text }}</dd>
          </div>
        </dl>

        <h3 class="sec-head">Nature of Application</h3>
        <p class="prose">{{ selected.natureOfApplication || 'Not stated.' }}</p>

        <template v-if="selected.decided && selected.summaryOfDecision">
          <h3 class="sec-head">Board Decision</h3>
          <p class="prose">{{ selected.summaryOfDecision }}</p>
        </template>

        <!-- A decided application no longer takes a response. -->
        <div v-if="canRespond && !selected.decided" class="filing-form">
          <label for="application-response" class="fld-label">File TRA's response</label>
          <Textarea
            id="application-response"
            v-model="draft"
            rows="5"
            class="w-full"
            placeholder="TRA's reply or counter-affidavit to this application…"
            :disabled="filing"
          />
          <div class="actions">
            <Button
              label="File Response"
              icon="pi pi-send"
              class="trab-btn"
              :loading="filing"
              :disabled="filing || !draft.trim()"
              @click="submit"
            />
          </div>
        </div>

        <h3 class="sec-head">TRA Responses</h3>
        <SectionError v-if="responsesError" :message="responsesError" @retry="loadResponses" />
        <div v-else-if="loadingResponses" class="loading-line" aria-live="polite">
          <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Loading…
        </div>
        <template v-else>
          <article v-for="r in responses" :key="r.id" class="response-card">
            <div class="card-head">
              <strong class="who">{{ r.filedByName || 'TRA Officer' }}</strong>
              <span class="when">{{ formatDateTime(r.createdAt) }}</span>
            </div>
            <p class="prose m-0">{{ r.body }}</p>
          </article>
          <div v-if="!responses.length" class="empty-state">
            <i class="pi pi-comment" aria-hidden="true"></i>
            <p>No response filed yet.</p>
          </div>
        </template>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.search-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.9rem;
}
.search-input {
  flex: 1 1 16rem;
  min-width: 0;
}
.sub {
  font-size: 0.72rem;
  color: #6b7280;
}
.row-link {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-weight: 700;
  color: var(--trab-primary);
  text-decoration: none;
  cursor: pointer;
}
.row-link:hover {
  text-decoration: underline;
}
.row-link:focus-visible {
  outline: 2px solid var(--trab-primary);
  outline-offset: 2px;
  border-radius: 3px;
}
.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12.5rem, 1fr));
  gap: 0.65rem 1rem;
  margin: 0 0 1rem;
}
.facts dt {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #6b7280;
}
.facts dd {
  margin: 0.15rem 0 0;
  font-size: 0.82rem;
  color: var(--trab-heading, #1e293b);
}
.sec-head {
  font-size: 0.78rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 0 0 0.5rem;
}
.prose {
  font-size: 0.85rem;
  white-space: pre-wrap;
  margin: 0 0 1rem;
}
.filing-form {
  margin-bottom: 1rem;
}
.fld-label {
  display: block;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--trab-heading, #1e293b);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 0.5rem;
}
.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}
.loading-line {
  font-size: 0.82rem;
  color: #6b7280;
}
.response-card {
  border: 1px solid var(--trab-line);
  border-radius: 8px;
  padding: 0.75rem 0.9rem;
  margin-bottom: 0.65rem;
  background: #fcfcfd;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}
.who {
  font-size: 0.85rem;
  color: var(--trab-heading, #1e293b);
}
.when {
  font-size: 0.75rem;
  color: #6b7280;
}
</style>
