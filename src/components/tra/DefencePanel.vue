<script setup>
import { computed, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import Tag from 'primevue/tag';
import { TraApi } from '@/service/TraApi.js';
import { apiErrorMessage, formatDateTime } from '@/utils/format.js';
import { fileIcon, useStoredFile } from '@/utils/tra/files.js';
import DeadlineBanner from './DeadlineBanner.vue';
import SectionError from './SectionError.vue';
import FilePicker from '@/components/FilePicker.vue';

const props = defineProps({
  appeal: { type: Object, required: true },
  replies: { type: Array, default: () => [] },
  canReply: { type: Boolean, default: false },
  error: { type: String, default: '' },
});
const emit = defineEmits(['filed', 'retry']);

const toast = useToast();
const { busy, openFile } = useStoredFile();
const replyBody = ref('');
const attachment = ref(null);
const filing = ref(false);

// The defence may be typed, attached, or both.
const canSubmit = computed(() => !!replyBody.value.trim() || !!attachment.value);

const submitReply = async () => {
  if (!canSubmit.value) return;
  filing.value = true;
  try {
    await TraApi.fileReply(props.appeal.id, replyBody.value, attachment.value);
    replyBody.value = '';
    attachment.value = null;
    toast.add({ severity: 'success', summary: 'Filed', detail: 'Statement of defence filed', life: 3000 });
    emit('filed');
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Filing failed', detail: apiErrorMessage(e, 'Failed to file reply'), life: 4000 });
  } finally {
    filing.value = false;
  }
};
</script>

<template>
  <div>
    <DeadlineBanner :appeal="appeal" />

    <!-- A decided or concluded case no longer takes a defence; the banner above explains why -->
    <div v-if="canReply && !appeal.caseClosed" class="filing-form">
      <label for="reply-body" class="fld-label">File statement of defence</label>
      <Textarea
        id="reply-body"
        v-model="replyBody"
        rows="5"
        class="w-full"
        placeholder="State TRA's grounds of opposition to this appeal…"
        :disabled="filing"
      />
      <div class="attach-row">
        <label for="reply-file" class="fld-label">Attach the defence (optional)</label>
        <FilePicker
          v-model="attachment"
          input-id="reply-file"
          accept=".pdf,.doc,.docx"
          label="Choose a document"
          hint="PDF or Word, or drop it here"
          :disabled="filing"
        />
      </div>
      <div class="actions">
        <Button
          label="File Defence"
          icon="pi pi-send"
          class="trab-btn"
          :loading="filing"
          :disabled="filing || !canSubmit"
          @click="submitReply"
        />
      </div>
    </div>

    <h2 class="sec-head">Replies on this appeal</h2>
    <SectionError v-if="error" :message="error" @retry="emit('retry')" />
    <template v-else>
      <article v-for="r in replies" :key="r.id" class="reply-card" :class="r.party === 'APPELLANT' ? 'from-appellant' : 'from-tra'">
        <div class="card-head">
          <strong class="who">
            {{ r.filedByName || 'TRA Officer' }}
            <Tag
              :value="r.party === 'APPELLANT' ? 'Appellant' : 'TRA'"
              :severity="r.party === 'APPELLANT' ? 'success' : 'info'"
              class="ml-2"
            />
          </strong>
          <span class="when">{{ formatDateTime(r.createdAt) }}</span>
        </div>
        <p v-if="r.body" class="body">{{ r.body }}</p>
        <button
          v-if="r.fileName"
          type="button"
          class="attach"
          :disabled="busy === `download:${r.fileName}`"
          @click="openFile(r.fileName, 'view', r.originalName)"
        >
          <i class="pi" :class="fileIcon(r.originalName)"></i>
          {{ r.originalName || 'Attachment' }}
        </button>
      </article>
      <div v-if="!replies.length" class="empty-state">
        <i class="pi pi-pencil" aria-hidden="true"></i>
        <p>No defence filed yet.</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.attach-row {
  display: grid;
  gap: 0.35rem;
  margin-top: 0.75rem;
}
.reply-card.from-appellant {
  border-left: 3px solid var(--trab-primary);
}
.reply-card.from-tra {
  border-left: 3px solid #3b82f6;
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
.filing-form {
  margin-bottom: 1.25rem;
}
.fld-label {
  display: block;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--trab-heading);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 0.5rem;
}
.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}
.sec-head {
  font-size: 0.78rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 0 0 0.5rem;
}
.reply-card {
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
  color: var(--trab-heading);
}
.when {
  font-size: 0.75rem;
  color: #6b7280;
}
.body {
  margin: 0;
  font-size: 0.85rem;
  white-space: pre-wrap;
}
</style>
