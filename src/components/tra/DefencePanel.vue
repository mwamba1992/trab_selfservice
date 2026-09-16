<script setup>
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import { TraApi } from '@/service/TraApi.js';
import { apiErrorMessage, formatDateTime } from '@/utils/format.js';
import DeadlineBanner from './DeadlineBanner.vue';
import SectionError from './SectionError.vue';

const props = defineProps({
  appeal: { type: Object, required: true },
  replies: { type: Array, default: () => [] },
  canReply: { type: Boolean, default: false },
  error: { type: String, default: '' },
});
const emit = defineEmits(['filed', 'retry']);

const toast = useToast();
const replyBody = ref('');
const filing = ref(false);

const submitReply = async () => {
  if (!replyBody.value.trim()) return;
  filing.value = true;
  try {
    await TraApi.fileReply(props.appeal.id, replyBody.value);
    replyBody.value = '';
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
      <div class="actions">
        <Button
          label="File Defence"
          icon="pi pi-send"
          class="trab-btn"
          :loading="filing"
          :disabled="filing || !replyBody.trim()"
          @click="submitReply"
        />
      </div>
    </div>

    <h2 class="sec-head">Filed Replies</h2>
    <SectionError v-if="error" :message="error" @retry="emit('retry')" />
    <template v-else>
      <article v-for="r in replies" :key="r.id" class="reply-card">
        <div class="card-head">
          <strong class="who">{{ r.filedByName || 'TRA Officer' }}</strong>
          <span class="when">{{ formatDateTime(r.createdAt) }}</span>
        </div>
        <p class="body">{{ r.body }}</p>
      </article>
      <div v-if="!replies.length" class="empty-state">
        <i class="pi pi-pencil" aria-hidden="true"></i>
        <p>No defence filed yet.</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
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
