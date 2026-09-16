<script setup>
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import { TraApi } from '@/service/TraApi.js';
import { apiErrorMessage, formatDateTime } from '@/utils/format.js';
import SectionError from './SectionError.vue';

const props = defineProps({
  appealId: { type: String, required: true },
  notes: { type: Array, default: () => [] },
  error: { type: String, default: '' },
});
const emit = defineEmits(['added', 'retry']);

const toast = useToast();
const noteBody = ref('');
const saving = ref(false);

const addNote = async () => {
  if (!noteBody.value.trim()) return;
  saving.value = true;
  try {
    await TraApi.addNote(props.appealId, noteBody.value);
    noteBody.value = '';
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Internal note added', life: 2500 });
    emit('added');
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Note not saved', detail: apiErrorMessage(e, 'The note could not be saved.'), life: 4000 });
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div>
    <div class="note-hint"><i class="pi pi-lock" aria-hidden="true"></i> Internal to TRA — not shared with the Board or appellant.</div>
    <div class="note-form">
      <label for="note-body" class="fld-label">Add internal note</label>
      <Textarea id="note-body" v-model="noteBody" rows="3" class="w-full" placeholder="Add an internal case note…" :disabled="saving" />
      <div class="actions">
        <Button
          label="Add Note"
          icon="pi pi-plus"
          class="trab-btn"
          :loading="saving"
          :disabled="saving || !noteBody.trim()"
          @click="addNote"
        />
      </div>
    </div>
    <SectionError v-if="error" :message="error" @retry="emit('retry')" />
    <template v-else>
      <article v-for="nt in notes" :key="nt.id" class="reply-card">
        <div class="card-head">
          <strong class="who">{{ nt.authorName || 'TRA Officer' }}</strong>
          <span class="when">{{ formatDateTime(nt.createdAt) }}</span>
        </div>
        <p class="body">{{ nt.body }}</p>
      </article>
      <div v-if="!notes.length" class="empty-state">
        <i class="pi pi-comment" aria-hidden="true"></i>
        <p>No internal notes yet.</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.note-hint {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  background: #f5f6f7;
  padding: 0.4rem 0.75rem;
  border-radius: 7px;
  margin-bottom: 1rem;
}
.note-form {
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
