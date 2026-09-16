<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import DocumentsDialog from '@/components/DocumentsDialog.vue';
import ResubmitDialog from '@/components/ResubmitDialog.vue';
import SubmissionsDialog from '@/components/SubmissionsDialog.vue';
import RepliesDialog from '@/components/RepliesDialog.vue';
import { SelfServiceAppeals as AppealService } from '@/service/SelfServiceApi.js';
import { useLabels } from '@/composables/useLabels.js';
import { usePagedList } from '@/composables/usePagedList.js';
import { apiErrorMessage } from '@/utils/format.js';
import { filingState, returnedFilings } from '@/utils/filingStatus.js';

const { t } = useI18n();
const toast = useToast();
const { statusLabel } = useLabels();

const {
  rows: appeals,
  total,
  loading,
  search,
  rowsPerPage,
  first,
  stats,
  onPage,
  onSearch,
  refresh,
} = usePagedList(AppealService.getAll, {
  errorKey: 'appeals.loadFailed',
  statsKey: 'appeals',
  statsDefault: { total: 0, decided: 0, pending: 0 },
});

const viewVisible = ref(false);
const viewData = ref(null);
const viewParties = ref({ appellants: [], respondents: [] });
const openingId = ref(null);
const docsVisible = ref(false);
const docsAppeal = ref(null);

const openView = async (appeal) => {
  openingId.value = appeal.id;
  try {
    const [details, parties] = await Promise.all([
      AppealService.getById(appeal.id),
      AppealService.getParties(appeal.id).catch(() => ({ appellants: [], respondents: [] })),
    ]);
    viewData.value = details;
    viewParties.value = parties;
    viewVisible.value = true;
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('appeals.loadFailed')), life: 4000 });
  } finally {
    openingId.value = null;
  }
};

const openDocuments = (appeal) => {
  docsAppeal.value = appeal;
  docsVisible.value = true;
};

// Arriving straight from filing: open the annexure window for the new appeal.
const route = useRoute();
onMounted(() => {
  const attach = route.query.attach;
  if (!attach) return;
  openDocuments({ id: String(attach) });
  toast.add({ severity: 'info', summary: t('common.success'), detail: t('documents.attachNow'), life: 7000 });
});

const statusSeverity = (s) => ({ NEW: 'info', HEARING_SCHEDULED: 'warn', CONCLUDED: 'secondary', DECIDED: 'success' })[s] || 'info';
const returned = computed(() => returnedFilings(appeals.value));

// Written submissions for the next hearing.
const submissionsVisible = ref(false);
const submissionsAppeal = ref(null);
const openSubmissions = (appeal) => {
  submissionsAppeal.value = appeal;
  submissionsVisible.value = true;
};

// TRA's statement of defence and the appellant's answer to it.
const repliesVisible = ref(false);
const repliesAppeal = ref(null);
const openReplies = (appeal) => {
  repliesAppeal.value = appeal;
  repliesVisible.value = true;
};

// Correcting what the registry sent back.
const correctVisible = ref(false);
const correctData = ref(null);
const openCorrect = (appeal) => {
  correctData.value = appeal;
  correctVisible.value = true;
};
</script>

