<script setup>
import { computed, onMounted, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Skeleton from 'primevue/skeleton';
import { TraApi } from '@/service/TraApi.js';
import { apiErrorMessage } from '@/utils/format.js';

// The TRA desk is English by policy, so this card carries no translation keys.
const toast = useToast();
const days = ref(null);
const saved = ref(null);
const loading = ref(true);
const loadError = ref('');
const saving = ref(false);
const submitted = ref(false);

// Backend ReplyDeadlineDto: integer >= 1.
const fieldError = computed(() => {
  const v = days.value;
  if (v === null || Number.isNaN(v)) return 'Enter the number of days.';
  if (!Number.isInteger(v) || v < 1) return 'Enter a whole number of at least 1.';
  return '';
});
const showError = computed(() => submitted.value && !!fieldError.value);

// The field holds a string so an empty box stays empty instead of becoming 0.
const daysText = computed(() => (days.value === null ? '' : String(days.value)));
const onDaysInput = (value) => {
  days.value = value === '' || value === null || value === undefined ? null : Number(value);
};

const load = async () => {
  loading.value = true;
  loadError.value = '';
  try {
    const res = await TraApi.getReplyDeadlineDays();
    days.value = res.days;
    saved.value = res.days;
  } catch (e) {
    loadError.value = apiErrorMessage(e, 'Could not load the reply deadline.');
  } finally {
    loading.value = false;
  }
};

const save = async () => {
  submitted.value = true;
  if (fieldError.value || days.value === null) return;
  saving.value = true;
  try {
    const res = await TraApi.setReplyDeadlineDays(days.value);
    days.value = res.days;
    saved.value = res.days;
    submitted.value = false;
    toast.add({ severity: 'success', summary: 'Saved', detail: `Reply deadline set to ${res.days} days`, life: 3000 });
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Save failed', detail: apiErrorMessage(e, 'Could not save the reply deadline.'), life: 5000 });
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>

<template>
  <section class="ss-card deadline" aria-labelledby="deadline-title">
    <div class="deadline-text">
      <h2 id="deadline-title" class="deadline-title">Reply deadline</h2>
      <p class="deadline-desc">Days TRA has to file a reply, counted from the appeal filing date.</p>
    </div>

    <div v-if="loading" class="deadline-controls" aria-busy="true">
      <Skeleton width="13.75rem" height="2.4rem" />
      <span class="sr-only">Loading reply deadline</span>
    </div>

    <div v-else-if="loadError" class="note note-error deadline-controls" role="alert">
      <i class="pi pi-exclamation-triangle"></i>
      <span>{{ loadError }}</span>
      <Button label="Retry" icon="pi pi-refresh" outlined size="small" @click="load" />
    </div>

    <form v-else class="deadline-controls" novalidate @submit.prevent="save">
      <div>
        <label for="deadline-days" class="sr-only">Reply deadline in days</label>
        <div class="deadline-input">
          <InputText
            id="deadline-days"
            :model-value="daysText"
            type="number"
            min="1"
            step="1"
            inputmode="numeric"
            class="deadline-field"
            :invalid="showError"
            :aria-describedby="showError ? 'deadline-days-error' : undefined"
            @update:model-value="onDaysInput"
          />
          <span class="deadline-unit">days</span>
          <Button
            type="submit"
            label="Save"
            :icon="saving ? 'pi pi-spin pi-spinner' : 'pi pi-check'"
            class="trab-btn"
            size="small"
            :disabled="saving || days === saved"
          />
        </div>
        <p v-if="showError" id="deadline-days-error" class="field-error">{{ fieldError }}</p>
      </div>
    </form>
  </section>
</template>

<style scoped>
.deadline {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem 1.5rem;
  margin-bottom: 1rem;
}
.deadline-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--trab-heading, #1e293b);
}
.deadline-desc {
  margin: 0.15rem 0 0;
  font-size: 0.76rem;
  color: var(--trab-muted);
}
.deadline-controls {
  margin-left: auto;
}
/* The error banner is a shared .note, so drop its stacked bottom margin here. */
.deadline-controls.note {
  margin-bottom: 0;
}
.deadline-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.deadline-field {
  width: 6rem;
}
.deadline-unit {
  font-size: 0.8rem;
  color: var(--trab-muted);
}
@media (max-width: 40rem) {
  .deadline-controls {
    margin-left: 0;
    width: 100%;
  }
}
</style>
