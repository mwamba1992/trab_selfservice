<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import { SelfServiceDecisions } from '@/service/SelfServiceApi.js';
import DecisionCopiesDialog from '@/components/DecisionCopiesDialog.vue';
import { usePagedList } from '@/composables/usePagedList.js';
import { ensureDocumentStyles } from '@/utils/print.js';

const { t } = useI18n();

const { rows, total, loading, search, rowsPerPage, first, stats, onPage, onSearch } = usePagedList(SelfServiceDecisions.getAll, {
  errorKey: 'decisions.loadFailed',
  statsKey: 'decisions',
  statsDefault: { total: 0, wonByAppellant: 0, wonByTra: 0 },
});

onMounted(() => ensureDocumentStyles());

// Copies of the decree, ruling and drawn order — requested, paid, then opened.
const copiesVisible = ref(false);
const copiesDecision = ref(null);
const openCopies = (row) => {
  copiesDecision.value = row;
  copiesVisible.value = true;
};

const viewVisible = ref(false);
const viewData = ref(null);
const openView = (row) => {
  viewData.value = row;
  viewVisible.value = true;
};

const wonSeverity = (w) => (/appellant/i.test(w || '') ? 'success' : /tra|commissioner|respondent/i.test(w || '') ? 'danger' : 'secondary');
</script>

<template>
  <div>
    <div class="page-header">
      <h2>{{ t('decisions.title') }}</h2>
      <p>{{ t('decisions.subtitle') }}</p>
    </div>

    <div class="stat-bar">
      <div class="stat-item">
        <div class="stat-dot bg-[#1B6B3D]"></div>
        {{ t('common.total') }}: <strong>{{ stats.total }}</strong>
      </div>
      <div class="stat-item">
        <div class="stat-dot bg-[#10B981]"></div>
        {{ t('decisions.wonByYou') }}: <strong>{{ stats.wonByAppellant }}</strong>
      </div>
      <div class="stat-item">
        <div class="stat-dot bg-[#EF4444]"></div>
        {{ t('decisions.wonByTra') }}: <strong>{{ stats.wonByTra }}</strong>
      </div>
    </div>

    <div class="ss-card mb-3">
      <InputText
        v-model="search"
        :placeholder="t('decisions.searchPlaceholder')"
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
        data-key="id"
        @page="onPage"
      >
        <Column :header="t('common.sn')" class="w-14"
          ><template #body="{ index }">{{ first + index + 1 }}</template></Column
        >
        <Column :header="t('fields.appealNo')"
          ><template #body="{ data }">{{ data.appealNo || t('common.dash') }}</template></Column
        >
        <Column :header="t('fields.taxType')"
          ><template #body="{ data }">{{ data.taxType?.name || t('common.dash') }}</template></Column
        >
        <Column :header="t('decisions.decided')"
          ><template #body="{ data }">{{ data.decidedDate || t('common.dash') }}</template></Column
        >
        <Column :header="t('decisions.outcome')"
          ><template #body="{ data }"><Tag :value="data.outcomeOfDecision" severity="info" /></template
        ></Column>
        <Column :header="t('decisions.wonBy')">
          <template #body="{ data }"
            ><Tag v-if="data.wonBy" :value="data.wonBy" :severity="wonSeverity(data.wonBy)" /><span v-else>{{
              t('common.dash')
            }}</span></template
          >
        </Column>
        <Column :header="t('common.actions')" class="w-28">
          <template #body="{ data }">
            <Button
              v-tooltip.top="t('decisions.viewDecision')"
              icon="pi pi-eye"
              text
              rounded
              size="small"
              :aria-label="t('decisions.viewDecision')"
              @click="openView(data)"
            />
            <Button
              v-tooltip.top="t('copies.title')"
              icon="pi pi-copy"
              text
              rounded
              size="small"
              :aria-label="t('copies.title')"
              @click="openCopies(data)"
            />
          </template>
        </Column>
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-verified"></i>
            <p>{{ t('decisions.empty') }}</p>
          </div>
        </template>
      </DataTable>
    </div>

    <Dialog
      v-model:visible="viewVisible"
      :header="t('decisions.dialogTitle')"
      modal
      :style="{ width: '620px' }"
      :breakpoints="{ '768px': '95vw' }"
      :content-style="{ maxHeight: '80vh', overflowY: 'auto' }"
    >
      <div v-if="viewData" class="trab-doc">
        <div class="section-title">{{ t('decisions.summarySection') }}</div>
        <table>
          <tbody>
            <tr>
              <td class="label">{{ t('decisions.appealNumber') }}</td>
              <td>
                <strong>{{ viewData.appealNo || t('common.dash') }}</strong>
              </td>
            </tr>
            <tr>
              <td class="label">{{ t('fields.taxType') }}</td>
              <td>{{ viewData.taxType?.name || t('common.dash') }}</td>
            </tr>
            <tr>
              <td class="label">{{ t('decisions.decidedOn') }}</td>
              <td>{{ viewData.decidedDate || t('common.dash') }}</td>
            </tr>
            <tr>
              <td class="label">{{ t('decisions.decidedBy') }}</td>
              <td>{{ viewData.decidedBy || t('common.dash') }}</td>
            </tr>
            <tr>
              <td class="label">{{ t('decisions.outcome') }}</td>
              <td>
                <strong>{{ viewData.outcomeOfDecision }}</strong>
              </td>
            </tr>
            <tr>
              <td class="label">{{ t('decisions.wonBy') }}</td>
              <td>{{ viewData.wonBy || t('common.dash') }}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">{{ t('decisions.decreeSection') }}</div>
        <p class="decree">{{ viewData.summaryOfDecree || t('decisions.noSummary') }}</p>

        <!-- The judgement is a paid copy, so it is obtained through the copies dialog. -->
        <Button
          v-if="viewData.judgementFile"
          :label="t('copies.title')"
          icon="pi pi-copy"
          outlined
          class="mt-4"
          @click="
            viewVisible = false;
            openCopies(viewData);
          "
        />
      </div>
      <template #footer>
        <Button :label="t('common.close')" text @click="viewVisible = false" />
      </template>
    </Dialog>

    <DecisionCopiesDialog v-model:visible="copiesVisible" :decision="copiesDecision" />
  </div>
</template>

<style scoped>
.decree {
  font-size: 0.85rem;
  line-height: 1.6;
  color: #334155;
  white-space: pre-wrap;
}
</style>
