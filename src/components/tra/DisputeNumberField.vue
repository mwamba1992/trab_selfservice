<script setup>
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { TraApi } from '@/service/TraApi.js';
import { apiErrorMessage } from '@/utils/format.js';

const props = defineProps({
  appeal: { type: Object, required: true },
  canEdit: { type: Boolean, default: false },
});
const emit = defineEmits(['saved']);

const toast = useToast();
const editing = ref(false);
const draft = ref('');
const saving = ref(false);

const start = () => {
  draft.value = props.appeal.disputeNo ?? '';
  editing.value = true;
};

const save = async () => {
  saving.value = true;
  try {
    const updated = await TraApi.setDisputeNo(props.appeal.id, draft.value.trim());
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: draft.value.trim() ? 'Dispute number linked' : 'Dispute number removed',
      life: 3000,
    });
    editing.value = false;
    emit('saved', updated);
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Not saved', detail: apiErrorMessage(e, 'The dispute number could not be saved'), life: 4500 });
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <section class="dispute" aria-labelledby="dispute-label">
    <div class="dispute-head">
      <span id="dispute-label" class="dispute-label">TRA Dispute No.</span>
      <Button v-if="canEdit && !editing" :label="appeal.disputeNo ? 'Change' : 'Link'" link size="small" class="link-btn" @click="start" />
    </div>
    <form v-if="editing" class="dispute-form" @submit.prevent="save">
      <label for="dispute-no" class="sr-only">TRA dispute number</label>
      <InputText id="dispute-no" v-model="draft" maxlength="60" placeholder="e.g. TRA/OBJ/2026/0142" :disabled="saving" class="w-full" />
      <div class="actions">
        <Button label="Cancel" outlined size="small" :disabled="saving" @click="editing = false" />
        <Button type="submit" label="Save" icon="pi pi-check" size="small" class="trab-btn" :loading="saving" />
      </div>
    </form>
    <p v-else class="dispute-value">{{ appeal.disputeNo || 'Not linked' }}</p>
  </section>
</template>

<style scoped>
.dispute {
  margin: 0 0 1rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--trab-border);
  border-radius: 8px;
  background: #f6faf7;
}
.dispute-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.dispute-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--trab-muted);
}
.dispute-value {
  margin: 0.25rem 0 0;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--trab-heading);
  font-variant-numeric: tabular-nums;
}
.dispute-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
.link-btn {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0;
  color: var(--trab-primary);
}
</style>
