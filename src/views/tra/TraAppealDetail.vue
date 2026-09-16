<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import Skeleton from 'primevue/skeleton';
import Tag from 'primevue/tag';
import { TraApi } from '@/service/TraApi.js';
import AuthService from '@/service/AuthService.js';
import { session } from '@/service/session.js';
import { apiErrorMessage } from '@/utils/format.js';
import CaseSummary from '@/components/tra/CaseSummary.vue';
import CaseAssignmentPanel from '@/components/tra/CaseAssignmentPanel.vue';
import DeadlineBanner from '@/components/tra/DeadlineBanner.vue';
import DepositPanel from '@/components/tra/DepositPanel.vue';
import DisputeNumberField from '@/components/tra/DisputeNumberField.vue';
import OverviewPanel from '@/components/tra/OverviewPanel.vue';
import DefencePanel from '@/components/tra/DefencePanel.vue';
import FilingsPanel from '@/components/tra/FilingsPanel.vue';
import SubmissionsPanel from '@/components/tra/SubmissionsPanel.vue';
import DocumentsPanel from '@/components/tra/DocumentsPanel.vue';
import NotesPanel from '@/components/tra/NotesPanel.vue';

// The TRA desk is English by policy, so this view carries no translation keys.
const route = useRoute();
const router = useRouter();
const toast = useToast();
const id = route.params.id;

const appeal = ref(null);
const parties = ref({ appellants: [], respondents: [] });
const replies = ref([]);
const filings = ref([]);
const documents = ref([]);
const notes = ref([]);
const officers = ref([]);
const assignments = ref([]);

const loading = ref(true);
const loadError = ref('');
const errors = reactive({
  parties: '',
  replies: '',
  filings: '',
  documents: '',
  notes: '',
  officers: '',
  assignments: '',
});
const tab = ref('overview');

const canReply = computed(() => AuthService.can('TRA File Reply'));
const canDocs = computed(() => AuthService.can('TRA Manage Documents'));
const canNotes = computed(() => AuthService.can('TRA Manage Cases'));
const canAssign = computed(() => AuthService.can('TRA Assign Cases'));

const tabs = computed(() => {
  const list = [
    { key: 'overview', label: 'Overview', icon: 'pi-info-circle', count: 0 },
    { key: 'reply', label: 'Defence', icon: 'pi-pencil', count: replies.value.length },
    { key: 'submissions', label: 'Submissions', icon: 'pi-file-edit', count: 0 },
    { key: 'filings', label: 'Objections & appeal', icon: 'pi-flag', count: filings.value.length },
  ];
  if (canDocs.value) list.push({ key: 'documents', label: 'Documents', icon: 'pi-paperclip', count: documents.value.length });
  if (canNotes.value) list.push({ key: 'notes', label: 'Notes', icon: 'pi-comment', count: notes.value.length });
  return list;
});

const fallback = {
  parties: 'Parties could not be loaded.',
  replies: 'Filed replies could not be loaded.',
  filings: 'Objections and appeal notices could not be loaded.',
  documents: 'Documents could not be loaded.',
  notes: 'Internal notes could not be loaded.',
  officers: 'Officer list could not be loaded.',
  assignments: 'Assignment history could not be loaded.',
};

// Secondary sections load independently; a failure only affects its own section.
const loaders = {
  parties: async () => {
    parties.value = await TraApi.parties(id);
  },
  replies: async () => {
    replies.value = await TraApi.replies(id);
  },
  filings: async () => {
    filings.value = await TraApi.filings(id);
  },
  documents: async () => {
    documents.value = await TraApi.documents(id);
  },
  notes: async () => {
    notes.value = await TraApi.notes(id);
  },
  officers: async () => {
    officers.value = (await TraApi.officers()).items.filter((officer) => officer.status === 'active');
  },
  assignments: async () => {
    assignments.value = await TraApi.assignments(id);
  },
};

const enabledSections = () => {
  const keys = ['parties', 'replies', 'filings'];
  if (canDocs.value) keys.push('documents');
  if (canNotes.value) keys.push('notes');
  if (canAssign.value) keys.push('officers', 'assignments');
  return keys;
};

