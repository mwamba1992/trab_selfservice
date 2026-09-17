<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Skeleton from 'primevue/skeleton';
import Tag from 'primevue/tag';
import FilePicker from '@/components/FilePicker.vue';
import { SelfServiceFiler } from '@/service/SelfServiceApi.js';
import { apiErrorMessage } from '@/utils/format.js';

/**
 * Who this account is. The Board accepts filings from people it can identify
 * and holds them to what they file, so this is what decides whether anything
 * filed here reaches the register.
 */
const { t } = useI18n();
const toast = useToast();

const KINDS = ['ORGANISATION', 'INDIVIDUAL', 'ADVOCATE', 'TAX_CONSULTANT'];
/** The two who act for other people must show the Board their standing. */
const NEEDS_CERTIFICATE = ['ADVOCATE', 'TAX_CONSULTANT'];

const identity = ref(null);
const loading = ref(true);
const saving = ref(false);
const editing = ref(false);

const form = ref({ kind: 'ORGANISATION', idNumber: '', registeredName: '', certificate: null });

const kindOptions = computed(() => KINDS.map((kind) => ({ value: kind, label: t(`filer.kinds.${kind}`) })));
const idLabel = computed(() => t(`filer.idLabel.${form.value.kind}`));
const needsCertificate = computed(() => NEEDS_CERTIFICATE.includes(form.value.kind));
const status = computed(() => identity.value?.status ?? null);
const showForm = computed(() => editing.value || !identity.value || status.value === 'REJECTED');

const load = async () => {
  loading.value = true;
  try {
    identity.value = await SelfServiceFiler.get();
    // Someone sending different details starts from what they said before,
    // not from an empty form.
    if (identity.value) {
      form.value = {
        kind: identity.value.kind,
        idNumber: identity.value.idNumber ?? '',
        registeredName: identity.value.registeredName ?? '',
        certificate: null,
      };
    }
  } catch {
    identity.value = null;
  } finally {
    loading.value = false;
  }
};
load();

const submit = async () => {
  saving.value = true;
  try {
    identity.value = await SelfServiceFiler.declare(form.value);
    editing.value = false;
    form.value.certificate = null;
    toast.add({ severity: 'success', summary: t('common.success'), detail: t('filer.saved'), life: 4000 });
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('common.actionFailed')), life: 6000 });
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div>
    <div class="page-header">
      <h2>{{ t('filer.title') }}</h2>
      <p>{{ t('filer.intro') }}</p>
    </div>

    <div v-if="loading" class="ss-card">
      <Skeleton height="2.5rem" class="mb-2" />
      <Skeleton height="2.5rem" />
    </div>

    <template v-else>
      <div v-if="identity" class="ss-card mb-3">
        <div class="status-row">
          <Tag
            :value="t(`filer.kinds.${identity.kind}`)"
            :severity="status === 'VERIFIED' ? 'success' : status === 'REJECTED' ? 'danger' : 'warn'"
          />
          <span class="id-number">{{ t(`filer.idLabel.${identity.kind}`) }}: <strong>{{ identity.idNumber }}</strong></span>
        </div>
        <p class="status-note" :class="status.toLowerCase()">
          {{ t(`filer.status${status.charAt(0) + status.slice(1).toLowerCase()}`) }}
        </p>
        <p v-if="identity.rejectionReason" class="reason">{{ t('filer.reasonGiven', { reason: identity.rejectionReason }) }}</p>
        <Button
          v-if="status !== 'VERIFIED' && !showForm"
          :label="t('filer.change')"
          size="small"
          outlined
          @click="editing = true"
        />
      </div>

      <form v-if="showForm" class="ss-card" @submit.prevent="submit">
        <div class="field">
          <label for="filer-kind">{{ t('filer.kind') }}</label>
          <Select
            v-model="form.kind"
            input-id="filer-kind"
            :options="kindOptions"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </div>

        <div class="field">
          <label for="filer-number">{{ idLabel }}</label>
          <InputText id="filer-number" v-model="form.idNumber" class="w-full" />
        </div>

        <div class="field">
          <label for="filer-name">{{ t('filer.registeredName') }}</label>
          <InputText id="filer-name" v-model="form.registeredName" class="w-full" />
        </div>

        <div v-if="needsCertificate" class="field">
          <label>{{ t('filer.certificate') }}</label>
          <FilePicker v-model="form.certificate" accept="application/pdf,image/*" />
          <small class="hint">{{ t('filer.certificateHint') }}</small>
        </div>

        <div class="actions">
          <Button type="submit" :label="t('filer.submit')" icon="pi pi-send" class="trab-btn" :loading="saving" />
        </div>
      </form>
    </template>
  </div>
</template>

<style scoped>
.status-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.id-number {
  font-size: 0.85rem;
  color: var(--text-muted, #64748b);
}
.status-note {
  margin: 0.6rem 0 0;
  font-size: 0.85rem;
  line-height: 1.55;
}
.status-note.verified {
  color: #047857;
}
.status-note.pending {
  color: #b45309;
}
.status-note.rejected {
  color: #b42318;
}
.reason {
  margin: 0.35rem 0 0.7rem;
  font-size: 0.82rem;
  color: #b42318;
}
.field {
  display: grid;
  gap: 0.35rem;
  margin-bottom: 0.9rem;
  max-width: 34rem;
}
.field label {
  font-size: 0.8rem;
  font-weight: 600;
}
.hint {
  font-size: 0.72rem;
  color: var(--text-muted, #64748b);
}
.actions {
  display: flex;
  gap: 0.5rem;
}
</style>
