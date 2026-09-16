<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import Skeleton from 'primevue/skeleton';
import { SelfServiceAppeals, SelfServiceFiles } from '@/service/SelfServiceApi.js';
import { openPreview } from '@/utils/preview.js';
import { apiErrorMessage } from '@/utils/format.js';
import { SUBMISSION_STAGES, nextStage, stageKey, windowState } from '@/utils/submissions.js';
import FilePicker from '@/components/FilePicker.vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  appeal: { type: Object, default: null },
});
const emit = defineEmits(['update:visible']);

const { t } = useI18n();
const toast = useToast();

const loading = ref(false);
const filing = ref(false);
const win = ref({ hearingDate: null, venue: null, deadline: null, open: false });
const submissions = ref([]);
const stage = ref('SUBMISSION_IN_CHIEF');
const body = ref('');
const file = ref(null);

const state = computed(() => windowState(win.value));
const stageOptions = computed(() => SUBMISSION_STAGES.map((s) => ({ value: s, label: t(stageKey(s)) })));
const canFile = computed(() => win.value.open && (body.value.trim() || file.value));

const load = async () => {
  if (!props.appeal) return;
  loading.value = true;
  try {
    const res = await SelfServiceAppeals.getSubmissions(props.appeal.id);
    win.value = { hearingDate: res.hearingDate, venue: res.venue, deadline: res.deadline, open: res.open };
    submissions.value = res.submissions || [];
    stage.value = nextStage(submissions.value, 'APPELLANT');
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('common.loadFailed')), life: 4000 });
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.visible, props.appeal?.id],
  ([open]) => {
    if (!open) return;
    body.value = '';
    file.value = null;
    load();
  },
);

const submit = async () => {
  filing.value = true;
  try {
    await SelfServiceAppeals.fileSubmission(props.appeal.id, { stage: stage.value, body: body.value, file: file.value });
    toast.add({ severity: 'success', summary: t('common.success'), detail: t('submissions.filed'), life: 5000 });
    body.value = '';
    file.value = null;
    await load();
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('common.actionFailed')), life: 6000 });
  } finally {
    filing.value = false;
  }
};

// Attachments open in the preview window; the reader downloads from there.
const preview = (item) =>
  openPreview({
    fileName: item.originalName || item.fileName,
    title: item.originalName || 'Document',
    downloadName: item.originalName,
    load: () => SelfServiceFiles.blob(item.fileName),
  });
const partyLabel = (party) => (party === 'APPELLANT' ? t('submissions.byAppellant') : t('submissions.byRespondent'));
</script>

<template>
  <Dialog
    :visible="visible"
    :header="t('submissions.title')"
    modal
    :style="{ width: '720px' }"
    :breakpoints="{ '768px': '95vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <p class="intro">{{ t('submissions.intro') }}</p>

    <div class="window" :class="state.severity">
      <i class="pi" :class="win.hearingDate ? 'pi-calendar' : 'pi-clock'"></i>
      <div>
        <div class="window-head">
          <span v-if="win.hearingDate">{{
            t('submissions.hearingOn', { date: win.hearingDate, venue: win.venue || t('common.dash') })
          }}</span>
          <span v-else>{{ t('submissions.noHearingYet') }}</span>
        </div>
        <div class="window-note">
          <template v-if="win.deadline">{{ t('submissions.closesOn', { date: win.deadline }) }} — </template>
          {{ t(state.key, { days: Math.abs(state.days ?? 0) }) }}
        </div>
      </div>
    </div>

    <div v-if="win.open" class="filing">
      <div class="field">
        <label for="submission-stage">{{ t('submissions.stageLabel') }}</label>
        <Select id="submission-stage" v-model="stage" :options="stageOptions" option-label="label" option-value="value" class="w-full" />
      </div>
      <div class="field">
        <label for="submission-body">{{ t('submissions.bodyLabel') }}</label>
        <Textarea id="submission-body" v-model="body" rows="5" auto-resize class="w-full" :placeholder="t('submissions.bodyPlaceholder')" />
      </div>
      <div class="field">
        <label for="submission-file">{{ t('submissions.fileLabel') }}</label>
        <FilePicker
          v-model="file"
          input-id="submissions-file"
          accept=".pdf,.doc,.docx"
          :label="t('files.choose')"
          :hint="t('files.hint')"
          :remove-label="t('files.remove')"
        />
      </div>
      <Button :label="t('submissions.file')" icon="pi pi-send" class="trab-btn" :disabled="!canFile" :loading="filing" @click="submit" />
    </div>

    <h4 class="filed-head">{{ t('submissions.filedTitle') }}</h4>
    <div v-if="loading" class="flex flex-col gap-2">
      <Skeleton v-for="n in 2" :key="n" height="3rem" />
    </div>
    <ul v-else-if="submissions.length" class="filed">
      <li v-for="s in submissions" :key="s.id">
        <div class="min-w-0">
          <div class="name">
            {{ t(stageKey(s.stage)) }}
            <Tag :value="partyLabel(s.party)" :severity="s.party === 'APPELLANT' ? 'success' : 'info'" class="ml-2" />
          </div>
          <div class="meta">{{ s.filedByName || t('common.dash') }} · {{ String(s.createdAt).slice(0, 10) }}</div>
          <p v-if="s.body" class="body">{{ s.body }}</p>
        </div>
        <button v-if="s.fileName" type="button" class="attach" @click="preview(s)">
          <i class="pi pi-paperclip"></i> {{ s.originalName || t('submissions.attachment') }}
        </button>
      </li>
    </ul>
    <div v-else class="empty-state">
      <i class="pi pi-file-edit"></i>
      <p>{{ t('submissions.empty') }}</p>
    </div>

    <template #footer><Button :label="t('common.close')" outlined @click="emit('update:visible', false)" /></template>
  </Dialog>
</template>

<style scoped>
.intro {
  margin: 0 0 1rem;
  font-size: 0.85rem;
  color: #6b7280;
}
.window {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.8rem 0.9rem;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}
.window.warn {
  border-color: #fcd34d;
  background: #fffbeb;
}
.window.danger {
  border-color: #fca5a5;
  background: #fef2f2;
}
.window.success {
  border-color: #a7f3d0;
  background: #ecfdf5;
}
.window i {
  margin-top: 0.15rem;
  color: #1b6b3d;
}
.window-head {
  font-weight: 600;
  font-size: 0.9rem;
}
.window-note {
  font-size: 0.78rem;
  color: #6b7280;
}
.filing {
  display: grid;
  gap: 0.85rem;
  margin-top: 1rem;
}
.field {
  display: grid;
  gap: 0.35rem;
}
.field label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
}
.filed-head {
  margin: 1.4rem 0 0.6rem;
  font-size: 0.9rem;
  font-weight: 700;
}
.filed {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.6rem;
}
.filed li {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}
.filed li > div:first-child {
  flex: 1;
}
.name {
  font-weight: 600;
  font-size: 0.9rem;
}
.meta {
  font-size: 0.78rem;
  color: #6b7280;
}
.body {
  margin: 0.4rem 0 0;
  font-size: 0.82rem;
  white-space: pre-wrap;
}
.attach {
  font-size: 0.78rem;
  color: #1b6b3d;
  white-space: nowrap;
  background: none;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.25rem 0.6rem;
  cursor: pointer;
  font-family: inherit;
}
.attach:hover {
  background: #f6f7f9;
}
</style>