const loadSections = async (keys) => {
  const results = await Promise.allSettled(keys.map((key) => loaders[key]()));
  results.forEach((result, index) => {
    const key = keys[index];
    errors[key] = result.status === 'rejected' ? apiErrorMessage(result.reason, fallback[key]) : '';
  });
};

const reloadSection = (key) => loadSections([key]);

const loadAll = async () => {
  loading.value = true;
  loadError.value = '';
  const [appealResult] = await Promise.allSettled([TraApi.appeal(id), loadSections(enabledSections())]);
  if (appealResult.status === 'fulfilled') {
    appeal.value = appealResult.value;
  } else {
    appeal.value = null;
    loadError.value = apiErrorMessage(appealResult.reason, 'This appeal could not be loaded.');
  }
  loading.value = false;
};

const refreshAppeal = async () => {
  try {
    appeal.value = await TraApi.appeal(id);
  } catch (err) {
    toast.add({
      severity: 'warn',
      summary: 'Refresh failed',
      detail: apiErrorMessage(err, 'Case details could not be refreshed.'),
      life: 3500,
    });
  }
};

const onAssignmentChanged = (updated) => {
  if (appeal.value) appeal.value = { ...appeal.value, ...updated };
  reloadSection('assignments');
};

const onReplyFiled = () => {
  reloadSection('replies');
  refreshAppeal();
};

const onFilingLodged = () => {
  reloadSection('filings');
  refreshAppeal();
};

const onTabKey = (event, index) => {
  const list = tabs.value;
  const next =
    event.key === 'ArrowRight' ? (index + 1) % list.length : event.key === 'ArrowLeft' ? (index - 1 + list.length) % list.length : -1;
  if (next < 0) return;
  event.preventDefault();
  tab.value = list[next].key;
  document.getElementById(`appeal-tab-${list[next].key}`)?.focus();
};

onMounted(loadAll);
</script>

