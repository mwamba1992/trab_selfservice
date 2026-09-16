<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { TraApi } from '@/service/TraApi.js';
import { apiErrorMessage, formatDate } from '@/utils/format.js';
import { isInteractiveTarget } from '@/utils/tra/lists.js';

// The TRA desk is English by policy, so this view carries no translation keys.
const router = useRouter();

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
    const result = await TraApi.notices(page.value, size.value, search.value);
    if (seq !== requestSeq) return; // a newer request superseded this one
    rows.value = result.items;
    total.value = result.total;
  } catch (err) {
    if (seq !== requestSeq) return;
    rows.value = [];
    total.value = 0;
    loadError.value = apiErrorMessage(err, 'Could not load notices');
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

// Row click is a mouse convenience; each linked row also carries a link as the keyboard target.
const openRow = (event) => {
  if (isInteractiveTarget(event.originalEvent)) return;
  if (event.data.appealId) router.push(`/tra/appeals/${event.data.appealId}`);
};

// A notice fee is either waived or, once billed, paid or still outstanding.
const payment = (notice) =>
  notice.isExempted
    ? { severity: 'secondary', text: 'Exempted' }
    : notice.paymentStatus === 'PAID'
      ? { severity: 'success', text: 'Paid' }
      : { severity: 'warn', text: 'Unpaid' };

onMounted(load);
</script>

<template>
  <div>
    <div class="page-header">
      <h2>Notices of Appeal</h2>
      <p>
        Notices of intention to appeal lodged against the Commissioner General. A notice links to its appeal once the statement of appeal is
        lodged.
      </p>
    </div>

    <div class="ss-card">
      <form class="search-bar" role="search" @submit.prevent="runSearch">
        <label for="notice-search" class="sr-only">Search notices</label>
        <InputText id="notice-search" v-model="search" type="search" placeholder="Search notice no. or appellant" class="search-input" />
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
        @row-click="openRow"
      >
        <Column header="Notice No.">
          <template #body="{ data }"
            ><strong>{{ data.noticeNo || 'No number yet' }}</strong></template
          >
        </Column>
        <Column header="Appellant">
          <template #body="{ data }">
            <div>{{ data.appellantName }}</div>
            <div v-if="data.region" class="sub">{{ data.region }}</div>
          </template>
        </Column>
        <Column header="Lodged"
          ><template #body="{ data }">{{ formatDate(data.loggedAt) }}</template></Column
        >
        <Column header="Decision Served"
          ><template #body="{ data }">{{ formatDate(data.dateOfServiceDecision) }}</template></Column
        >
        <Column header="Fee">
          <template #body="{ data }"><Tag :value="payment(data).text" :severity="payment(data).severity" /></template>
        </Column>
        <Column header="Statement of Appeal">
          <template #body="{ data }">
            <router-link v-if="data.appealId" :to="`/tra/appeals/${data.appealId}`" class="row-link">{{
              data.appealNo || 'Open appeal'
            }}</router-link>
            <Tag v-else value="Not yet lodged" severity="secondary" />
          </template>
        </Column>
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-file"></i>
            <p>No notices found.</p>
          </div>
        </template>
      </DataTable>
    </div>
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
  font-weight: 700;
  color: var(--trab-primary);
  text-decoration: none;
}
.row-link:hover {
  text-decoration: underline;
}
.row-link:focus-visible {
  outline: 2px solid var(--trab-primary);
  outline-offset: 2px;
  border-radius: 3px;
}
</style>
