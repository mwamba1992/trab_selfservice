<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import { SelfServiceAppellants } from '@/service/SelfServiceApi.js';
import { apiErrorMessage } from '@/utils/format.js';
import { isValidTin, formatTin, isValidPhone, normalizePhone, isValidEmail } from '@/utils/validators.js';

const { t } = useI18n();
const toast = useToast();
const confirm = useConfirm();

const appellants = ref([]);
const loading = ref(false);
const failed = ref(false);
const filterText = ref('');

// Search by TIN

// Register new
const registerVisible = ref(false);
const emptyForm = () => ({
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  tinNumber: '',
  vatNumber: '',
  natureOfBusiness: '',
  address: '',
});
const newForm = ref(emptyForm());
const formErrors = ref({});
const saving = ref(false);

const fullName = (a) => `${a.firstName || ''} ${a.lastName || ''}`.trim();

const loadData = async () => {
  loading.value = true;
  failed.value = false;
  try {
    appellants.value = await SelfServiceAppellants.getAll();
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);

const filtered = computed(() => {
  const q = filterText.value.trim().toLowerCase();
  if (!q) return appellants.value;
  return appellants.value.filter((a) => fullName(a).toLowerCase().includes(q) || (a.tinNumber || '').toLowerCase().includes(q));
});

const unlinkAppellant = (appellant) => {
  confirm.require({
    header: t('confirm.title'),
    message: t('appellants.confirmRemove', { name: fullName(appellant) }),
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: t('appellants.removeFromClients'), severity: 'danger' },
    rejectProps: { label: t('common.cancel'), outlined: true },
    accept: async () => {
      try {
        await SelfServiceAppellants.unlink(appellant.id);
        toast.add({ severity: 'success', summary: t('common.success'), detail: t('appellants.removed'), life: 3000 });
        await loadData();
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: t('common.error'),
          detail: apiErrorMessage(err, t('appellants.removeFailed')),
          life: 4000,
        });
      }
    },
  });
};

// TIN verification against TRA
const tinVerified = ref(false);
const tinVerifying = ref(false);
const tinMessage = ref('');

const verifyTin = async () => {
  if (!isValidTin(newForm.value.tinNumber)) {
    formErrors.value = { ...formErrors.value, tinNumber: t('validation.tin') };
    return;
  }
  tinVerifying.value = true;
  tinMessage.value = '';
  try {
    const res = await SelfServiceAppellants.lookupTin(newForm.value.tinNumber.replace(/[\s-]/g, ''));
    if (!res.status || !res.data) {
      tinMessage.value = res.description || t('auth.tinNotFound');
      toast.add({ severity: 'error', summary: t('appellants.verifyFailedTitle'), detail: tinMessage.value, life: 4000 });
      return;
    }
    const d = res.data;
    newForm.value = {
      ...newForm.value,
      tinNumber: formatTin(newForm.value.tinNumber),
      firstName: d.CompanyName,
      phone: d.Mobile || '',
      email: d.Email || '',
      vatNumber: d.Vrn || '',
      natureOfBusiness: d.BusinessType || '',
      address: [d.Region, d.District].filter(Boolean).join(', ') + (d.PostalAddress ? `, P.O. Box ${d.PostalAddress}` : ''),
    };
    tinVerified.value = true;
    tinMessage.value = d.CompanyName;
    formErrors.value = {};
    toast.add({ severity: 'success', summary: t('appellants.tinVerifiedTitle'), detail: d.CompanyName, life: 4000 });
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('auth.tinVerifyFailed')), life: 4000 });
  } finally {
    tinVerifying.value = false;
  }
};

const resetTin = () => {
  tinVerified.value = false;
  tinMessage.value = '';
};

const openRegister = () => {
  newForm.value = emptyForm();
  formErrors.value = {};
  resetTin();
  registerVisible.value = true;
};

