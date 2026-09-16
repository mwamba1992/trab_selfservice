<script setup>
import { computed, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';
import { TraApi } from '@/service/TraApi.js';
import { apiErrorMessage } from '@/utils/format.js';

// The TRA desk is English by policy, so this dialog carries no translation keys.
const props = defineProps({
  visible: { type: Boolean, default: false },
});
const emit = defineEmits(['update:visible', 'lodged']);

const toast = useToast();

const APPLICATION_TYPES = ['Normal Application', 'Bill of Cost', 'Execution'];

const applicationType = ref('Normal Application');
const appealId = ref('');
const nature = ref('');
const appeals = ref([]);
const loadingAppeals = ref(false);
const saving = ref(false);
const error = ref('');

// Only appeals TRA is defending may carry a TRA application; left empty, the
// application stands on its own.
const appealOptions = computed(() =>
  appeals.value.map((appeal) => ({
    value: appeal.id,
    label: `${appeal.appealNo || 'No number yet'} — ${appeal.appellantName}`,
  })),
);

const loadAppeals = async () => {
  loadingAppeals.value = true;
  try {
    appeals.value = (await TraApi.appeals({ page: 1, size: 100, scope: 'all' })).items;
  } catch (err) {
    error.value = apiErrorMessage(err, 'The appeal list could not be loaded.');
  } finally {
    loadingAppeals.value = false;
  }
};

watch(
  () => props.visible,
  (open) => {
    if (!open) return;
    applicationType.value = 'Normal Application';
    appealId.value = '';
    nature.value = '';
    error.value = '';
    loadAppeals();
  },
);

const submit = async () => {
  error.value = '';
  if (!nature.value.trim()) {
    error.value = 'Say what the application asks the Board to do.';
    return;
  }
  saving.value = true;
  try {
    const lodged = await TraApi.lodgeApplication({
      applicationType: applicationType.value,
      natureOfApplication: nature.value.trim(),
      ...(appealId.value ? { appealId: appealId.value } : {}),
    });
    toast.add({
      severity: 'success',
      summary: 'Lodged',
      detail: `Application ${lodged.applicationNo} lodged with the Board`,
      life: 5000,
    });
    emit('update:visible', false);
    emit('lodged', lodged);
  } catch (err) {
    error.value = apiErrorMessage(err, 'The application was not lodged.');
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <Dialog
    :visible="visible"
    header="Lodge an application"
    modal
    :style="{ width: '620px' }"
    :breakpoints="{ '640px': '95vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <p class="intro">
      An application TRA lodges with the Board. The Authority is a party by office, so it carries no fee and no control number — it is
      registered as soon as it is lodged.
    </p>

    <div v-if="error" class="note note-error" role="alert">
      <i class="pi pi-exclamation-triangle"></i><span>{{ error }}</span>
    </div>

    <div class="field">
      <label for="lodge-type">Application type</label>
      <Select id="lodge-type" v-model="applicationType" :options="APPLICATION_TYPES" class="w-full" :disabled="saving" />
    </div>

    <div class="field">
      <label for="lodge-appeal">Appeal</label>
      <Select
        id="lodge-appeal"
        v-model="appealId"
        :options="appealOptions"
        option-label="label"
        option-value="value"
        filter
        show-clear
        placeholder="No appeal — a standalone application"
        :loading="loadingAppeals"
        class="w-full"
        :disabled="saving"
      />
    </div>

    <div class="field">
      <label for="lodge-nature">Nature of the application</label>
      <Textarea
        id="lodge-nature"
        v-model="nature"
        rows="5"
        auto-resize
        class="w-full"
        placeholder="What TRA asks the Board to do, and on what grounds…"
        :disabled="saving"
      />
    </div>

    <template #footer>
      <Button label="Cancel" outlined :disabled="saving" @click="emit('update:visible', false)" />
      <Button label="Lodge application" icon="pi pi-send" class="trab-btn" :loading="saving" @click="submit" />
    </template>
  </Dialog>
</template>

<style scoped>
.intro {
  margin: 0 0 1rem;
  font-size: 0.82rem;
  color: #6b7280;
}
.field {
  display: grid;
  gap: 0.35rem;
  margin-bottom: 0.9rem;
}
.field label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #374151;
}
.note {
  margin-bottom: 0.9rem;
}
</style>
