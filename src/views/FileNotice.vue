<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Stepper from 'primevue/stepper';
import StepList from 'primevue/steplist';
import StepPanels from 'primevue/steppanels';
import Step from 'primevue/step';
import StepPanel from 'primevue/steppanel';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import AutoComplete from 'primevue/autocomplete';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import DraftBanner from '@/components/DraftBanner.vue';
import { SelfServiceNotices, SelfServiceAppellants } from '@/service/SelfServiceApi.js';
import { RegionService } from '@/service/SettingsService.js';
import { useDraft } from '@/composables/useDraft.js';
import { apiErrorMessage } from '@/utils/format.js';
import { daysSince, isValidTin, formatTin, isValidPhone, normalizePhone, isValidEmail } from '@/utils/validators.js';

const { t } = useI18n();
const router = useRouter();
const toast = useToast();

const regions = ref([]);
const saving = ref(false);
const appellants = ref([]);
const filteredAppellants = ref([]);
const step = ref('1');

const today = () => new Date().toISOString().split('T')[0];
const emptyForm = () => ({
  appellantId: null,
  loggedAt: today(),
  dateOfTaxationDecision: '',
  dateOfServiceDecision: '',
  description: '',
  regionId: null,
  additionalRespondent: '',
});
const form = ref(emptyForm());
const selectedAppellant = ref(null);

const draft = useDraft('notice', { form, selectedAppellant });
const discardDraft = () => {
  draft.clear();
  form.value = emptyForm();
  selectedAppellant.value = null;
  step.value = '1';
};

const appealAgainstOptions = computed(() => [
  { value: 'Whole Decision', label: t('fileNotice.whole') },
  { value: 'Part of Decision', label: t('fileNotice.part') },
]);

const displayName = (a) => `${a.firstName} ${a.lastName || ''} ${a.tinNumber ? `(${a.tinNumber})` : ''}`.replace(/\s+/g, ' ').trim();

onMounted(async () => {
  try {
    const [r, a] = await Promise.all([RegionService.getAll(), SelfServiceAppellants.getAll()]);
    regions.value = r;
    appellants.value = a.map((ap) => ({ ...ap, displayName: displayName(ap) }));
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('fileNotice.lookupsFailed')), life: 5000 });
  }
});

const searchAppellant = (event) => {
  const q = (event.query || '').toLowerCase();
  filteredAppellants.value = appellants.value.filter((a) => a.displayName.toLowerCase().includes(q));
};

const onAppellantSelect = (event) => {
  selectedAppellant.value = event.value;
  form.value.appellantId = event.value.id;
};

// ─── Date rules (the backend rejects a notice more than 30 days after service) ───
const serviceDays = computed(() => daysSince(form.value.dateOfServiceDecision));
const dateErrors = computed(() => {
  const errors = {};
  if (serviceDays.value !== null && serviceDays.value < 0) errors.service = t('validation.serviceDateFuture');
  else if (serviceDays.value !== null && serviceDays.value > 30) errors.service = t('validation.noticeLate', { days: serviceDays.value });
  if (form.value.dateOfTaxationDecision && form.value.dateOfServiceDecision && form.value.dateOfTaxationDecision > form.value.dateOfServiceDecision) {
    errors.decision = t('validation.decisionAfterService');
  }
  return errors;
});
const taxationStepValid = computed(() =>
  !!form.value.dateOfTaxationDecision && !!form.value.dateOfServiceDecision && !Object.keys(dateErrors.value).length,
);

// ─── Quick register ───
const quickRegister = ref(false);
const emptyAppellant = () => ({ firstName: '', lastName: '', phone: '', email: '', tinNumber: '', vatNumber: '', natureOfBusiness: '', address: '' });
const newAppellant = ref(emptyAppellant());
const registerErrors = ref({});
const registering = ref(false);

const openQuickRegister = () => {
  newAppellant.value = emptyAppellant();
  registerErrors.value = {};
  quickRegister.value = true;
};

