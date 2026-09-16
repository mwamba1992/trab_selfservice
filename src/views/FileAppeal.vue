<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Stepper from 'primevue/stepper';
import StepList from 'primevue/steplist';
import StepPanels from 'primevue/steppanels';
import Step from 'primevue/step';
import StepPanel from 'primevue/steppanel';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import DraftBanner from '@/components/DraftBanner.vue';
import { SelfServiceAppeals, SelfServiceAppellants } from '@/service/SelfServiceApi.js';
import { TaxTypeService, CurrencyService } from '@/service/SettingsService.js';
import api from '@/service/Api.js';
import { useDraft } from '@/composables/useDraft.js';
import { apiErrorMessage, formatMoney } from '@/utils/format.js';
import { isValidPhone, normalizePhone } from '@/utils/validators.js';

const { t, locale } = useI18n();
const router = useRouter();
const route = useRoute();
const toast = useToast();

const saving = ref(false);
const step = ref('1');
const noticeNo = typeof route.query.noticeNo === 'string' ? route.query.noticeNo : '';

// Lookups
const appellants = ref([]);
const taxTypes = ref([]);
const currencies = ref([]);
const nonDefaultRespondents = ref([]);

const today = () => new Date().toISOString().split('T')[0];
const emptyForm = () => ({
  noticeNo,
  dateOfFiling: today(),
  taxTypeId: null,
  natureOfAppeal: '',
  assessmentNo: '',
  bankNo: '',
  billEntryNo: '',
  taxedOffice: '',
});
const form = ref(emptyForm());
const appellantList = ref([]);
const additionalRespondents = ref([]);
const amounts = ref([]);
const witnesses = ref([]);

// One draft per notice so a draft for one notice never leaks into another
const draft = useDraft(`appeal:${noticeNo || 'none'}`, { form, appellantList, additionalRespondents, amounts, witnesses });
const discardDraft = () => {
  draft.clear();
  form.value = emptyForm();
  appellantList.value = [];
  additionalRespondents.value = [];
  amounts.value = [];
  witnesses.value = [];
  step.value = '1';
};

const selectedAppellantToAdd = ref(null);
const selectedRespondent = ref(null);
const newAmount = ref({ amount: null, currency: 'TZS' });
const newWitness = ref({ name: '', phone: '' });
const witnessError = ref('');

const currencyOptions = computed(() => (currencies.value.length ? currencies.value.map((c) => c.code || c.name) : ['TZS', 'USD']));
const fullName = (a) => `${a.firstName} ${a.lastName || ''}`.trim();

onMounted(async () => {
  try {
    const [a, tt, cur, resp] = await Promise.all([
      SelfServiceAppellants.getAll(),
      TaxTypeService.getAll(),
      CurrencyService.getAll(),
      api.get('/self-service/respondents').then((r) => r.data.data || []),
    ]);
    appellants.value = a.map((ap) => ({ ...ap, displayName: `${fullName(ap)}${ap.tinNumber ? ` (${ap.tinNumber})` : ''}` }));
    taxTypes.value = tt;
    currencies.value = cur;
    nonDefaultRespondents.value = resp.filter((r) => !r.isDefault);
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('fileAppeal.lookupsFailed')), life: 5000 });
  }
});

const addAppellantToList = () => {
  const picked = selectedAppellantToAdd.value;
  if (!picked || appellantList.value.some((a) => a.id === picked.id)) return;
  appellantList.value.push(picked);
  selectedAppellantToAdd.value = null;
};
const removeAppellantFromList = (ap) => {
  appellantList.value = appellantList.value.filter((a) => a.id !== ap.id);
};

const addRespondent = () => {
  const picked = selectedRespondent.value;
  if (!picked || picked.isDefault || additionalRespondents.value.some((r) => r.id === picked.id)) return;
  additionalRespondents.value.push(picked);
  selectedRespondent.value = null;
};
const removeRespondent = (r) => {
  additionalRespondents.value = additionalRespondents.value.filter((x) => x.id !== r.id);
};

const addAmount = () => {
  if (!newAmount.value.amount || newAmount.value.amount <= 0) return;
  amounts.value.push({ ...newAmount.value });
  newAmount.value = { amount: null, currency: newAmount.value.currency };
};
const removeAmount = (i) => amounts.value.splice(i, 1);

const addWitness = () => {
  witnessError.value = '';
  if (!newWitness.value.name.trim()) {
    witnessError.value = t('common.required');
    return;
  }
  if (newWitness.value.phone.trim() && !isValidPhone(newWitness.value.phone)) {
    witnessError.value = t('validation.phone');
    return;
  }
  witnesses.value.push({
    name: newWitness.value.name.trim(),
    phone: newWitness.value.phone.trim() ? normalizePhone(newWitness.value.phone) : '',
  });
  newWitness.value = { name: '', phone: '' };
};
const removeWitness = (i) => witnesses.value.splice(i, 1);

