<script setup>
import { ref, watch } from 'vue';
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
import { isValidOtp } from '@/utils/validators.js';

const props = defineProps({ visible: { type: Boolean, default: false } });
const emit = defineEmits(['update:visible', 'signed-in', 'register']);

const { t } = useI18n();
const primevue = usePrimeVue();
const toast = useToast();

// Signing in is the password, then the code sent to the phone on the account.
// The TRA desk has no code step; startLogin says which desk answered.
const step = ref('credentials');
const email = ref('');
const password = ref('');
const otp = ref('');
const challenge = ref('');
const phoneHint = ref('');
const loading = ref(false);
const error = ref('');

watch(
  () => props.visible,
  (open) => {
    if (open) {
      step.value = 'credentials';
      password.value = '';
      otp.value = '';
      challenge.value = '';
      error.value = '';
    }
  },
);

const signIn = async () => {
  error.value = '';
  if (!email.value.trim() || !password.value) {
    error.value = t('validation.required');
    return;
  }
  loading.value = true;
  try {
    const started = await AuthService.startLogin(email.value.trim(), password.value);
    password.value = '';
    if (started.desk === 'tra') {
      // The TRA desk is English by policy.
      setLocale('en', primevue);
      emit('update:visible', false);
      emit('signed-in');
      return;
    }
    challenge.value = started.challenge;
    phoneHint.value = started.phoneHint;
    step.value = 'otp';
    toast.add({ severity: 'success', summary: t('auth.codeSentTitle'), detail: t('auth.codeSent'), life: 4000 });
  } catch (err) {
    error.value = apiErrorMessage(err, t('auth.passwordFailed'));
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
    await AuthService.completeLogin(challenge.value, otp.value);
    emit('update:visible', false);
    emit('signed-in');
  } catch (err) {
    error.value = apiErrorMessage(err, t('auth.verifyFailed'));
  } finally {
    loading.value = false;
  }
};

const startAgain = () => {
  step.value = 'credentials';
  otp.value = '';
  challenge.value = '';
  error.value = '';
};
</script>

<template>
  <AuthDialogShell
    :visible="visible"
    :title="step === 'otp' ? t('auth.codeTitle') : t('auth.welcomeBack')"
    :subtitle="step === 'otp' ? t('auth.codeSubtitle') : t('auth.signInSubtitle')"
    :error="error"
    @update:visible="emit('update:visible', $event)"
  >
    <form v-if="step === 'credentials'" class="auth-form" novalidate @submit.prevent="signIn">
      <div class="auth-field">
        <label for="login-email"><i class="pi pi-envelope"></i> {{ t('fields.email') }}</label>
        <InputText
          id="login-email"
          v-model="email"
          type="email"
          placeholder="you@example.co.tz"
          class="w-full auth-input"
          autocomplete="username"
        />
      </div>
      <div class="auth-field">
        <label for="login-password"><i class="pi pi-lock"></i> {{ t('auth.passwordLabel') }}</label>
        <Password
          id="login-password"
          v-model="password"
          :feedback="false"
          toggle-mask
          input-class="w-full auth-input"
          class="w-full"
          autocomplete="current-password"
        />
      </div>
      <Button type="submit" :label="t('auth.signIn')" :loading="loading" class="w-full auth-btn" icon="pi pi-sign-in" />
      <div class="auth-divider">
        <span>{{ t('auth.newToTrab') }}</span>
      </div>
      <button type="button" class="auth-secondary" @click="emit('register')">
        <i class="pi pi-user-plus"></i> {{ t('auth.createAccount') }}
      </button>
    </form>

    <form v-else class="auth-form" novalidate @submit.prevent="verifyCode">
      <div class="otp-icon"><i class="pi pi-lock"></i></div>
      <p class="otp-info">
        {{ t('auth.enterCode') }}<br /><strong>{{ phoneHint }}</strong>
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
      <button type="button" class="auth-link" @click="startAgain"><i class="pi pi-arrow-left"></i> {{ t('auth.startAgain') }}</button>
    </form>
  </AuthDialogShell>
</template>
