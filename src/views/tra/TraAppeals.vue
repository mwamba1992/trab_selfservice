<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { TraApi } from '@/service/TraApi.js';
import AuthService from '@/service/AuthService.js';
import { apiErrorMessage, formatDate, humanize } from '@/utils/format.js';
import { downloadCsv, isoDate, todayIso } from '@/utils/csv.js';
import { replyBadge } from '@/utils/tra/lists.js';

// The TRA desk is English by policy, so this view carries no translation keys.
const route = useRoute();
const router = useRouter();
const toast = useToast();

const STATUSES = ['NEW', 'HEARING_SCHEDULED', 'CONCLUDED', 'DECIDED'];
const RANGES = [
  { key: '1W', label: '-1W', title: 'Filed in the last week' },
  { key: '1M', label: '-1M', title: 'Filed in the last month' },
  { key: '3M', label: '-3M', title: 'Filed in the last 3 months' },
  { key: '6M', label: '-6M', title: 'Filed in the last 6 months' },
  { key: '1Y', label: '-1Y', title: 'Filed in the last year' },
];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isSupervisor = computed(() => AuthService.can('TRA Assign Cases'));
const canPickOfficer = computed(() => AuthService.can('TRA Manage Users'));
const officers = ref([]);

// ─── Filter state (all applied server-side) ───
const defaultScope = () => (isSupervisor.value ? 'all' : 'mine');
const scope = ref(defaultScope());
const overdueOnly = ref(false);
const searchDraft = ref('');
const search = ref('');
const reply = ref('');
const status = ref('');
const officerId = ref('');
const dateFrom = ref('');
const dateTo = ref('');
const range = ref('');

const rows = ref([]);
const total = ref(0);
const page = ref(1);
const size = ref(10);
const loading = ref(false);
const loadError = ref('');
let requestSeq = 0;

const rangeStart = (key) => {
  const date = new Date();
  if (key === '1W') date.setDate(date.getDate() - 7);
  else date.setMonth(date.getMonth() - { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 }[key]);
  return isoDate(date);
};

const firstValue = (value) => {
  const one = Array.isArray(value) ? value[0] : value;
  return typeof one === 'string' ? one : '';
};
const queryKey = (query) =>
  JSON.stringify(
    Object.keys(query)
      .sort()
      .map((key) => [key, firstValue(query[key])])
      .filter(([, value]) => value),
  );

// URL query <-> filters, so dashboard tiles can deep-link (e.g. /tra/appeals?overdue=1).
const readQuery = (query) => {
  const wanted = firstValue(query.scope);
  scope.value = wanted === 'mine' || wanted === 'all' ? wanted : defaultScope();
  overdueOnly.value = ['1', 'true'].includes(firstValue(query.overdue));
  const wantedReply = firstValue(query.reply);
  reply.value = wantedReply === 'filed' || wantedReply === 'pending' ? wantedReply : '';
  const wantedStatus = firstValue(query.status);
  status.value = STATUSES.includes(wantedStatus) ? wantedStatus : '';
  officerId.value = firstValue(query.officer);
  search.value = firstValue(query.q).trim();
  searchDraft.value = search.value;
  const wantedRange = RANGES.find((r) => r.key === firstValue(query.range))?.key ?? '';
  range.value = wantedRange;
  if (wantedRange) {
    dateFrom.value = rangeStart(wantedRange);
    dateTo.value = todayIso();
  } else {
    dateFrom.value = ISO_DATE.test(firstValue(query.from)) ? firstValue(query.from) : '';
    dateTo.value = ISO_DATE.test(firstValue(query.to)) ? firstValue(query.to) : '';
  }
};

const buildQuery = () => {
  const query = {};
  if (scope.value !== defaultScope()) query.scope = scope.value;
  if (overdueOnly.value) query.overdue = '1';
  if (reply.value) query.reply = reply.value;
  if (status.value) query.status = status.value;
  if (scope.value === 'all' && officerId.value) query.officer = officerId.value;
  if (search.value) query.q = search.value;
  if (range.value) query.range = range.value;
  else {
    if (dateFrom.value) query.from = dateFrom.value;
    if (dateTo.value) query.to = dateTo.value;
  }
  return query;
};

readQuery(route.query);
let lastKey = queryKey(route.query);

const params = () => ({
  scope: scope.value,
  overdue: overdueOnly.value,
  search: search.value || undefined,
  reply: reply.value || undefined,
  status: status.value || undefined,
  officerId: scope.value === 'all' ? officerId.value || undefined : undefined,
  dateFrom: dateFrom.value || undefined,
  dateTo: dateTo.value || undefined,
});

