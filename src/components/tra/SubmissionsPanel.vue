<script setup>
import { computed, onMounted, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import { TraApi } from '@/service/TraApi.js';
import { apiErrorMessage, formatDateTime } from '@/utils/format.js';
import { SUBMISSION_STAGES } from '@/utils/submissions.js';
import { windowState } from '@/utils/tra/submissionWindow.js';
import { fileIcon, useStoredFile } from '@/utils/tra/files.js';
import SectionError from './SectionError.vue';
import FilePicker from '@/components/FilePicker.vue';

const props = defineProps({
  appeal: { type: Object, required: true },
  canFile: { type: Boolean, default: false },
});
const emit = defineEmits(['filed']);

const toast = useToast();
const { busy, openFile } = useStoredFile();

const STAGE_LABELS = {
  SUBMISSION_IN_CHIEF: 'Submission in chief',
  REPLY: 'Reply',
  REJOINDER: 'Rejoinder',
};
const stageLabel = (stage) => STAGE_LABELS[stage] || stage;

const win = ref(null);
const loading = ref(true);
const error = ref('');
const filing = ref(false);
const stage = ref('REPLY');
const body = ref('');
const attachment = ref(null);

const state = computed(() => windowState(win.value));
const submissions = computed(() => win.value?.submissions ?? []);
const canSubmit = computed(() => !!win.value?.open && (body.value.trim().length > 0 || !!attachment.value));
const stageOptions = SUBMISSION_STAGES.map((value) => ({ value, label: STAGE_LABELS[value] }));

const load = async () => {
  loading.value = true;
  try {
    win.value = await TraApi.submissions(props.appeal.id);
    error.value = '';
    // Lead with the stage TRA has not filed yet; the respondent normally replies.
    const filed = new Set(submissions.value.filter((s) => s.party === 'RESPONDENT').map((s) => s.stage));
    stage.value = SUBMISSION_STAGES.find((s) => !filed.has(s)) ?? 'REJOINDER';
  } catch (err) {
    error.value = apiErrorMessage(err, 'Written submissions could not be loaded.');
  } finally {
    loading.value = false;
  }
};

const submit = async () => {
  filing.value = true;
  try {
    await TraApi.fileSubmission(props.appeal.id, { stage: stage.value, body: body.value, file: attachment.value });
    body.value = '';
    attachment.value = null;
    toast.add({ severity: 'success', summary: 'Filed', detail: 'Written submission filed', life: 3000 });
    await load();
    emit('filed');
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Filing failed', detail: apiErrorMessage(err, 'The submission was not filed.'), life: 5000 });
  } finally {
    filing.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div>
    <div class="window" :class="state.severity">
      <i class="pi" :class="win?.hearingDate ? 'pi-calendar' : 'pi-clock'"></i>
      <div>
        <strong v-if="win?.hearingDate">
          Hearing on {{ win.hearingDate }}<span v-if="win.venue"> at {{ win.venue }}</span>
        </strong>
        <strong v-else>No hearing scheduled</strong>
        <p>{{ state.message }}</p>
      </div>
    </div>

    <div v-if="canFile && win?.open" class="filing">
      <div class="field">
        <label for="submission-stage">Stage</label>
        <Select
          id="submission-stage"
          v-model="stage"
          :options="stageOptions"
          option-label="label"
          option-value="value"
          class="w-full"
          :disabled="filing"
        />
      </div>
      <div class="field">
        <label for="submission-body">Submission</label>
        <Textarea
          id="submission-body"
          v-model="body"
          rows="5"
          auto-resize
          class="w-full"
          placeholder="Type the submission, or leave this blank and attach it below…"
          :disabled="filing"
        />
      </div>
      <div class="field">
        <label for="submission-file">Attach a document (optional)</label>
        <FilePicker
          v-model="attachment"
          input-id="submission-file"
          accept=".pdf,.doc,.docx"
          label="Choose a document"
          hint="PDF or Word, or drop it here"
          :disabled="filing"
        />
      </div>
      <div>
        <Button label="File submission" icon="pi pi-send" class="trab-btn" :disabled="!canSubmit" :loading="filing" @click="submit" />
      </div>
    </div>

    <h2 class="sec-head">Filed submissions</h2>
    <SectionError v-if="error" :message="error" @retry="load" />
    <div v-else-if="loading" class="empty-state">
      <i class="pi pi-spin pi-spinner"></i>
      <p>Loading submissions…</p>
    </div>
    <template v-else>
      <article v-for="s in submissions" :key="s.id" class="sub-card">
        <div class="sub-head">
          <strong>
            {{ stageLabel(s.stage) }}
            <Tag
              :value="s.party === 'RESPONDENT' ? 'TRA' : 'Appellant'"
              :severity="s.party === 'RESPONDENT' ? 'info' : 'success'"
              class="ml-2"
            />
          </strong>
          <span class="meta">{{ s.filedByName || '-' }} · {{ formatDateTime(s.createdAt) }}</span>
        </div>
        <p v-if="s.body" class="body">{{ s.body }}</p>
        <button
          v-if="s.fileName"
          type="button"
          class="attach"
          :disabled="busy === `download:${s.fileName}`"
          @click="openFile(s.fileName, 'view', s.originalName)"
        >
          <i class="pi" :class="fileIcon(s.originalName)"></i>
          {{ s.originalName || 'Attachment' }}
        </button>
      </article>
      <div v-if="!submissions.length" class="empty-state">
        <i class="pi pi-file-edit"></i>
        <p>Nothing has been filed for this hearing yet.</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.sec-head {
  font-size: 0.78rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 1.4rem 0 0.6rem;
}
.window {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  border: 1px solid var(--trab-border);
  border-left-width: 4px;
  border-radius: 8px;
  padding: 0.65rem 0.8rem;
  background: #fcfcfd;
}
.window p {
  margin: 0.15rem 0 0;
  font-size: 0.76rem;
  color: #6b7280;
}
.window strong {
  font-size: 0.85rem;
}
.window i {
  margin-top: 0.15rem;
  color: var(--trab-primary);
}
.window.secondary {
  border-left-color: var(--trab-border);
}
.window.success {
  border-left-color: var(--trab-success);
}
.window.warn {
  border-left-color: var(--trab-warning);
  background: #fffdf3;
}
.window.danger {
  border-left-color: var(--trab-danger);
  background: #fef5f5;
}
.filing {
  display: grid;
  gap: 0.85rem;
  margin-top: 1.1rem;
}
.field {
  display: grid;
  gap: 0.35rem;
}
.field label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.sub-card {
  border: 1px solid var(--trab-border);
  border-radius: 8px;
  padding: 0.7rem 0.85rem;
  margin-bottom: 0.6rem;
  background: #fcfcfd;
}
.sub-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}
.sub-head strong {
  font-size: 0.85rem;
}
.meta {
  font-size: 0.75rem;
  color: #6b7280;
}
.body {
  margin: 0;
  font-size: 0.82rem;
  white-space: pre-wrap;
}
.attach {
  margin-top: 0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.76rem;
  color: var(--trab-primary);
  background: none;
  border: 1px solid var(--trab-border);
  border-radius: 6px;
  padding: 0.25rem 0.6rem;
  cursor: pointer;
  font-family: inherit;
}
.attach:hover {
  background: #f6f7f9;
}
</style>