const saveNew = async () => {
  const f = newForm.value;
  const errors = {};
  if (!f.firstName.trim()) errors.firstName = t('common.required');
  if (!isValidTin(f.tinNumber)) errors.tinNumber = t('validation.tin');
  // TRA data can carry international formats — only validate what the user typed
  if (!tinVerified.value && f.phone.trim() && !isValidPhone(f.phone)) errors.phone = t('validation.phone');
  if (!tinVerified.value && f.email.trim() && !isValidEmail(f.email)) errors.email = t('validation.email');
  formErrors.value = errors;
  if (Object.keys(errors).length) return;

  saving.value = true;
  try {
    await SelfServiceAppellants.create({
      ...f,
      tinNumber: formatTin(f.tinNumber),
      phone: f.phone.trim() ? normalizePhone(f.phone) : undefined,
      email: f.email.trim() || undefined,
    });
    toast.add({ severity: 'success', summary: t('common.success'), detail: t('appellants.registered'), life: 3000 });
    registerVisible.value = false;
    await loadData();
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('common.actionFailed')), life: 5000 });
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div>
    <div class="page-header">
      <h2>{{ t('appellants.title') }}</h2>
      <p>{{ t('appellants.subtitle') }}</p>
    </div>

    <div class="ss-card mb-3">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <p class="text-sm text-muted m-0">{{ t('appellants.registerIntro') }}</p>
        <Button type="button" :label="t('appellants.registerNew')" icon="pi pi-plus" class="trab-btn" size="small" @click="openRegister" />
      </div>
    </div>

    <div class="stat-bar">
      <div class="stat-item">
        <div class="stat-dot" style="background: #1b6b3d"></div>
        {{ t('appellants.myClients') }}: <strong>{{ appellants.length }}</strong>
      </div>
    </div>

    <div class="ss-card mb-3">
      <InputText
        v-model="filterText"
        :placeholder="t('appellants.filterPlaceholder')"
        :aria-label="t('common.search')"
        class="search-input"
      />
    </div>

    <div class="ss-card">
      <div v-if="failed" class="state-box" role="alert">
        <p>{{ t('appellants.loadFailed') }}</p>
        <Button :label="t('common.retry')" size="small" outlined @click="loadData" />
      </div>
      <DataTable v-else :value="filtered" :loading="loading" paginator :rows="10" :rows-per-page-options="[10, 25, 50]" data-key="id">
        <Column :header="t('common.sn')" class="w-14"
          ><template #body="{ index }">{{ index + 1 }}</template></Column
        >
        <Column :header="t('fields.name')" sortable sort-field="firstName"
          ><template #body="{ data }">{{ fullName(data) }}</template></Column
        >
        <Column field="tinNumber" :header="t('fields.tin')" sortable />
        <Column field="phone" :header="t('fields.phone')" />
        <Column field="email" :header="t('fields.email')" />
        <Column field="natureOfBusiness" :header="t('fields.business')" />
        <Column :header="t('common.actions')" class="w-16">
          <template #body="{ data }">
            <Button
              v-tooltip.top="t('appellants.removeFromClients')"
              icon="pi pi-user-minus"
              text
              rounded
              size="small"
              severity="danger"
              :aria-label="t('appellants.removeFromClients')"
              @click="unlinkAppellant(data)"
            />
          </template>
        </Column>
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-users"></i>
            <p>{{ t('appellants.empty') }}</p>
          </div>
        </template>
      </DataTable>
    </div>

    <Dialog
      v-model:visible="registerVisible"
      :header="t('appellants.registerTitle')"
      modal
      :style="{ width: '540px' }"
      :breakpoints="{ '640px': '95vw' }"
    >
      <form class="flex flex-col gap-3 mt-2" novalidate @submit.prevent="saveNew">
        <div>
          <label class="field-label" for="a-tin">{{ t('fields.tinNumber') }} *</label>
          <div class="flex gap-2">
            <InputText
              id="a-tin"
              v-model="newForm.tinNumber"
              class="flex-1"
              placeholder="XXX-XXX-XXX"
              inputmode="numeric"
              :disabled="tinVerified"
              :invalid="!!formErrors.tinNumber"
              @input="resetTin"
            />
            <Button
              v-if="!tinVerified"
              type="button"
              :label="t('auth.verify')"
              icon="pi pi-search"
              class="trab-btn"
              size="small"
              :loading="tinVerifying"
              @click="verifyTin"
            />
            <Button
              v-else
              type="button"
              :label="t('appellants.change')"
              icon="pi pi-refresh"
              severity="secondary"
              outlined
              size="small"
              @click="
                resetTin();
                newForm.tinNumber = '';
              "
            />
          </div>
          <small v-if="formErrors.tinNumber" class="field-error">{{ formErrors.tinNumber }}</small>
          <small v-else-if="tinMessage && !tinVerified" class="text-orange-600">{{ tinMessage }}</small>
          <small v-if="tinVerified" class="field-hint text-success"
            ><i class="pi pi-check-circle"></i> {{ t('appellants.verified', { name: tinMessage }) }}</small
          >
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="field-label" for="a-name">{{ t('fields.companyName') }} *</label>
            <InputText
              id="a-name"
              v-model="newForm.firstName"
              class="w-full"
              :disabled="tinVerified"
              :class="{ 'verified-field': tinVerified }"
              :invalid="!!formErrors.firstName"
            />
            <small v-if="formErrors.firstName" class="field-error">{{ formErrors.firstName }}</small>
          </div>
          <div>
            <label class="field-label" for="a-vat">{{ t('fields.vat') }}</label>
            <InputText
              id="a-vat"
              v-model="newForm.vatNumber"
              class="w-full"
              :disabled="tinVerified"
              :class="{ 'verified-field': tinVerified }"
            />
          </div>
          <div>
            <label class="field-label" for="a-phone">{{ t('fields.phone') }}</label>
            <InputText
              id="a-phone"
              v-model="newForm.phone"
              class="w-full"
              inputmode="tel"
              :disabled="tinVerified"
              :class="{ 'verified-field': tinVerified }"
              :invalid="!!formErrors.phone"
            />
            <small v-if="formErrors.phone" class="field-error">{{ formErrors.phone }}</small>
          </div>
          <div>
            <label class="field-label" for="a-email">{{ t('fields.email') }}</label>
            <InputText
              id="a-email"
              v-model="newForm.email"
              type="email"
              class="w-full"
              :disabled="tinVerified"
              :class="{ 'verified-field': tinVerified }"
              :invalid="!!formErrors.email"
            />
            <small v-if="formErrors.email" class="field-error">{{ formErrors.email }}</small>
          </div>
        </div>
        <div>
          <label class="field-label" for="a-business">{{ t('fields.business') }}</label>
          <InputText
            id="a-business"
            v-model="newForm.natureOfBusiness"
            class="w-full"
            :disabled="tinVerified"
            :class="{ 'verified-field': tinVerified }"
          />
        </div>
        <div>
          <label class="field-label" for="a-address">{{ t('fields.address') }}</label>
          <InputText
            id="a-address"
            v-model="newForm.address"
            class="w-full"
            :disabled="tinVerified"
            :class="{ 'verified-field': tinVerified }"
          />
        </div>
      </form>
      <template #footer>
        <Button :label="t('common.cancel')" text @click="registerVisible = false" />
        <Button :label="t('appellants.registerAdd')" class="trab-btn" :loading="saving" @click="saveNew" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.search-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.65rem 0.75rem;
  background: #f8faf9;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  margin-bottom: 0.5rem;
}
</style>