<template>
  <div>
    <div class="page-header">
      <h2>{{ t('appeals.title') }}</h2>
      <p>{{ t('appeals.subtitle') }}</p>
    </div>

    <div class="stat-bar">
      <div class="stat-item">
        <div class="stat-dot bg-[#1B6B3D]"></div>
        {{ t('common.total') }}: <strong>{{ stats.total }}</strong>
      </div>
      <div class="stat-item">
        <div class="stat-dot bg-[#10B981]"></div>
        {{ t('appeals.decided') }}: <strong>{{ stats.decided }}</strong>
      </div>
      <div class="stat-item">
        <div class="stat-dot bg-[#F59E0B]"></div>
        {{ t('common.pending') }}: <strong>{{ stats.pending }}</strong>
      </div>
    </div>

    <div v-if="returned.length" class="returned-banner" role="alert">
      <i class="pi pi-exclamation-circle"></i>
      <div>
        <strong>{{
          returned.length === 1 ? t('filingStatus.returnedBannerOne') : t('filingStatus.returnedBannerMany', { count: returned.length })
        }}</strong>
        <ul>
          <li v-for="r in returned" :key="r.id">
            {{ r.appellantName }}<template v-if="r.returnReason"> — {{ t('filingStatus.reason') }}: {{ r.returnReason }}</template>
          </li>
        </ul>
      </div>
    </div>

    <div class="ss-card mb-3">
      <InputText
        v-model="search"
        :placeholder="t('appeals.searchPlaceholder')"
        :aria-label="t('common.search')"
        class="search-input"
        @input="onSearch"
      />
    </div>

    <div class="ss-card">
      <DataTable
        :value="appeals"
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
        <Column :header="t('fields.appealNo')">
          <template #body="{ data }">
            <span v-if="data.appealNo" class="font-semibold">{{ data.appealNo }}</span>
            <span v-else class="awaiting">{{ t('notices.awaitingPayment') }}</span>
          </template>
        </Column>
        <Column field="dateOfFiling" :header="t('appeals.dateFiled')" />
        <Column field="appellantName" :header="t('fields.appellant')" />
        <Column :header="t('fields.taxType')"
          ><template #body="{ data }">{{ data.taxType?.name || t('common.dash') }}</template></Column
        >
        <Column :header="t('common.status')">
          <template #body="{ data }"><Tag :value="statusLabel(data.statusTrend)" :severity="statusSeverity(data.statusTrend)" /></template>
        </Column>
        <Column :header="t('filingStatus.label')">
          <template #body="{ data }">
            <Tag :value="t(filingState(data).key)" :severity="filingState(data).severity" />
            <p v-if="data.filingStatus === 'RETURNED' && data.returnReason" class="reason">{{ data.returnReason }}</p>
          </template>
        </Column>
        <Column :header="t('fields.payment')">
          <template #body="{ data }"
            ><Tag :value="statusLabel(data.paymentStatus || 'UNPAID')" :severity="data.paymentStatus === 'PAID' ? 'success' : 'warn'"
          /></template>
        </Column>
        <Column :header="t('common.actions')" class="w-28">
          <template #body="{ data }">
            <div class="flex gap-1">
              <Button
                v-tooltip.top="t('common.view')"
                icon="pi pi-eye"
                text
                rounded
                size="small"
                :loading="openingId === data.id"
                :aria-label="t('common.view')"
                @click="openView(data)"
              />
              <Button
                v-tooltip.top="t('appeals.documents')"
                icon="pi pi-paperclip"
                text
                rounded
                size="small"
                :aria-label="t('appeals.documents')"
                @click="openDocuments(data)"
              />
              <Button
                v-tooltip.top="t('replies.title')"
                icon="pi pi-comments"
                text
                rounded
                size="small"
                :aria-label="t('replies.title')"
                @click="openReplies(data)"
              />
              <Button
                v-tooltip.top="t('submissions.title')"
                icon="pi pi-file-edit"
                text
                rounded
                size="small"
                :aria-label="t('submissions.title')"
                @click="openSubmissions(data)"
              />
              <Button
                v-if="data.filingStatus === 'RETURNED'"
                v-tooltip.top="t('filingStatus.correctTitle')"
                icon="pi pi-pencil"
                text
                rounded
                size="small"
                severity="danger"
                :aria-label="t('filingStatus.correctTitle')"
                @click="openCorrect(data)"
              />
            </div>
          </template>
        </Column>
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-briefcase"></i>
            <p>{{ t('appeals.empty') }}</p>
          </div>
        </template>
      </DataTable>
    </div>

    <Dialog
      v-model:visible="viewVisible"
      :header="t('appeals.detailsTitle')"
      modal
      :style="{ width: '560px' }"
      :breakpoints="{ '640px': '95vw' }"
    >
      <div v-if="viewData" class="view-grid">
        <div class="view-row">
          <span class="view-label">{{ t('fields.appealNo') }}</span
          ><span class="view-value"
            ><strong>{{ viewData.appealNo || t('notices.awaitingPayment') }}</strong></span
          >
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('appeals.dateFiled') }}</span
          ><span class="view-value">{{ viewData.dateOfFiling }}</span>
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('fields.appellant') }}</span
          ><span class="view-value">{{ viewData.appellantName }}</span>
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('fields.taxType') }}</span
          ><span class="view-value">{{ viewData.taxType?.name || t('common.dash') }}</span>
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('common.status') }}</span>
          <span class="view-value"
            ><Tag :value="statusLabel(viewData.statusTrend)" :severity="statusSeverity(viewData.statusTrend)"
          /></span>
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('appeals.outcome') }}</span
          ><span class="view-value">{{ viewData.outcomeOfDecision || t('common.dash') }}</span>
        </div>

        <div v-if="viewParties.appellants.length || viewParties.respondents.length" class="soft-panel">
          <div v-if="viewParties.appellants.length" class="mb-3">
            <p class="parties-title">{{ t('fields.appellants') }}</p>
            <div v-for="a in viewParties.appellants" :key="a.id" class="party-row">
              <span>{{ a.appellant?.firstName }} {{ a.appellant?.lastName || '' }}</span>
              <Tag :value="statusLabel(a.role)" severity="info" />
            </div>
          </div>
          <div v-if="viewParties.respondents.length">
            <p class="parties-title">{{ t('fields.respondents') }}</p>
            <div v-for="r in viewParties.respondents" :key="r.id" class="party-row">
              <span>{{ r.respondent?.name }}</span>
              <Tag v-if="r.respondent?.isDefault" :value="statusLabel('DEFAULT')" severity="success" />
            </div>
          </div>
        </div>

        <template v-if="viewData.decidedDate">
          <div class="view-row">
            <span class="view-label">{{ t('appeals.decisionDate') }}</span
            ><span class="view-value">{{ viewData.decidedDate }}</span>
          </div>
          <div class="view-row">
            <span class="view-label">{{ t('appeals.wonBy') }}</span>
            <span class="view-value"
              ><Tag :value="viewData.wonBy || t('common.dash')" :severity="/appellant/i.test(viewData.wonBy || '') ? 'success' : 'danger'"
            /></span>
          </div>
        </template>
        <div v-if="viewData.summaryOfDecree" class="soft-panel">
          <strong class="text-label">{{ t('appeals.summary') }}:</strong>
          <p class="mt-1 mb-0">{{ viewData.summaryOfDecree }}</p>
        </div>
      </div>
      <template #footer><Button :label="t('common.close')" outlined @click="viewVisible = false" /></template>
    </Dialog>

    <DocumentsDialog
      v-model:visible="docsVisible"
      :api="AppealService"
      :source-id="docsAppeal?.id"
      default-type="ANNEXTURE"
      charges-annextures
      :reference="docsAppeal?.appealNo || docsAppeal?.appellantName || ''"
    />

    <SubmissionsDialog v-model:visible="submissionsVisible" :appeal="submissionsAppeal" />

    <RepliesDialog v-model:visible="repliesVisible" :appeal="repliesAppeal" />

    <ResubmitDialog v-model:visible="correctVisible" kind="appeal" :record="correctData" :api="AppealService" @resubmitted="refresh" />
  </div>
</template>

<style scoped>
.parties-title {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--trab-label);
  margin-bottom: 0.4rem;
  text-transform: uppercase;
}
.party-row {
  font-size: 0.82rem;
  padding: 0.3rem 0;
  border-bottom: 1px solid var(--trab-line);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}
.returned-banner {
  display: flex;
  gap: 0.7rem;
  align-items: flex-start;
  padding: 0.85rem 1rem;
  margin-bottom: 0.75rem;
  border: 1px solid #fecaca;
  border-left: 4px solid #dc2626;
  border-radius: 10px;
  background: #fef2f2;
  color: #991b1b;
  font-size: 0.875rem;
}
.returned-banner ul {
  margin: 0.3rem 0 0;
  padding-left: 1.1rem;
}
.reason {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: #991b1b;
}
</style>
