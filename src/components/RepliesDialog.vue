<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import Skeleton from 'primevue/skeleton';
import { SelfServiceAppeals } from '@/service/SelfServiceApi.js';
import { Config } from '@/utils/Config.js';
import { openPreview } from '@/utils/preview.js';
import { apiErrorMessage } from '@/utils/format.js';

const props = defineProps({
  visible: { type: Boolean, default: false },
  appeal: { type: Object, default: null },
});
const emit = defineEmits(['update:visible']);

const { t } = useI18n();
const toast = useToast();

const replies = ref([]);
const loading = ref(false);
const filing = ref(false);
const body = ref('');
const file = ref(null);
const fileInput = ref(null);

// The appellant answers TRA's defence, so there must be one on record first.
const defenceOnRecord = computed(() => replies.value.some((r) => r.party === 'RESPONDENT'));
const canFile = computed(() => defenceOnRecord.value && (body.value.trim() || file.value));

const load = async () => {
  if (!props.appeal) return;
  loading.value = true;
  try {
    replies.value = await SelfServiceAppeals.getReplies(props.appeal.id);
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

const pickFile = (event) => {
  file.value = event.target.files?.[0] || null;
};

const submit = async () => {
  filing.value = true;
  try {
    await SelfServiceAppeals.fileReply(props.appeal.id, { body: body.value, file: file.value });
    toast.add({ severity: 'success', summary: t('common.success'), detail: t('replies.filed'), life: 5000 });
    body.value = '';
    file.value = null;
    if (fileInput.value) fileInput.value.value = '';
    await load();
  } catch (err) {
    // The API explains why a reply was refused; show its words, not ours.
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
    load: async () => {
      const res = await fetch(`${Config.API_BASE_URL}/files/${item.fileName}`);
      if (!res.ok) throw new Error('The document could not be opened');
      return res.blob();
    },
  });
const partyLabel = (party) => (party === 'RESPONDENT' ? t('replies.byRespondent') : t('replies.byAppellant'));
</script>

<template>
  <Dialog
    :visible="visible"
    :header="t('replies.title')"
    modal
    :style="{ width: '720px' }"
    :breakpoints="{ '768px': '95vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <p class="intro">{{ t('replies.intro') }}</p>

    <div v-if="loading" class="flex flex-col gap-2">
      <Skeleton v-for="n in 2" :key="n" height="3rem" />
    </div>
    <ul v-else-if="replies.length" class="thread">
      <li v-for="reply in replies" :key="reply.id" :class="reply.party === 'RESPONDENT' ? 'from-tra' : 'from-me'">
        <div class="head">
          <Tag :value="partyLabel(reply.party)" :severity="reply.party === 'RESPONDENT' ? 'info' : 'success'" />
          <span class="meta">{{ reply.filedByName || t('common.dash') }} · {{ String(reply.createdAt).slice(0, 10) }}</span>
        </div>
        <p v-if="reply.body" class="body">{{ reply.body }}</p>
        <button v-if="reply.fileName" type="button" class="attach" @click="preview(reply)">
          <i class="pi pi-paperclip"></i> {{ reply.originalName || t('replies.attachment') }}
        </button>
      </li>
    </ul>
    <div v-else class="empty-state">
      <i class="pi pi-comments"></i>
      <p>{{ t('replies.empty') }}</p>
    </div>

    <template v-if="defenceOnRecord">
      <h4 class="section-title">{{ t('replies.fileTitle') }}</h4>
      <div class="field">
        <label for="reply-body">{{ t('replies.bodyLabel') }}</label>
        <Textarea id="reply-body" v-model="body" rows="5" auto-resize class="w-full" :placeholder="t('replies.bodyPlaceholder')" />
      </div>
      <div class="field">
        <label for="reply-file">{{ t('replies.fileLabel') }}</label>
        <input id="reply-file" ref="fileInput" type="file" accept=".pdf,.doc,.docx" @change="pickFile" />
      </div>
      <Button :label="t('replies.file')" icon="pi pi-send" class="trab-btn" :disabled="!canFile" :loading="filing" @click="submit" />
    </template>
    <p v-else-if="!loading" class="waiting">{{ t('replies.waitingForDefence') }}</p>

    <template #footer><Button :label="t('common.close')" outlined @click="emit('update:visible', false)" /></template>
  </Dialog>
</template>

<style scoped>
.intro {
  margin: 0 0 1rem;
  font-size: 0.85rem;
  color: #6b7280;
}
.thread {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.6rem;
}
.thread li {
  border: 1px solid #e5e7eb;
  border-left-width: 3px;
  border-radius: 10px;
  padding: 0.7rem 0.9rem;
}
.thread li.from-tra {
  border-left-color: #3b82f6;
}
.thread li.from-me {
  border-left-color: var(--trab-primary);
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.35rem;
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
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.5rem;
  font-size: 0.78rem;
  color: var(--trab-primary);
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
.section-title {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #6b7280;
  margin: 1.4rem 0 0.7rem;
}
.field {
  display: grid;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
}
.field label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
}
.waiting {
  margin: 1.2rem 0 0;
  font-size: 0.82rem;
  color: #6b7280;
}
</style>