const registerAndSelect = async () => {
  const a = newAppellant.value;
  const errors = {};
  if (!a.firstName.trim()) errors.firstName = t('fileNotice.nameRequired');
  if (a.tinNumber.trim() && !isValidTin(a.tinNumber)) errors.tinNumber = t('validation.tin');
  if (a.phone.trim() && !isValidPhone(a.phone)) errors.phone = t('validation.phone');
  if (a.email.trim() && !isValidEmail(a.email)) errors.email = t('validation.email');
  registerErrors.value = errors;
  if (Object.keys(errors).length) return;

  registering.value = true;
  try {
    const created = await SelfServiceAppellants.create({
      ...a,
      tinNumber: a.tinNumber.trim() ? formatTin(a.tinNumber) : undefined,
      phone: a.phone.trim() ? normalizePhone(a.phone) : undefined,
      email: a.email.trim() || undefined,
    });
    const option = { ...created, displayName: displayName(created) };
    appellants.value.push(option);
    selectedAppellant.value = option;
    form.value.appellantId = created.id;
    quickRegister.value = false;
    toast.add({ severity: 'success', summary: t('common.success'), detail: t('fileNotice.registered'), life: 3000 });
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('common.actionFailed')), life: 5000 });
  } finally {
    registering.value = false;
  }
};

const submit = async () => {
  if (!form.value.appellantId || !taxationStepValid.value) {
    toast.add({ severity: 'warn', summary: t('common.validation'), detail: t('validation.required'), life: 3000 });
    return;
  }
  saving.value = true;
  try {
    await SelfServiceNotices.create({
      ...form.value,
      additionalRespondent: form.value.additionalRespondent.trim() || undefined,
      description: form.value.description || undefined,
      regionId: form.value.regionId || undefined,
    });
    draft.clear();
    toast.add({ severity: 'success', summary: t('common.success'), detail: t('fileNotice.filed'), life: 5000 });
    router.push('/notices');
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('fileNotice.failed')), life: 6000 });
  } finally {
    saving.value = false;
  }
};

const regionName = computed(() => regions.value.find((r) => r.id === form.value.regionId)?.name);
const appealAgainstLabel = computed(() => appealAgainstOptions.value.find((o) => o.value === form.value.description)?.label);
</script>

