<script setup>
import { useI18n } from 'vue-i18n';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import InputText from 'primevue/inputtext';
import { SelfServiceSummons } from '@/service/SelfServiceApi.js';
import { useLabels } from '@/composables/useLabels.js';
import { usePagedList } from '@/composables/usePagedList.js';

const { t } = useI18n();
const { statusLabel } = useLabels();

const { rows, total, loading, search, rowsPerPage, first, stats, onPage, onSearch } = usePagedList(SelfServiceSummons.getAll, {
  errorKey: 'summons.loadFailed',
  statsKey: 'summons',
  statsDefault: { total: 0, served: 0, pending: 0 },
});

const severity = (s) => (s === 'SERVED' ? 'success' : s === 'CONCLUDED' ? 'secondary' : 'warn');
</script>

<template>
  <div>
    <div class="page-header">
      <h2>{{ t('summons.title') }}</h2>
      <p>{{ t('summons.subtitle') }}</p>
    </div>

    <div class="stat-bar">
      <div class="stat-item">
        <div class="stat-dot bg-[#1B6B3D]"></div>
        {{ t('common.total') }}: <strong>{{ stats.total }}</strong>
      </div>
      <div class="stat-item">
        <div class="stat-dot bg-[#10B981]"></div>
        {{ t('summons.served') }}: <strong>{{ stats.served }}</strong>
      </div>
      <div class="stat-item">
        <div class="stat-dot bg-[#F59E0B]"></div>
        {{ t('common.pending') }}: <strong>{{ stats.pending }}</strong>
      </div>
    </div>

    <div class="ss-card mb-3">
      <InputText
        v-model="search"
        :placeholder="t('summons.searchPlaceholder')"
        :aria-label="t('common.search')"
        class="search-input"
        @input="onSearch"
      />
    </div>

    <div class="ss-card">
      <DataTable
        :value="rows"
        :loading="loading"
        lazy
        paginator
        :rows="rowsPerPage"
        :first="first"
        :total-records="total"
        :rows-per-page-options="[10, 25, 50]"
        data-key="summonsAppealId"
        @page="onPage"
      >
        <Column :header="t('common.sn')" class="w-14"
          ><template #body="{ index }">{{ first + index + 1 }}</template></Column
        >
        <Column :header="t('fields.appealNo')"
          ><template #body="{ data }">{{ data.appealNo || t('common.dash') }}</template></Column
        >
        <Column :header="t('summons.hearingDate')">
          <template #body="{ data }"
            >{{ data.summons?.startDate }}<span v-if="data.summons?.time" class="text-subtle"> · {{ data.summons.time }}</span></template
          >
        </Column>
        <Column :header="t('summons.venue')"
          ><template #body="{ data }">{{ data.summons?.venue || t('common.dash') }}</template></Column
        >
        <Column :header="t('summons.panel')"
          ><template #body="{ data }">{{ data.summons?.judge?.name || t('common.dash') }}</template></Column
        >
        <Column :header="t('common.status')">
          <template #body="{ data }"
            ><Tag :value="statusLabel(data.summons?.status)" :severity="severity(data.summons?.status)"
          /></template>
        </Column>
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-calendar"></i>
            <p>{{ t('summons.empty') }}</p>
          </div>
        </template>
      </DataTable>
    </div>
  </div>
</template>