const load = async () => {
  const seq = ++requestSeq;
  loading.value = true;
  loadError.value = '';
  try {
    const result = await TraApi.appeals({ ...params(), page: page.value, size: size.value });
    if (seq !== requestSeq) return; // a newer request superseded this one
    rows.value = result.items;
    total.value = result.total;
  } catch (err) {
    if (seq !== requestSeq) return;
    rows.value = [];
    total.value = 0;
    loadError.value = apiErrorMessage(err, 'Appeals could not be loaded.');
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
};

// Apply the current filters: sync the URL and reload from page 1.
const apply = () => {
  search.value = searchDraft.value.trim();
  const query = buildQuery();
  lastKey = queryKey(query);
  router.replace({ query });
  page.value = 1;
  load();
};

// Back/forward, or a dashboard tile linking here with different query params.
watch(
  () => route.query,
  (query) => {
    if (route.name !== 'TraAppeals' || queryKey(query) === lastKey) return;
    readQuery(query);
    lastKey = queryKey(query);
    page.value = 1;
    load();
  },
);

const onPage = (event) => {
  page.value = event.page + 1;
  size.value = event.rows;
  load();
};

const setScope = (value) => {
  scope.value = value;
  apply();
};
const toggleOverdue = () => {
  overdueOnly.value = !overdueOnly.value;
  apply();
};
const setRange = (key) => {
  if (range.value === key) {
    range.value = '';
    dateFrom.value = '';
    dateTo.value = '';
  } else {
    range.value = key;
    dateFrom.value = rangeStart(key);
    dateTo.value = todayIso();
  }
  apply();
};
const onDateChange = () => {
  range.value = '';
  apply();
};

const reset = () => {
  searchDraft.value = '';
  reply.value = '';
  status.value = '';
  officerId.value = '';
  dateFrom.value = '';
  dateTo.value = '';
  range.value = '';
  overdueOnly.value = false;
  apply();
};

const openAppeal = (event) => router.push(`/tra/appeals/${event.data.id}`);

const replyOptions = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending reply' },
  { value: 'filed', label: 'Reply filed' },
];
const statusOptions = computed(() => [{ value: '', label: 'All' }, ...STATUSES.map((s) => ({ value: s, label: humanize(s) }))]);
const officerOptions = computed(() => [
  { value: '', label: 'Anyone' },
  { value: 'unassigned', label: 'Unassigned' },
  ...officers.value.map((o) => ({ value: o.id, label: `${o.firstName} ${o.lastName}` })),
]);

// ─── CSV export: every matching row, not just the visible page ───
const exporting = ref(false);
const EXPORT_PAGE = 500;
const exportCsv = async () => {
  exporting.value = true;
  try {
    const all = [];
    for (let current = 1; ; current++) {
      const result = await TraApi.appeals({ ...params(), page: current, size: EXPORT_PAGE });
      all.push(...result.items);
      if (!result.items.length || all.length >= result.total) break;
    }
    if (!all.length) {
      toast.add({ severity: 'info', summary: 'Nothing to export', detail: 'No appeals match your filters.', life: 3000 });
      return;
    }
    downloadCsv(
      `appeals-against-tra-${todayIso()}.csv`,
      ['Appeal No', 'Appellant', 'Tax Type', 'Filed', 'Assignee', 'Reply Due', 'Reply', 'Status'],
      all.map((appeal) => [
        appeal.appealNo,
        appeal.appellantName,
        appeal.taxType?.name,
        formatDate(appeal.dateOfFiling),
        appeal.assignedOfficerName || 'Unassigned',
        formatDate(appeal.replyDueDate),
        replyBadge(appeal).text,
        humanize(appeal.statusTrend),
      ]),
    );
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Export failed', detail: apiErrorMessage(err, 'The export could not be built.'), life: 5000 });
  } finally {
    exporting.value = false;
  }
};

onMounted(async () => {
  load();
  if (!canPickOfficer.value) return;
  try {
    officers.value = (await TraApi.officers(1, 100)).items;
  } catch (err) {
    toast.add({
      severity: 'warn',
      summary: 'Officer list unavailable',
      detail: apiErrorMessage(err, 'Officers could not be loaded.'),
      life: 4000,
    });
  }
});
</script>