<template>
  <div>
    <div class="page-header">
      <h2>{{ t('fileNotice.title') }}</h2>
      <p>{{ t('fileNotice.subtitle') }}</p>
    </div>

    <DraftBanner :show="draft.restored.value" @discard="discardDraft" />

    <div class="ss-card">
      <Stepper v-model:value="step" linear>
        <StepList>
          <Step value="1">{{ t('fileNotice.stepAppellant') }}</Step>
          <Step value="2">{{ t('fileNotice.stepTaxation') }}</Step>
          <Step value="3">{{ t('fileNotice.stepReview') }}</Step>
        </StepList>
        <StepPanels>
          <StepPanel v-slot="{ activateCallback }" value="1">
            <div class="py-4">
              <p class="text-sm mb-3" style="color:#64748B">{{ t('fileNotice.selectFor') }}</p>
              <div class="flex items-end gap-3 mb-4 flex-wrap">
                <div class="flex-1 min-w-[14rem]">
                  <label class="field-label" for="n-appellant">{{ t('fileNotice.searchAppellant') }} *</label>
                  <AutoComplete
                    v-model="selectedAppellant" input-id="n-appellant" :suggestions="filteredAppellants" option-label="displayName"
                    :placeholder="t('fileNotice.typeToSearch')" class="w-full" input-class="w-full" dropdown
                    @complete="searchAppellant" @item-select="onAppellantSelect"
                  />
                </div>
                <Button :label="t('appellants.registerNew')" icon="pi pi-plus" outlined size="small" style="white-space:nowrap" @click="openQuickRegister" />
              </div>

              <div v-if="selectedAppellant?.id" class="selected-preview">
                <div class="flex items-center gap-2 mb-2">
                  <div class="preview-avatar"><i class="pi pi-building"></i></div>
                  <div>
                    <p class="font-semibold text-sm" style="color:#1E293B">{{ selectedAppellant.firstName }} {{ selectedAppellant.lastName || '' }}</p>
                    <p class="text-xs" style="color:#64748B">{{ t('fields.tin') }}: {{ selectedAppellant.tinNumber || t('common.dash') }} | {{ t('fields.phone') }}: {{ selectedAppellant.phone || t('common.dash') }}</p>
                  </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs" style="color:#64748B">
                  <div>{{ t('fields.email') }}: {{ selectedAppellant.email || t('common.dash') }}</div>
                  <div>{{ t('fields.business') }}: {{ selectedAppellant.natureOfBusiness || t('common.dash') }}</div>
                  <div class="sm:col-span-2">{{ t('fields.address') }}: {{ selectedAppellant.address || t('common.dash') }}</div>
                </div>
              </div>

              <div class="mb-3">
                <label class="field-label" for="n-region">{{ t('fields.region') }}</label>
                <Select v-model="form.regionId" input-id="n-region" :options="regions" option-label="name" option-value="id" :placeholder="t('fileNotice.selectRegion')" class="w-full" filter show-clear />
              </div>
            </div>
            <div class="flex justify-end pt-2">
              <Button :label="t('common.next')" icon="pi pi-arrow-right" icon-pos="right" class="trab-btn" :disabled="!form.appellantId" @click="activateCallback('2')" />
            </div>
          </StepPanel>

          <StepPanel v-slot="{ activateCallback }" value="2">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div>
                <label class="field-label" for="n-decision">{{ t('fileNotice.decisionDate') }} *</label>
                <InputText id="n-decision" v-model="form.dateOfTaxationDecision" type="date" class="w-full" :max="today()" :invalid="!!dateErrors.decision" />
                <small v-if="dateErrors.decision" class="field-error">{{ dateErrors.decision }}</small>
              </div>
              <div>
                <label class="field-label" for="n-service">{{ t('fileNotice.serviceDate') }} *</label>
                <InputText id="n-service" v-model="form.dateOfServiceDecision" type="date" class="w-full" :max="today()" :invalid="!!dateErrors.service" />
                <small v-if="dateErrors.service" class="field-error">{{ dateErrors.service }}</small>
              </div>
              <div>
                <label class="field-label" for="n-lodged">{{ t('fileNotice.lodgingDate') }}</label>
                <InputText id="n-lodged" v-model="form.loggedAt" type="date" class="w-full" />
              </div>
              <div>
                <label class="field-label" for="n-against">{{ t('fileNotice.appealAgainst') }}</label>
                <Select v-model="form.description" input-id="n-against" :options="appealAgainstOptions" option-label="label" option-value="value" :placeholder="t('fileNotice.select')" class="w-full" />
              </div>
              <div class="md:col-span-2">
                <label class="field-label" for="n-respondent">{{ t('fileNotice.additionalRespondent') }}</label>
                <InputText id="n-respondent" v-model="form.additionalRespondent" class="w-full" :placeholder="t('fileNotice.additionalRespondentHint')" maxlength="200" />
              </div>
            </div>
            <div class="flex justify-between pt-2">
              <Button :label="t('common.back')" icon="pi pi-arrow-left" text @click="activateCallback('1')" />
              <Button :label="t('common.review')" icon="pi pi-arrow-right" icon-pos="right" class="trab-btn" :disabled="!taxationStepValid" @click="activateCallback('3')" />
            </div>
          </StepPanel>

          <StepPanel v-slot="{ activateCallback }" value="3">
            <div class="py-4">
              <h3 class="font-semibold mb-3" style="color:#1E293B">{{ t('fileNotice.reviewTitle') }}</h3>
              <div class="review-grid">
                <div class="view-row"><span class="view-label">{{ t('fields.appellant') }}</span><span class="view-value">{{ selectedAppellant?.firstName }} {{ selectedAppellant?.lastName || '' }}</span></div>
                <div class="view-row"><span class="view-label">{{ t('fields.tin') }}</span><span class="view-value">{{ selectedAppellant?.tinNumber || t('common.dash') }}</span></div>
                <div class="view-row"><span class="view-label">{{ t('fields.phone') }}</span><span class="view-value">{{ selectedAppellant?.phone || t('common.dash') }}</span></div>
                <div class="view-row"><span class="view-label">{{ t('fields.region') }}</span><span class="view-value">{{ regionName || t('common.dash') }}</span></div>
                <div class="view-row"><span class="view-label">{{ t('fileNotice.decisionDate') }}</span><span class="view-value">{{ form.dateOfTaxationDecision }}</span></div>
                <div class="view-row"><span class="view-label">{{ t('fileNotice.serviceDate') }}</span><span class="view-value">{{ form.dateOfServiceDecision }}</span></div>
                <div class="view-row"><span class="view-label">{{ t('fileNotice.lodgingDate') }}</span><span class="view-value">{{ form.loggedAt }}</span></div>
                <div class="view-row"><span class="view-label">{{ t('fileNotice.appealAgainst') }}</span><span class="view-value">{{ appealAgainstLabel || t('common.dash') }}</span></div>
                <div class="view-row"><span class="view-label">{{ t('fileNotice.respondent') }}</span><span class="view-value">{{ t('fileNotice.defaultRespondent') }}{{ form.additionalRespondent ? `, ${form.additionalRespondent}` : '' }}</span></div>
              </div>
            </div>
            <div class="flex justify-between pt-2">
              <Button :label="t('common.back')" icon="pi pi-arrow-left" text @click="activateCallback('2')" />
              <Button :label="t('fileNotice.submitNotice')" icon="pi pi-check" class="trab-btn" :loading="saving" @click="submit" />
            </div>
          </StepPanel>
        </StepPanels>
      </Stepper>
    </div>

    <Dialog v-model:visible="quickRegister" :header="t('appellants.registerTitle')" modal :style="{ width: '520px' }" :breakpoints="{ '640px': '95vw' }">
      <form class="flex flex-col gap-3 mt-2" novalidate @submit.prevent="registerAndSelect">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="field-label" for="q-name">{{ t('fields.companyName') }} *</label>
            <InputText id="q-name" v-model="newAppellant.firstName" class="w-full" :invalid="!!registerErrors.firstName" />
            <small v-if="registerErrors.firstName" class="field-error">{{ registerErrors.firstName }}</small>
          </div>
          <div>
            <label class="field-label" for="q-last">{{ t('fields.lastName') }}</label>
            <InputText id="q-last" v-model="newAppellant.lastName" class="w-full" />
          </div>
          <div>
            <label class="field-label" for="q-tin">{{ t('fields.tinNumber') }}</label>
            <InputText id="q-tin" v-model="newAppellant.tinNumber" class="w-full" placeholder="XXX-XXX-XXX" inputmode="numeric" :invalid="!!registerErrors.tinNumber" />
            <small v-if="registerErrors.tinNumber" class="field-error">{{ registerErrors.tinNumber }}</small>
          </div>
          <div>
            <label class="field-label" for="q-phone">{{ t('fields.phone') }}</label>
            <InputText id="q-phone" v-model="newAppellant.phone" class="w-full" inputmode="tel" :invalid="!!registerErrors.phone" />
            <small v-if="registerErrors.phone" class="field-error">{{ registerErrors.phone }}</small>
          </div>
          <div>
            <label class="field-label" for="q-email">{{ t('fields.email') }}</label>
            <InputText id="q-email" v-model="newAppellant.email" type="email" class="w-full" :invalid="!!registerErrors.email" />
            <small v-if="registerErrors.email" class="field-error">{{ registerErrors.email }}</small>
          </div>
          <div>
            <label class="field-label" for="q-business">{{ t('fields.business') }}</label>
            <InputText id="q-business" v-model="newAppellant.natureOfBusiness" class="w-full" />
          </div>
        </div>
        <div>
          <label class="field-label" for="q-address">{{ t('fields.address') }}</label>
          <InputText id="q-address" v-model="newAppellant.address" class="w-full" />
        </div>
      </form>
      <template #footer>
        <Button :label="t('common.cancel')" text @click="quickRegister = false" />
        <Button :label="t('fileNotice.registerSelect')" class="trab-btn" :loading="registering" @click="registerAndSelect" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.field-label { display: block; font-size: 0.78rem; font-weight: 600; color: #475569; margin-bottom: 0.3rem; }
.field-error { display: block; color: #dc2626; font-size: 0.74rem; margin-top: 0.2rem; }
.selected-preview { background: #f8faf9; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem; margin-bottom: 1rem; }
.preview-avatar { width: 2.25rem; height: 2.25rem; border-radius: 8px; background: rgba(27,107,61,0.08); color: #1B6B3D; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; }
.review-grid { display: flex; flex-direction: column; }
.view-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.55rem 0; border-bottom: 1px solid #f8f9fa; font-size: 0.84rem; }
.view-row:last-child { border-bottom: none; }
.view-label { color: #64748B; }
.view-value { color: #1E293B; font-weight: 500; text-align: right; }
</style>