<template>
  <div>
    <div class="page-header detail-header">
      <div>
        <h2>{{ appeal?.appealNo || 'Appeal' }}</h2>
        <p>{{ appeal?.appellantName || 'Appeal against the Authority' }}</p>
      </div>
      <Button label="Back" icon="pi pi-arrow-left" outlined size="small" @click="router.push('/tra/appeals')" />
    </div>

    <div v-if="loading" class="detail-grid" aria-busy="true" aria-live="polite">
      <div class="ss-card h-fit">
        <Skeleton width="40%" height="0.8rem" class="mb-4" />
        <Skeleton v-for="n in 8" :key="n" height="1.1rem" class="mb-3" />
      </div>
      <div class="ss-card">
        <div class="flex gap-3 mb-5">
          <Skeleton v-for="n in 4" :key="n" width="6rem" height="2rem" />
        </div>
        <Skeleton height="6rem" class="mb-4" />
        <Skeleton width="70%" height="1rem" class="mb-3" />
        <Skeleton width="55%" height="1rem" />
      </div>
    </div>

    <!-- Critical failure -->
    <div v-else-if="!appeal" class="ss-card load-error" role="alert">
      <i class="pi pi-exclamation-triangle"></i>
      <h3>Unable to open this appeal</h3>
      <p>{{ loadError }}</p>
      <div class="flex gap-2 justify-center flex-wrap">
        <Button label="Try again" icon="pi pi-refresh" class="trab-btn" @click="loadAll" />
        <Button label="Back to appeals" outlined @click="router.push('/tra/appeals')" />
      </div>
    </div>

    <template v-else>
      <DeadlineBanner :appeal="appeal" />

      <div class="detail-grid">
        <aside class="ss-card h-fit" aria-label="Case summary">
          <CaseSummary :appeal="appeal" :parties="parties" :parties-error="errors.parties" @retry-parties="reloadSection('parties')" />
          <DisputeNumberField :appeal="appeal" :can-edit="canNotes" @saved="(updated) => (appeal = { ...appeal, ...updated })" />
          <DepositPanel :appeal="appeal" />
          <CaseAssignmentPanel
            :appeal="appeal"
            :can-assign="canAssign"
            :officers="officers"
            :assignments="assignments"
            :officers-error="errors.officers"
            :assignments-error="errors.assignments"
            @changed="onAssignmentChanged"
            @retry-officers="reloadSection('officers')"
            @retry-assignments="reloadSection('assignments')"
          />
        </aside>

        <section class="ss-card min-w-0 tab-card">
          <div class="tab-bar" role="tablist" aria-label="Appeal sections">
            <button
              v-for="(item, index) in tabs"
              :id="`appeal-tab-${item.key}`"
              :key="item.key"
              type="button"
              role="tab"
              class="detail-tab"
              :class="{ active: tab === item.key }"
              :aria-selected="tab === item.key"
              :aria-controls="`appeal-panel-${item.key}`"
              :tabindex="tab === item.key ? 0 : -1"
              @click="tab = item.key"
              @keydown="onTabKey($event, index)"
            >
              <i class="pi" :class="item.icon"></i> {{ item.label }}
              <Tag v-if="item.count" :value="String(item.count)" severity="secondary" class="ml-1" />
            </button>
          </div>

          <div :id="`appeal-panel-${tab}`" role="tabpanel" :aria-labelledby="`appeal-tab-${tab}`" class="tab-panel">
            <OverviewPanel
              v-if="tab === 'overview'"
              :appeal="appeal"
              :parties="parties"
              :parties-error="errors.parties"
              @retry-parties="reloadSection('parties')"
            />
            <DefencePanel
              v-else-if="tab === 'reply'"
              :appeal="appeal"
              :replies="replies"
              :can-reply="canReply"
              :error="errors.replies"
              @filed="onReplyFiled"
              @retry="reloadSection('replies')"
            />
            <SubmissionsPanel v-else-if="tab === 'submissions'" :appeal="appeal" :can-file="canReply" />
            <FilingsPanel
              v-else-if="tab === 'filings'"
              :appeal="appeal"
              :filings="filings"
              :can-file="canReply"
              :error="errors.filings"
              @filed="onFilingLodged"
              @retry="reloadSection('filings')"
            />
            <DocumentsPanel
              v-else-if="tab === 'documents' && canDocs"
              :appeal-id="id"
              :documents="documents"
              :can-upload="canDocs"
              :error="errors.documents"
              :current-user-id="session.getUserId()"
              @uploaded="reloadSection('documents')"
              @retry="reloadSection('documents')"
            />
            <NotesPanel
              v-else-if="tab === 'notes' && canNotes"
              :appeal-id="id"
              :notes="notes"
              :error="errors.notes"
              @added="reloadSection('notes')"
              @retry="reloadSection('notes')"
            />
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.detail-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1fr);
}
@media (min-width: 1024px) {
  .detail-grid {
    grid-template-columns: 300px minmax(0, 1fr);
  }
}
.tab-card {
  padding: 0;
}
.tab-bar {
  display: flex;
  overflow-x: auto;
  border-bottom: 1px solid var(--trab-border);
}
.tab-panel {
  padding: 1.25rem;
}
.detail-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.9rem 1.1rem;
  font-weight: 600;
  font-size: 0.82rem;
  color: #6b7280;
  border: 0;
  border-bottom: 3px solid transparent;
  background: none;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
}
.detail-tab:hover {
  color: var(--trab-primary);
}
.detail-tab.active {
  color: var(--trab-primary);
  border-bottom-color: var(--trab-primary);
}
.detail-tab:focus-visible {
  outline: 2px solid var(--trab-primary);
  outline-offset: -2px;
}
.load-error {
  text-align: center;
  padding: 2.5rem 1.25rem;
}
.load-error > i {
  font-size: 2rem;
  color: var(--trab-danger);
}
.load-error h3 {
  font-size: 1rem;
  font-weight: 700;
  margin: 0.75rem 0 0.35rem;
}
.load-error p {
  font-size: 0.82rem;
  color: #6b7280;
  margin: 0 0 1.1rem;
}
</style>
