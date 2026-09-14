<script setup>
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import AuthDialogShell from './AuthDialogShell.vue';
import AuthService from '@/service/AuthService.js';
import { apiErrorMessage } from '@/utils/format.js';
import { isValidPhone, normalizePhone, isValidOtp, isValidTin } from '@/utils/validators.js';

const props = defineProps({ visible: { type: Boolean, default: false } });
const emit = defineEmits(['update:visible', 'registered', 'sign-in']);

const { t } = useI18n();

const step = ref(1); // 1 = TIN + admin details, 2 = verification code
const loading = ref(false);
const verifying = ref(false);
const error = ref('');
const tin = ref('');
const company = ref(null);
const adminName = ref('');
const adminPhone = ref('');
const companyId = ref('');
const otp = ref('');

watch(
  () => props.visible,
  (open) => {
    if (!open) return;
    step.value = 1;
    error.value = '';
    tin.value = '';
    company.value = null;
    adminName.value = '';
    adminPhone.value = '';
    otp.value = '';
  },
);

const verifyTin = async () => {
  error.value = '';
  if (!isValidTin(tin.value)) {
    error.value = t('validation.tin');
    return;
  }
  verifying.value = true;
  try {
    const res = await AuthService.lookupTin(tin.value.replace(/[\s-]/g, ''));
    if (!res.status || !res.data) {
      error.value = res.description || t('auth.tinNotFound');
      return;
    }
    const d = res.data;
    company.value = {
      name: d.CompanyName,
      business: d.BusinessType || '',
      vat: d.Vrn || '',
      address: [d.Region, d.District].filter(Boolean).join(', '),
    };
  } catch (err) {
    error.value = apiErrorMessage(err, t('auth.tinVerifyFailed'));
  } finally {
    verifying.value = false;
  }
};

const register = async () => {
  error.value = '';
  if (!adminName.value.trim() || !adminPhone.value.trim()) {
    error.value = t('auth.adminRequired');
    return;
  }
  if (!isValidPhone(adminPhone.value)) {
    error.value = t('validation.phone');
    return;
  }
  loading.value = true;
  try {
    const result = await AuthService.registerCompany({
      tinNumber: tin.value,
      adminName: adminName.value.trim(),
      adminPhone: normalizePhone(adminPhone.value),
    });
    companyId.value = result.companyId;
    step.value = 2;
  } catch (err) {
    error.value = apiErrorMessage(err, t('auth.registerFailed'));
  } finally {
    loading.value = false;
  }
};

const verifyCode = async () => {
  error.value = '';
  if (!isValidOtp(otp.value)) {
    error.value = t('validation.otp');
    return;
  }
  loading.value = true;
  try {
    await AuthService.verifyCompany({
      companyId: companyId.value,
      phone: normalizePhone(adminPhone.value),
      otp: otp.value,
      adminName: adminName.value.trim(),
    });
    emit('update:visible', false);
    emit('registered');
  } catch (err) {
    error.value = apiErrorMessage(err, t('auth.verifyFailed'));
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <AuthDialogShell
    :visible="visible"
    width="480px"
    :title="t('auth.registerTitle')"
    :subtitle="t('auth.registerSubtitle')"
    :error="error"
    @update:visible="emit('update:visible', $event)"
  >
    <div v-if="step === 1" class="auth-form">
      <form class="auth-field" novalidate @submit.prevent="verifyTin">
        <label for="reg-tin"><i class="pi pi-id-card"></i> {{ t('auth.companyTin') }}</label>
        <div class="flex gap-2">
          <InputText
            id="reg-tin"
            v-model="tin"
            placeholder="XXX-XXX-XXX"
            class="flex-1 auth-input min-w-0"
            inputmode="numeric"
            :disabled="!!company"
          />
          <Button v-if="!company" type="submit" :label="t('auth.verify')" icon="pi pi-search" :loading="verifying" class="auth-btn" />
          <Button v-else icon="pi pi-check-circle" severity="success" disabled :aria-label="t('appellants.tinVerifiedTitle')" />
        </div>
      </form>

      <dl v-if="company" class="company-preview">
        <div>
          <dt>{{ t('auth.company') }}</dt>
          <dd>
            <strong>{{ company.name }}</strong>
          </dd>
        </div>
        <div>
          <dt>{{ t('auth.business') }}</dt>
          <dd>{{ company.business || t('common.dash') }}</dd>
        </div>
        <div>
          <dt>{{ t('auth.vat') }}</dt>
          <dd>{{ company.vat || t('common.dash') }}</dd>
        </div>
        <div>
          <dt>{{ t('fields.address') }}</dt>
          <dd>{{ company.address || t('common.dash') }}</dd>
        </div>
      </dl>

      <form v-if="company" class="auth-form" novalidate @submit.prevent="register">
        <div class="auth-divider">
          <span>{{ t('auth.adminDetails') }}</span>
        </div>
        <div class="auth-field">
          <label for="reg-name"><i class="pi pi-user"></i> {{ t('auth.fullName') }}</label>
          <InputText
            id="reg-name"
            v-model="adminName"
            :placeholder="t('auth.fullNamePlaceholder')"
            class="w-full auth-input"
            autocomplete="name"
          />
        </div>
        <div class="auth-field">
          <label for="reg-phone"><i class="pi pi-mobile"></i> {{ t('auth.phoneLabel') }}</label>
          <InputText
            id="reg-phone"
            v-model="adminPhone"
            placeholder="0712345678"
            class="w-full auth-input"
            maxlength="16"
            inputmode="tel"
            autocomplete="tel"
          />
        </div>
        <Button
          type="submit"
          :label="t('auth.registerSendCode')"
          icon="pi pi-send"
          class="w-full auth-btn"
          :loading="loading"
          :disabled="!adminName || !adminPhone"
        />
      </form>

      <div class="auth-divider">
        <span>{{ t('auth.alreadyRegistered') }}</span>
      </div>
      <button type="button" class="auth-secondary" @click="emit('sign-in')">
        <i class="pi pi-sign-in"></i> {{ t('auth.signInInstead') }}
      </button>
    </div>

    <form v-else class="auth-form" novalidate @submit.prevent="verifyCode">
      <div class="otp-icon"><i class="pi pi-lock"></i></div>
      <p class="otp-info">
        {{ t('auth.enterCode') }}<br /><strong>{{ adminPhone }}</strong>
      </p>
      <InputText
        v-model="otp"
        placeholder="------"
        class="w-full otp-input"
        maxlength="6"
        inputmode="numeric"
        autocomplete="one-time-code"
        :aria-label="t('validation.otp')"
      />
      <Button type="submit" :label="t('auth.verifyComplete')" icon="pi pi-check" class="w-full auth-btn" :loading="loading" />
      <button type="button" class="auth-link" @click="step = 1"><i class="pi pi-arrow-left"></i> {{ t('common.back') }}</button>
    </form>
  </AuthDialogShell>
</template>

<style scoped>
.company-preview {
  background: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 10px;
  padding: 0.6rem 0.8rem;
  margin: 0;
}
.company-preview div {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.25rem 0;
  font-size: 0.8rem;
  border-bottom: 1px solid #d1fae5;
}
.company-preview div:last-child {
  border-bottom: none;
}
.company-preview dt {
  color: var(--trab-muted);
}
.company-preview dd {
  margin: 0;
  text-align: right;
}
</style>