<template>
  <div>
    <div class="page-header">
      <h2>Appeals against TRA</h2>
      <p>Every appeal the Authority is defending, with what each one is waiting for.</p>
    </div>

    <div class="flex items-center gap-2 mb-3 flex-wrap">
      <div class="seg-group" role="group" aria-label="Case scope">
        <button type="button" class="seg" :class="{ active: scope === 'mine' }" :aria-pressed="scope === 'mine'" @click="setScope('mine')">
          <i class="pi pi-user"></i> My cases
        </button>
        <button type="button" class="seg" :class="{ active: scope === 'all' }" :aria-pressed="scope === 'all'" @click="setScope('all')">
          <i class="pi pi-briefcase"></i> All cases
        </button>
      </div>
      <button type="button" class="chip" :class="{ 'chip-on': overdueOnly }" :aria-pressed="overdueOnly" @click="toggleOverdue">
        <i class="pi pi-exclamation-triangle"></i> Overdue only
      </button>
      <Button
        class="ml-auto"
        label="Export"
        :icon="exporting ? 'pi pi-spin pi-spinner' : 'pi pi-file-excel'"
        outlined
        size="small"
        :disabled="exporting"
        @click="exportCsv"
      />
    </div>

    <form class="ss-card mb-3" @submit.prevent="apply">
      <div class="filter-grid">
        <div class="field">
          <label for="f-search">Search</label>
          <InputText id="f-search" v-model="searchDraft" type="search" placeholder="Appeal number or appellant name" class="w-full" />
        </div>
        <div class="field">
          <label for="f-reply">Reply status</label>
          <Select
            id="f-reply"
            v-model="reply"
            :options="replyOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            @change="apply"
          />
        </div>
        <div class="field">
          <label for="f-status">Case status</label>
          <Select
            id="f-status"
            v-model="status"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            @change="apply"
          />
        </div>
        <div v-if="canPickOfficer && scope === 'all'" class="field">
          <label for="f-officer">Assignee</label>
          <Select
            id="f-officer"
            v-model="officerId"
            :options="officerOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            @change="apply"
          />
        </div>
        <div class="field">
          <label for="f-from">Filed between</label>
          <div class="date-range">
            <input
              id="f-from"
              v-model="dateFrom"
              class="date-input"
              type="date"
              :max="dateTo || undefined"
              aria-label="Filed from"
              @change="onDateChange"
            />
            <span class="to">to</span>
            <input
              v-model="dateTo"
              class="date-input"
              type="date"
              :min="dateFrom || undefined"
              aria-label="Filed to"
              @change="onDateChange"
            />
          </div>
        </div>
        <div class="field">
          <span class="field-label">Quick range</span>
          <div class="quick-range" role="group" aria-label="Quick filed-date range">
            <button
              v-for="r in RANGES"
              :key="r.key"
              type="button"
              class="chip"
              :class="{ 'chip-on': range === r.key }"
              :aria-pressed="range === r.key"
              :title="r.title"
              @click="setRange(r.key)"
            >
              {{ r.label }}
            </button>
          </div>
        </div>
      </div>
      <div class="form-actions">
        <Button label="Reset" icon="pi pi-refresh" outlined size="small" @click="reset" />
        <Button type="submit" label="Search" icon="pi pi-search" class="trab-btn" size="small" />
        <span class="total"
          >Total: <strong>{{ total }}</strong></span
        >
      </div>
    </form>

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
        <Column header="S/N" class="w-14">
          <template #body="{ index }">{{ (page - 1) * size + index + 1 }}</template>
        </Column>
        <Column header="Appeal No.">
          <template #body="{ data }">
            <router-link :to="`/tra/appeals/${data.id}`" class="row-link">{{ data.appealNo || 'No number yet' }}</router-link>
          </template>
        </Column>
        <Column field="appellantName" header="Appellant" />
        <Column header="Tax type"
          ><template #body="{ data }">{{ data.taxType?.name || '-' }}</template></Column
        >
        <Column header="Assignee">
          <template #body="{ data }">
            <span v-if="data.assignedOfficerName" class="assignee">{{ data.assignedOfficerName }}</span>
            <Tag v-else value="Unassigned" severity="warn" />
          </template>
        </Column>
        <Column header="Filed"
          ><template #body="{ data }">{{ formatDate(data.dateOfFiling) }}</template></Column
        >
        <Column header="Reply">
          <template #body="{ data }">
            <Tag v-tooltip.top="replyBadge(data).title || undefined" :value="replyBadge(data).text" :severity="replyBadge(data).severity" />
          </template>
        </Column>
        <Column header="Status">
          <template #body="{ data }"><Tag :value="humanize(data.statusTrend)" severity="secondary" /></template>
        </Column>
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-inbox"></i>
            <p>No appeals match your filters.</p>
          </div>
        </template>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.9rem;
}
.field {
  display: grid;
  gap: 0.35rem;
  align-content: start;
}
.field label,
.field-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--trab-heading, #1e293b);
}
.date-range {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
.date-input {
  flex: 1;
  min-width: 0;
  padding: 0.5rem 0.6rem;
  border: 1px solid var(--trab-border);
  border-radius: 8px;
  font-size: 0.82rem;
  font-family: inherit;
  background: #fff;
}
.to {
  font-size: 0.75rem;
  color: #6b7280;
}
.quick-range {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.seg-group {
  display: inline-flex;
  border: 1px solid var(--trab-border);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.seg {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.85rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b7280;
  background: none;
  border: 0;
  cursor: pointer;
  font-family: inherit;
}
.seg.active {
  background: var(--trab-primary);
  color: #fff;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.7rem;
  border: 1px solid var(--trab-border);
  border-radius: 999px;
  background: #fff;
  font-size: 0.76rem;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  font-family: inherit;
}
.chip-on {
  background: rgba(27, 107, 61, 0.1);
  border-color: var(--trab-primary);
  color: var(--trab-primary);
}
.form-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--trab-border);
}
.total {
  margin-left: auto;
  font-size: 0.76rem;
  color: #6b7280;
}
.total strong {
  color: var(--trab-heading, #1e293b);
}
.row-link {
  font-weight: 700;
  color: var(--trab-primary);
  text-decoration: none;
}
.row-link:hover {
  text-decoration: underline;
}
.assignee {
  font-size: 0.82rem;
}
</style>
