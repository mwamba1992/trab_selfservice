<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePrimeVue } from 'primevue/config';
import { useToast } from 'primevue/usetoast';
import { setLocale } from '@/i18n/index.js';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import AuthDialogShell from './AuthDialogShell.vue';
import AuthService from '@/service/AuthService.js';
import { apiErrorMessage } from '@/utils/format.js';
import { isValidPhone, normalizePhone, isValidOtp } from '@/utils/validators.js';

const props = defineProps({ visible: { type: Boolean, default: false } });
const emit = defineEmits(['update:visible', 'signed-in', 'register']);

const { t } = useI18n();
const primevue = usePrimeVue();
const toast = useToast();

const step = ref('phone');
const phone = ref('');
const otp = ref('');
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

const isPasswordStep = computed(() => step.value === 'password');

watch(
  () => props.visible,
  (open) => {
    if (open) {
      step.value = 'phone';
      otp.value = '';
      password.value = '';
      error.value = '';
    }
  },
);

const requestOtp = async () => {
  error.value = '';
  if (!isValidPhone(phone.value)) {
    error.value = t('validation.phone');
    return;
  }
  loading.value = true;
  try {
    await AuthService.requestOtp(normalizePhone(phone.value));
    step.value = 'otp';
    toast.add({ severity: 'success', summary: t('auth.codeSentTitle'), detail: t('auth.codeSent'), life: 4000 });
  } catch (err) {
    error.value = apiErrorMessage(err, t('auth.sendFailed'));
  } finally {
    loading.value = false;
  }
};

const verifyOtp = async () => {
  error.value = '';
  if (!isValidOtp(otp.value)) {
    error.value = t('validation.otp');
    return;
  }
  loading.value = true;
  try {
    await AuthService.verifyOtp(normalizePhone(phone.value), otp.value);
    emit('update:visible', false);
    emit('signed-in');
  } catch (err) {
    error.value = apiErrorMessage(err, t('auth.verifyFailed'));
  } finally {
    loading.value = false;
  }
};

const changeNumber = () => {
  step.value = 'phone';
  otp.value = '';
  error.value = '';
};

// One card, one portal: an enrolled account signs in with its password here,
// whichever desk it belongs to.
const openPassword = () => {
  step.value = 'password';
  error.value = '';
  password.value = '';
};

const signInWithPassword = async () => {
  error.value = '';
  if (!email.value.trim() || !password.value) {
    error.value = t('validation.required');
    return;
  }
  loading.value = true;
  try {
    await AuthService.login(email.value.trim(), password.value);
    // The TRA desk is English by policy.
    if (AuthService.isTra()) setLocale('en', primevue);
    password.value = '';
    emit('update:visible', false);
    emit('signed-in');
  } catch (err) {
    error.value = apiErrorMessage(err, t('auth.passwordFailed'));
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <AuthDialogShell
    :visible="visible"
    :title="isPasswordStep ? t('auth.passwordTitle') : t('auth.welcomeBack')"
    :subtitle="isPasswordStep ? t('auth.passwordSubtitle') : t('auth.signInSubtitle')"
    :error="error"
    @update:visible="emit('update:visible', $event)"
  >
    <form v-if="isPasswordStep" class="auth-form" novalidate @submit.prevent="signInWithPassword">
      <div class="auth-field">
        <label for="tra-email"><i class="pi pi-envelope"></i> {{ t('fields.email') }}</label>
        <InputText
          id="tra-email"
          v-model="email"
          type="email"
          placeholder="officer@tra.go.tz"
          class="w-full auth-input"
          autocomplete="username"
        />
        <small>{{ t('auth.passwordHint') }}</small>
      </div>
      <div class="auth-field">
        <label for="tra-password"><i class="pi pi-lock"></i> {{ t('auth.passwordLabel') }}</label>
        <Password
          id="tra-password"
          v-model="password"
          :feedback="false"
          toggle-mask
          input-class="w-full auth-input"
          class="w-full"
          autocomplete="current-password"
        />
      </div>
      <Button type="submit" :label="t('auth.signIn')" :loading="loading" class="w-full auth-btn" icon="pi pi-sign-in" />
      <button type="button" class="auth-link" @click="changeNumber"><i class="pi pi-arrow-left"></i> {{ t('auth.backToOtp') }}</button>
    </form>

    <form v-else-if="step === 'phone'" class="auth-form" novalidate @submit.prevent="requestOtp">
      <div class="auth-field">
        <label for="login-phone"><i class="pi pi-mobile"></i> {{ t('auth.phoneLabel') }}</label>
        <InputText
          id="login-phone"
          v-model="phone"
          placeholder="0712 345 678"
          class="w-full auth-input"
          maxlength="16"
          inputmode="tel"
          autocomplete="tel"
        />
        <small>{{ t('auth.phoneHint') }}</small>
      </div>
      <Button type="submit" :label="t('auth.sendCode')" :loading="loading" class="w-full auth-btn" icon="pi pi-send" />
      <div class="auth-divider">
        <span>{{ t('auth.newToTrab') }}</span>
      </div>
      <button type="button" class="auth-secondary" @click="emit('register')">
        <i class="pi pi-building"></i> {{ t('auth.registerYourCompany') }}
      </button>
      <button type="button" class="auth-link" @click="openPassword"><i class="pi pi-id-card"></i> {{ t('auth.passwordLink') }}</button>
    </form>

    <form v-else class="auth-form" novalidate @submit.prevent="verifyOtp">
      <div class="otp-icon"><i class="pi pi-lock"></i></div>
      <p class="otp-info">
        {{ t('auth.enterCode') }}<br /><strong>{{ phone }}</strong>
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
      <Button type="submit" :label="t('auth.verifySignIn')" :loading="loading" class="w-full auth-btn" icon="pi pi-sign-in" />
      <button type="button" class="auth-link" @click="changeNumber">
        <i class="pi pi-arrow-left"></i> {{ t('auth.useDifferentNumber') }}
      </button>
    </form>
  </AuthDialogShell>
</template>