const submit = async () => {
  if (!appellantList.value.length || !form.value.taxTypeId) {
    toast.add({ severity: 'warn', summary: t('common.validation'), detail: t('fileAppeal.required'), life: 3000 });
    return;
  }
  saving.value = true;
  try {
    const appeal = await SelfServiceAppeals.create({
      ...form.value,
      noticeNo: form.value.noticeNo || undefined,
      // First appellant is the primary appellant, the rest are co-appellants
      appellantId: appellantList.value[0].id,
      appellantIds: appellantList.value.slice(1).map((a) => a.id),
      respondentIds: additionalRespondents.value.map((r) => r.id),
      amounts: amounts.value,
      witnesses: witnesses.value,
    });
    draft.clear();
    toast.add({ severity: 'success', summary: t('common.success'), detail: t('fileAppeal.filed'), life: 5000 });
    // Straight to the annexure window: they can attach until the registry checks it.
    router.push({ path: '/appeals', query: appeal?.id ? { attach: appeal.id } : {} });
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('fileAppeal.failed')), life: 6000 });
  } finally {
    saving.value = false;
  }
};

const taxTypeName = computed(() => taxTypes.value.find((tt) => tt.id === form.value.taxTypeId)?.name);
</script>

<template>
  <div>
    <div class="page-header">
      <h2>{{ t('fileAppeal.title') }}</h2>
      <p>{{ t('fileAppeal.subtitle') }}</p>
    </div>

    <DraftBanner :show="draft.restored.value" @discard="discardDraft" />

    <div class="ss-card">
      <Stepper v-model:value="step" linear>
        <StepList>
          <Step value="1">{{ t('fileAppeal.stepParties') }}</Step>
          <Step value="2">{{ t('fileAppeal.stepDispute') }}</Step>
          <Step value="3">{{ t('fileAppeal.stepAmounts') }}</Step>
          <Step value="4">{{ t('fileAppeal.stepReview') }}</Step>
        </StepList>
        <StepPanels>
          <StepPanel v-slot="{ activateCallback }" value="1">
            <div class="py-4">
              <div v-if="form.noticeNo" class="mb-4">
                <label class="field-label" for="a-notice">{{ t('fileAppeal.noticeNumber') }}</label>
                <InputText id="a-notice" v-model="form.noticeNo" class="w-full verified-field" disabled />
              </div>

              <div class="mb-4">
                <label class="section-label"><i class="pi pi-users"></i> {{ t('fileAppeal.appellantList') }} *</label>
                <p class="help-text">{{ t('fileAppeal.appellantHelp') }}</p>
                <div class="flex gap-2 mb-2">
                  <Select
                    v-model="selectedAppellantToAdd"
                    :options="appellants"
                    option-label="displayName"
                    :placeholder="t('fileAppeal.selectAppellant')"
                    class="flex-1 min-w-0"
                    filter
                  />
                  <Button
                    :label="t('common.add')"
                    icon="pi pi-plus"
                    class="trab-btn"
                    :disabled="!selectedAppellantToAdd"
                    @click="addAppellantToList"
                  />
                </div>
                <div v-for="(a, i) in appellantList" :key="a.id" class="party-row">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="party-num">{{ i + 1 }}</span>
                    <div class="min-w-0">
                      <span class="party-name">{{ fullName(a) }}</span>
                      <span class="party-detail"
                        >{{ t('fields.tin') }}: {{ a.tinNumber || t('common.dash') }} | {{ a.phone || t('common.dash') }}</span
                      >
                    </div>
                  </div>
                  <Button
                    icon="pi pi-trash"
                    text
                    rounded
                    size="small"
                    severity="danger"
                    :aria-label="t('common.cancel')"
                    @click="removeAppellantFromList(a)"
                  />
                </div>
                <div v-if="!appellantList.length" class="empty-list">{{ t('fileAppeal.noAppellants') }}</div>
              </div>

              <div class="mb-4">
                <label class="section-label"><i class="pi pi-building"></i> {{ t('fileAppeal.respondentList') }}</label>
                <p class="help-text">{{ t('fileAppeal.respondentHelp') }}</p>
                <div class="party-row default-row">
                  <div class="flex items-center gap-2">
                    <span class="party-num">1</span>
                    <span class="party-name">{{ t('fileAppeal.defaultRespondent') }}</span>
                  </div>
                  <Tag :value="t('status.DEFAULT')" severity="success" />
                </div>
                <div v-if="nonDefaultRespondents.length" class="flex gap-2 mt-2 mb-2">
                  <Select
                    v-model="selectedRespondent"
                    :options="nonDefaultRespondents"
                    option-label="name"
                    :placeholder="t('fileAppeal.selectRespondent')"
                    class="flex-1 min-w-0"
                    filter
                  />
                  <Button
                    :label="t('common.add')"
                    icon="pi pi-plus"
                    class="trab-btn"
                    :disabled="!selectedRespondent"
                    @click="addRespondent"
                  />
                </div>
                <div v-for="(r, i) in additionalRespondents" :key="r.id" class="party-row">
                  <div class="flex items-center gap-2">
                    <span class="party-num">{{ i + 2 }}</span>
                    <span class="party-name">{{ r.name }}</span>
                  </div>
                  <Button
                    icon="pi pi-trash"
                    text
                    rounded
                    size="small"
                    severity="danger"
                    :aria-label="t('common.cancel')"
                    @click="removeRespondent(r)"
                  />
                </div>
              </div>
            </div>
            <div class="flex justify-end pt-2">
              <Button
                :label="t('common.next')"
                icon="pi pi-arrow-right"
                icon-pos="right"
                class="trab-btn"
                :disabled="!appellantList.length"
                @click="activateCallback('2')"
              />
            </div>
          </StepPanel>

          <StepPanel v-slot="{ activateCallback }" value="2">
            <p class="help-text py-2">{{ t('fileAppeal.disputeHelp') }}</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div>
                <label class="field-label" for="a-tax">{{ t('fileAppeal.taxCategory') }} *</label>
                <Select
                  v-model="form.taxTypeId"
                  input-id="a-tax"
                  :options="taxTypes"
                  option-label="name"
                  option-value="id"
                  :placeholder="t('fileNotice.select')"
                  class="w-full"
                  filter
                />
              </div>
              <div>
                <label class="field-label" for="a-nature">{{ t('fileAppeal.natureOfAppeal') }}</label
                ><InputText id="a-nature" v-model="form.natureOfAppeal" class="w-full" />
              </div>
              <div>
                <label class="field-label" for="a-assessment">{{ t('fileAppeal.assessmentNo') }}</label
                ><InputText id="a-assessment" v-model="form.assessmentNo" class="w-full" />
              </div>
              <div>
                <label class="field-label" for="a-bank">{{ t('fileAppeal.bankNo') }}</label
                ><InputText id="a-bank" v-model="form.bankNo" class="w-full" />
              </div>
              <div>
                <label class="field-label" for="a-entry">{{ t('fileAppeal.billEntryNo') }}</label
                ><InputText id="a-entry" v-model="form.billEntryNo" class="w-full" />
              </div>
              <div>
                <label class="field-label" for="a-office">{{ t('fileAppeal.taxedOffice') }}</label
                ><InputText id="a-office" v-model="form.taxedOffice" class="w-full" />
              </div>
            </div>
            <div class="flex justify-between pt-2">
              <Button :label="t('common.back')" icon="pi pi-arrow-left" text @click="activateCallback('1')" />
              <Button
                :label="t('common.next')"
                icon="pi pi-arrow-right"
                icon-pos="right"
                class="trab-btn"
                :disabled="!form.taxTypeId"
                @click="activateCallback('3')"
              />
            </div>
          </StepPanel>

          <StepPanel v-slot="{ activateCallback }" value="3">
            <div class="py-4">
              <h4 class="text-sm font-semibold mb-1 text-label">{{ t('fileAppeal.amountsTitle') }}</h4>
              <p class="help-text mb-3">{{ t('fileAppeal.amountsHelp') }}</p>
              <div class="flex gap-2 mb-3 flex-wrap">
                <Select v-model="newAmount.currency" :options="currencyOptions" class="w-28" :aria-label="t('fields.amount')" />
                <InputNumber
                  v-model="newAmount.amount"
                  :placeholder="t('fields.amount')"
                  class="flex-1 min-w-[10rem]"
                  :min-fraction-digits="2"
                  :min="0"
                />
                <Button :label="t('common.add')" icon="pi pi-plus" size="small" outlined :disabled="!newAmount.amount" @click="addAmount" />
              </div>
              <div v-for="(a, i) in amounts" :key="`amount-${i}`" class="party-row">
                <span>{{ a.currency }} {{ formatMoney(a.amount, locale) }}</span>
                <Button
                  icon="pi pi-times"
                  text
                  rounded
                  size="small"
                  severity="danger"
                  :aria-label="t('common.cancel')"
                  @click="removeAmount(i)"
                />
              </div>

              <h4 class="text-sm font-semibold mt-4 mb-1 text-label">{{ t('fileAppeal.witnesses') }}</h4>
              <p class="help-text mb-3">{{ t('fileAppeal.witnessesHelp') }}</p>
              <form class="flex gap-2 mb-1 flex-wrap" novalidate @submit.prevent="addWitness">
                <InputText
                  v-model="newWitness.name"
                  :placeholder="t('fileAppeal.witnessName')"
                  class="flex-1 min-w-[10rem]"
                  :aria-label="t('fileAppeal.witnessName')"
                />
                <InputText
                  v-model="newWitness.phone"
                  :placeholder="t('fields.phone')"
                  class="w-40"
                  inputmode="tel"
                  :aria-label="t('fields.phone')"
                />
                <Button type="submit" :label="t('common.add')" icon="pi pi-plus" size="small" outlined />
              </form>
              <small v-if="witnessError" class="field-error mb-2">{{ witnessError }}</small>
              <div v-for="(w, i) in witnesses" :key="`witness-${i}`" class="party-row">
                <span
                  >{{ w.name }} <small class="text-muted">{{ w.phone }}</small></span
                >
                <Button
                  icon="pi pi-times"
                  text
                  rounded
                  size="small"
                  severity="danger"
                  :aria-label="t('common.cancel')"
                  @click="removeWitness(i)"
                />
              </div>
            </div>
            <div class="flex justify-between pt-2">
              <Button :label="t('common.back')" icon="pi pi-arrow-left" text @click="activateCallback('2')" />
              <Button
                :label="t('common.review')"
                icon="pi pi-arrow-right"
                icon-pos="right"
                class="trab-btn"
                @click="activateCallback('4')"
              />
            </div>
          </StepPanel>

          <StepPanel v-slot="{ activateCallback }" value="4">
            <div class="py-4">
              <h3 class="font-semibold mb-3 text-heading">{{ t('fileAppeal.reviewTitle') }}</h3>
              <div class="view-grid">
                <div class="view-row">
                  <span class="view-label">{{ t('fields.noticeNo') }}</span
                  ><span class="view-value">{{ form.noticeNo || t('common.dash') }}</span>
                </div>
                <div class="view-row">
                  <span class="view-label">{{ t('fields.appellants') }}</span
                  ><span class="view-value">{{ appellantList.map(fullName).join(', ') }}</span>
                </div>
                <div class="view-row">
                  <span class="view-label">{{ t('fields.respondents') }}</span
                  ><span class="view-value">{{
                    [t('fileAppeal.defaultRespondent'), ...additionalRespondents.map((r) => r.name)].join(', ')
                  }}</span>
                </div>
                <div class="view-row">
                  <span class="view-label">{{ t('fileAppeal.taxCategory') }}</span
                  ><span class="view-value">{{ taxTypeName || t('common.dash') }}</span>
                </div>
                <div class="view-row">
                  <span class="view-label">{{ t('fileAppeal.natureOfAppeal') }}</span
                  ><span class="view-value">{{ form.natureOfAppeal || t('common.dash') }}</span>
                </div>
                <div v-if="amounts.length" class="view-row">
                  <span class="view-label">{{ t('fileAppeal.amounts') }}</span
                  ><span class="view-value">{{ amounts.map((a) => `${a.currency} ${formatMoney(a.amount, locale)}`).join(', ') }}</span>
                </div>
                <div v-if="witnesses.length" class="view-row">
                  <span class="view-label">{{ t('fileAppeal.witnesses') }}</span
                  ><span class="view-value">{{ witnesses.map((w) => w.name).join(', ') }}</span>
                </div>
              </div>
            </div>
            <div class="flex justify-between pt-2">
              <Button :label="t('common.back')" icon="pi pi-arrow-left" text @click="activateCallback('3')" />
              <Button :label="t('fileAppeal.submitStatement')" icon="pi pi-check" class="trab-btn" :loading="saving" @click="submit" />
            </div>
          </StepPanel>
        </StepPanels>
      </Stepper>
    </div>
  </div>
</template>

<style scoped>
.section-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.3rem;
}
.section-label i {
  margin-right: 0.4rem;
  color: #1b6b3d;
}
.help-text {
  font-size: 0.76rem;
  color: #94a3b8;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}
.party-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  font-size: 0.82rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 0.4rem;
  background: #fff;
}
.default-row {
  background: #f0fdf4;
  border-color: #86efac;
}
.party-num {
  width: 24px;
  height: 24px;
  background: #1b6b3d;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
}
.party-name {
  font-weight: 600;
  color: #1e293b;
  display: block;
  font-size: 0.82rem;
}
.party-detail {
  color: #64748b;
  font-size: 0.72rem;
  display: block;
}
.empty-list {
  text-align: center;
  padding: 1rem;
  color: #94a3b8;
  font-size: 0.8rem;
  border: 1px dashed #e2e8f0;
  border-radius: 8px;
}
</style>
