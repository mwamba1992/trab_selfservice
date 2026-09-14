<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import DraftBanner from '@/components/DraftBanner.vue';
import { SelfServiceApplications, SelfServiceAppellants, SelfServiceAppeals } from '@/service/SelfServiceApi.js';
import { RegionService, TaxTypeService } from '@/service/SettingsService.js';
import { useDraft } from '@/composables/useDraft.js';
import { APPLICATION_TYPES } from '@/composables/useLabels.js';
import { apiErrorMessage } from '@/utils/format.js';

const { t } = useI18n();
const router = useRouter();
const toast = useToast();

const MAX_NATURE = 2000;

const appellants = ref([]);
const appeals = ref([]);
const regions = ref([]);
const taxTypes = ref([]);
const saving = ref(false);
const errors = ref({});

const emptyForm = () => ({
  appellantId: null,
  applicationType: null,
  appealId: null,
  regionId: null,
  taxTypeId: null,
  natureOfApplication: '',
});
const form = ref(emptyForm());

const draft = useDraft('application', { form });
const discardDraft = () => {
  draft.clear();
  form.value = emptyForm();
  errors.value = {};
};

const typeOptions = computed(() => APPLICATION_TYPES.map((type) => ({ value: type.value, label: t(`applications.types.${type.key}`) })));

onMounted(async () => {
  try {
    const [a, ap, r, tt] = await Promise.all([
      SelfServiceAppellants.getAll(),
      SelfServiceAppeals.getAll(1, 100),
      RegionService.getAll(),
      TaxTypeService.getAll(),
    ]);
    appellants.value = a.map((x) => ({
      ...x,
      displayName: `${x.firstName} ${x.lastName || ''}`.trim() + (x.tinNumber ? ` (${x.tinNumber})` : ''),
    }));
    appeals.value = (ap.items || []).map((x) => ({ ...x, displayName: `${x.appealNo || x.dateOfFiling} — ${x.appellantName}` }));
    regions.value = r;
    taxTypes.value = tt;
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: apiErrorMessage(err, t('fileApplication.lookupsFailed')),
      life: 5000,
    });
  }
});

const selectedAppellant = computed(() => appellants.value.find((a) => a.id === form.value.appellantId));
const selectedAppeal = computed(() => appeals.value.find((a) => a.id === form.value.appealId));

const validate = () => {
  const e = {};
  if (!form.value.appellantId) e.appellantId = t('common.required');
  if (!form.value.applicationType) e.applicationType = t('common.required');
  if (!form.value.natureOfApplication.trim()) e.natureOfApplication = t('common.required');
  errors.value = e;
  return !Object.keys(e).length;
};

