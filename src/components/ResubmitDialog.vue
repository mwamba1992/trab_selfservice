<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import { apiErrorMessage } from '@/utils/format.js';

const props = defineProps({
  visible: { type: Boolean, default: false },
  // 'notice' or 'appeal' — decides which fields may be corrected.
  kind: { type: String, default: 'notice' },
  record: { type: Object, default: null },
  // { resubmit(id, corrections) }
  api: { type: Object, required: true },
});
const emit = defineEmits(['update:visible', 'resubmitted']);

const { t } = useI18n();
const toast = useToast();
const form = ref({});
const saving = ref(false);

const fields = computed(() =>
  props.kind === 'appeal'
    ? [
        { key: 'natureOfAppeal', label: t('fileAppeal.natureOfAppeal'), type: 'text' },
        { key: 'assessmentNo', label: t('fileAppeal.assessmentNo'), type: 'input' },
        { key: 'taxedOffice', label: t('fileAppeal.taxedOffice'), type: 'input' },
      ]
    : [
        { key: 'dateOfTaxationDecision', label: t('notices.decisionDate'), type: 'date' },
        { key: 'dateOfServiceDecision', label: t('notices.serviceDate'), type: 'date' },
        { key: 'description', label: t('fields.remarks'), type: 'text' },
      ],
);

watch(
  () => [props.visible, props.record?.id],
  ([open]) => {
    if (!open || !props.record) return;
    form.value = Object.fromEntries(fields.value.map((f) => [f.key, props.record[f.key] ?? '']));
  },
);

const submit = async () => {
  saving.value = true;
  try {
    // Only changed values go up; blanks are left as they were.
    const corrections = Object.fromEntries(Object.entries(form.value).filter(([, v]) => v !== '' && v !== null));
    await props.api.resubmit(props.record.id, corrections);
    toast.add({ severity: 'success', summary: t('common.success'), detail: t('filingStatus.resubmitted'), life: 5000 });
    emit('resubmitted');
    emit('update:visible', false);
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('common.actionFailed')), life: 6000 });
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <Dialog
    :visible="visible"
    :header="t('filingStatus.correctTitle')"
    modal
    :style="{ width: '560px' }"
    :breakpoints="{ '640px': '95vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <div v-if="record" class="flex flex-col gap-3">
      <div class="reason-box">
        <strong>{{ t('filingStatus.reason') }}:</strong> {{ record.returnReason || '—' }}
      </div>

      <p v-if="kind === 'appeal'" class="hint">{{ t('filingStatus.annexureHint') }}</p>

      <div v-for="f in fields" :key="f.key" class="field">
        <label :for="`fix-${f.key}`">{{ f.label }}</label>
        <Textarea v-if="f.type === 'text'" :id="`fix-${f.key}`" v-model="form[f.key]" rows="3" auto-resize class="w-full" />
        <InputText v-else :id="`fix-${f.key}`" v-model="form[f.key]" :type="f.type === 'date' ? 'date' : 'text'" class="w-full" />
      </div>
    </div>

    <template #footer>
      <Button :label="t('common.cancel')" text :disabled="saving" @click="emit('update:visible', false)" />
      <Button :label="t('filingStatus.resubmit')" icon="pi pi-send" class="trab-btn" :loading="saving" @click="submit" />
    </template>
  </Dialog>
</template>

<style scoped>
.reason-box {
  padding: 0.7rem 0.9rem;
  border-radius: 8px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #991b1b;
  font-size: 0.85rem;
}
.hint {
  margin: 0;
  font-size: 0.8rem;
  color: #6b7280;
}
.field label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  margin-bottom: 0.3rem;
}
</style>