const submit = async () => {
  if (!validate()) {
    toast.add({ severity: 'warn', summary: t('common.validation'), detail: t('validation.required'), life: 3000 });
    return;
  }
  saving.value = true;
  try {
    await SelfServiceApplications.create({
      appellantId: form.value.appellantId,
      applicationType: form.value.applicationType,
      appealId: form.value.appealId || undefined,
      regionId: form.value.regionId || undefined,
      taxTypeId: form.value.taxTypeId || undefined,
      natureOfApplication: form.value.natureOfApplication.trim(),
    });
    draft.clear();
    toast.add({ severity: 'success', summary: t('common.success'), detail: t('fileApplication.filed'), life: 5000 });
    router.push('/applications');
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('fileApplication.failed')), life: 6000 });
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div>
    <div class="page-header">
      <h2>{{ t('fileApplication.title') }}</h2>
      <p>{{ t('fileApplication.subtitle') }}</p>
    </div>

    <DraftBanner :show="draft.restored.value" @discard="discardDraft" />

    <form class="grid grid-cols-1 lg:grid-cols-3 gap-4" novalidate @submit.prevent="submit">
      <section class="ss-card lg:col-span-2 flex flex-col gap-4">
        <div>
          <label class="field-label" for="app-appellant">{{ t('fields.appellant') }} *</label>
          <Select
            v-model="form.appellantId"
            input-id="app-appellant"
            :options="appellants"
            option-label="displayName"
            option-value="id"
            :placeholder="t('fileApplication.selectAppellant')"
            class="w-full"
            filter
            :invalid="!!errors.appellantId"
          />
          <small v-if="errors.appellantId" class="field-error">{{ errors.appellantId }}</small>
          <small v-else class="field-hint">{{ t('fileApplication.appellantHelp') }}</small>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="field-label" for="app-type">{{ t('applications.applicationType') }} *</label>
            <Select
              v-model="form.applicationType"
              input-id="app-type"
              :options="typeOptions"
              option-label="label"
              option-value="value"
              :placeholder="t('fileNotice.select')"
              class="w-full"
              :invalid="!!errors.applicationType"
            />
            <small v-if="errors.applicationType" class="field-error">{{ errors.applicationType }}</small>
          </div>
          <div>
            <label class="field-label" for="app-appeal">{{ t('applications.relatedAppeal') }}</label>
            <Select
              v-model="form.appealId"
              input-id="app-appeal"
              :options="appeals"
              option-label="displayName"
              option-value="id"
              :placeholder="t('fileApplication.noAppeal')"
              class="w-full"
              filter
              show-clear
            />
            <small class="field-hint">{{ t('fileApplication.relatedAppealHelp') }}</small>
          </div>
          <div>
            <label class="field-label" for="app-region">{{ t('fields.region') }}</label>
            <Select
              v-model="form.regionId"
              input-id="app-region"
              :options="regions"
              option-label="name"
              option-value="id"
              :placeholder="t('fileNotice.selectRegion')"
              class="w-full"
              filter
              show-clear
            />
          </div>
          <div>
            <label class="field-label" for="app-tax">{{ t('fields.taxType') }}</label>
            <Select
              v-model="form.taxTypeId"
              input-id="app-tax"
              :options="taxTypes"
              option-label="name"
              option-value="id"
              :placeholder="t('fileNotice.select')"
              class="w-full"
              filter
              show-clear
            />
          </div>
        </div>

        <div>
          <label class="field-label" for="app-nature">{{ t('applications.nature') }} *</label>
          <Textarea
            id="app-nature"
            v-model="form.natureOfApplication"
            rows="6"
            class="w-full"
            :maxlength="MAX_NATURE"
            :placeholder="t('fileApplication.naturePlaceholder')"
            :invalid="!!errors.natureOfApplication"
          />
          <div class="flex justify-between gap-2">
            <small v-if="errors.natureOfApplication" class="field-error">{{ errors.natureOfApplication }}</small>
            <small v-else class="field-hint">{{ t('fileApplication.natureHelp') }}</small>
            <small class="field-hint">{{ form.natureOfApplication.length }} / {{ MAX_NATURE }}</small>
          </div>
        </div>
      </section>

      <aside class="ss-card">
        <h3 class="section-heading">{{ t('fileApplication.reviewTitle') }}</h3>
        <div class="view-row">
          <span class="view-label">{{ t('fields.appellant') }}</span
          ><span class="view-value">{{ selectedAppellant?.displayName || t('common.dash') }}</span>
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('applications.applicationType') }}</span
          ><span class="view-value">{{ typeOptions.find((o) => o.value === form.applicationType)?.label || t('common.dash') }}</span>
        </div>
        <div class="view-row">
          <span class="view-label">{{ t('applications.relatedAppeal') }}</span
          ><span class="view-value">{{ selectedAppeal?.displayName || t('fileApplication.noAppeal') }}</span>
        </div>
        <p class="fee-note"><i class="pi pi-info-circle"></i> {{ t('fileApplication.feeNote') }}</p>
        <Button
          type="submit"
          :label="t('fileApplication.submitApplication')"
          icon="pi pi-check"
          class="trab-btn w-full"
          :loading="saving"
        />
      </aside>
    </form>
  </div>
</template>

<style scoped>
.fee-note {
  font-size: 0.76rem;
  color: var(--trab-label);
  background: var(--trab-soft-bg);
  border-radius: 8px;
  padding: 0.65rem;
  margin: 1rem 0;
  line-height: 1.45;
}
</style>
