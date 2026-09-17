<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Select from 'primevue/select';
import Button from 'primevue/button';
import AuthDialogShell from './AuthDialogShell.vue';
import FilePicker from '@/components/FilePicker.vue';
import AuthService from '@/service/AuthService.js';
import { apiErrorMessage } from '@/utils/format.js';
import { formatNida, formatTin, isValidEmail, isValidNida, isValidOtp, isValidPhone, isValidTin, normalizePhone } from '@/utils/validators.js';

/**
 * A new portal account. The Board accepts filings from people it can identify,
 * so what you are — and the number that proves it — is settled here, with the
 * email and password you will sign in with afterwards.
 */
const props = defineProps({ visible: { type: Boolean, default: false } });
const emit = defineEmits(['update:visible', 'registered', 'sign-in']);

const { t } = useI18n();
const toast = useToast();

const KINDS = ['ORGANISATION', 'INDIVIDUAL', 'ADVOCATE', 'TAX_CONSULTANT'];
/** The two who act for other people must show the Board their standing. */
const NEEDS_CERTIFICATE = ['ADVOCATE', 'TAX_CONSULTANT'];

const KIND_ICONS = {
  ORGANISATION: 'pi-building',
  INDIVIDUAL: 'pi-user',
  ADVOCATE: 'pi-briefcase',
  TAX_CONSULTANT: 'pi-calculator',
};

const STEPS = ['identity', 'details', 'code'];
const step = ref('identity');
const loading = ref(false);
const error = ref('');
const otp = ref('');
const challenge = ref('');
const phoneHint = ref('');
const lookingUp = ref(false);
const tinName = ref('');

const form = ref({
  kind: 'ORGANISATION',
  idNumber: '',
  registeredName: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  certificate: null,
});

const kindOptions = computed(() => KINDS.map((kind) => ({ value: kind, label: t(`filer.kinds.${kind}`) })));
const idLabel = computed(() => t(`filer.idLabel.${form.value.kind}`));
const needsCertificate = computed(() => NEEDS_CERTIFICATE.includes(form.value.kind));
const isCompany = computed(() => form.value.kind === 'ORGANISATION');

/**
 * Each kind of number has its own shape. A TIN and a NIDA number are digits in
 * fixed groups, so the field takes digits only and writes the groups in as the
 * person types; a roll number is whatever the roll says it is.
 */
const NUMBER_RULES = {
  ORGANISATION: { maxlength: 11, inputmode: 'numeric', placeholder: '123-456-789', format: formatTin, valid: isValidTin, message: 'validation.tin' },
  INDIVIDUAL: { maxlength: 23, inputmode: 'numeric', placeholder: '19900101-12345-00001-12', format: formatNida, valid: isValidNida, message: 'validation.nida' },
  ADVOCATE: { maxlength: 30, inputmode: 'text', placeholder: '', format: (v) => v, valid: (v) => Boolean(String(v).trim()), message: 'validation.required' },
  TAX_CONSULTANT: { maxlength: 30, inputmode: 'text', placeholder: '', format: (v) => v, valid: (v) => Boolean(String(v).trim()), message: 'validation.required' },
};
const numberRule = computed(() => NUMBER_RULES[form.value.kind]);
const stepIndex = computed(() => STEPS.indexOf(step.value));

const chooseKind = (kind) => {
  form.value.kind = kind;
  form.value.idNumber = '';
  tinName.value = '';
  error.value = '';
};

/** The first question answered: what you are, and the number that proves it. */
const toDetails = () => {
  error.value = '';
  if (!numberRule.value.valid(form.value.idNumber)) {
    error.value = t(numberRule.value.message);
    return;
  }
  if (needsCertificate.value && !form.value.certificate) {
    error.value = t('filer.certificateRequired');
    return;
  }
  step.value = 'details';
};

/** Keeps the number in the shape its kind uses while it is being typed. */
const onNumberInput = (event) => {
  form.value.idNumber = numberRule.value.format(event.target.value);
};

watch(
  () => props.visible,
  (open) => {
    if (open) {
      step.value = 'identity';
      error.value = '';
      otp.value = '';
      tinName.value = '';
      form.value = { ...form.value, idNumber: '', password: '', certificate: null };
    }
  },
);

/** A company's TIN is settled by TRA, so its name is fetched, not typed. */
const lookupTin = async () => {
  error.value = '';
  if (!isValidTin(form.value.idNumber)) {
    error.value = t('validation.tin');
    return;
  }
  lookingUp.value = true;
  try {
    const res = await AuthService.lookupTin(form.value.idNumber.replace(/[\s-]/g, ''));
    if (!res?.status) {
      error.value = res?.description || t('auth.tinNotFound');
      return;
    }
    tinName.value = res.data?.name || res.data?.taxpayerName || '';
    form.value.registeredName = tinName.value || form.value.registeredName;
  } catch (err) {
    error.value = apiErrorMessage(err, t('auth.tinVerifyFailed'));
  } finally {
    lookingUp.value = false;
  }
};

const submit = async () => {
  error.value = '';
  const f = form.value;
  if (!f.firstName.trim()) {
    error.value = t('validation.required');
    return;
  }
  if (!isValidEmail(f.email)) {
    error.value = t('validation.email');
    return;
  }
  if (!isValidPhone(f.phone)) {
    error.value = t('validation.phone');
    return;
  }
  if (f.password.length < 8) {
    error.value = t('auth.passwordTooShort');
    return;
  }
  loading.value = true;
  try {
    const started = await AuthService.register({ ...f, phone: normalizePhone(f.phone) });
    challenge.value = started.challenge;
    phoneHint.value = started.phoneHint;
    step.value = 'code';
    toast.add({ severity: 'success', summary: t('auth.codeSentTitle'), detail: t('auth.codeSent'), life: 4000 });
  } catch (err) {
    error.value = apiErrorMessage(err, t('auth.registerFailed'));
  } finally {
    loading.value = false;
  }
};

const verify = async () => {
  error.value = '';
  if (!isValidOtp(otp.value)) {
    error.value = t('validation.otp');
    return;
  }
  loading.value = true;
  try {
    await AuthService.completeLogin(challenge.value, otp.value);
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
    :title="step === 'code' ? t('auth.codeTitle') : t('auth.createAccount')"
    :subtitle="step === 'code' ? t('auth.codeSubtitle') : t(`auth.${step}Lede`)"
    :error="error"
    @update:visible="emit('update:visible', $event)"
  >
    <ol v-if="step !== 'code'" class="steps" :aria-label="t('auth.createAccount')">
      <li v-for="(name, index) in STEPS" :key="name" :class="{ done: index < stepIndex, now: index === stepIndex }">
        <span class="step-dot">{{ index + 1 }}</span>
        <span class="step-name">{{ t(`auth.step.${name}`) }}</span>
      </li>
    </ol>

    <!-- 1. Who you are -->
    <form v-if="step === 'identity'" class="auth-form" novalidate @submit.prevent="toDetails">
      <div class="kinds">
        <button
          v-for="kind in KINDS"
          :key="kind"
          type="button"
          class="kind-tile"
          :class="{ chosen: form.kind === kind }"
          :aria-pressed="form.kind === kind"
          @click="chooseKind(kind)"
        >
          <i class="pi" :class="KIND_ICONS[kind]"></i>
          <span>{{ t(`filer.kinds.${kind}`) }}</span>
        </button>
      </div>

      <div class="auth-field">
        <label for="reg-number">{{ idLabel }}</label>
        <div class="with-action">
          <InputText
            id="reg-number"
            :model-value="form.idNumber"
            :maxlength="numberRule.maxlength"
            :inputmode="numberRule.inputmode"
            :placeholder="numberRule.placeholder"
            class="w-full auth-input"
            @input="onNumberInput"
          />
          <Button v-if="isCompany" type="button" :label="t('auth.checkTin')" size="small" outlined :loading="lookingUp" @click="lookupTin" />
        </div>
        <small v-if="tinName" class="found">{{ tinName }}</small>
      </div>

      <div v-if="needsCertificate" class="auth-field">
        <label>{{ t('filer.certificate') }}</label>
        <FilePicker v-model="form.certificate" accept="application/pdf,image/*" />
        <small>{{ t('filer.certificateHint') }}</small>
      </div>

      <Button type="submit" :label="t('common.continue')" icon="pi pi-arrow-right" icon-pos="right" class="w-full auth-btn" />
      <button type="button" class="auth-link" @click="emit('sign-in')"><i class="pi pi-sign-in"></i> {{ t('auth.haveAccount') }}</button>
    </form>

    <!-- 2. Your details -->
    <form v-else-if="step === 'details'" class="auth-form" novalidate @submit.prevent="submit">
      <div class="auth-field">
        <label for="reg-registered-name">{{ t('filer.registeredName') }}</label>
        <InputText id="reg-registered-name" v-model="form.registeredName" class="w-full auth-input" />
      </div>

      <div class="auth-row">
        <div class="auth-field">
          <label for="reg-first">{{ t('fields.firstName') }}</label>
          <InputText id="reg-first" v-model="form.firstName" class="w-full auth-input" autocomplete="given-name" />
        </div>
        <div class="auth-field">
          <label for="reg-last">{{ t('fields.lastName') }}</label>
          <InputText id="reg-last" v-model="form.lastName" class="w-full auth-input" autocomplete="family-name" />
        </div>
      </div>

      <div class="auth-field">
        <label for="reg-email"><i class="pi pi-envelope"></i> {{ t('fields.email') }}</label>
        <InputText id="reg-email" v-model="form.email" type="email" class="w-full auth-input" autocomplete="email" />
      </div>

      <div class="auth-field">
        <label for="reg-phone"><i class="pi pi-mobile"></i> {{ t('auth.phoneLabel') }}</label>
        <InputText id="reg-phone" v-model="form.phone" placeholder="0712 345 678" class="w-full auth-input" inputmode="tel" />
        <small>{{ t('auth.phoneForCode') }}</small>
      </div>

      <div class="auth-field">
        <label for="reg-password"><i class="pi pi-lock"></i> {{ t('auth.passwordLabel') }}</label>
        <Password
          input-id="reg-password"
          v-model="form.password"
          toggle-mask
          input-class="w-full auth-input"
          class="w-full"
          autocomplete="new-password"
        />
        <small>{{ t('auth.passwordRule') }}</small>
      </div>

      <Button type="submit" :label="t('auth.createAccount')" :loading="loading" class="w-full auth-btn" icon="pi pi-user-plus" />
      <button type="button" class="auth-link" @click="step = 'identity'"><i class="pi pi-arrow-left"></i> {{ t('common.back') }}</button>
    </form>

    <!-- 3. The code -->
    <form v-else class="auth-form" novalidate @submit.prevent="verify">
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
      <Button type="submit" :label="t('auth.finishSetup')" :loading="loading" class="w-full auth-btn" icon="pi pi-check" />
    </form>
  </AuthDialogShell>
</template>

<style scoped>
/* Three questions, and where you are among them. */
.steps {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  list-style: none;
  margin: 0 0 1.2rem;
  padding: 0;
}
.steps li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex: 1;
  font-size: 0.72rem;
  color: var(--trab-muted);
}
.steps li + li::before {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--trab-border);
}
.step-dot {
  width: 1.45rem;
  height: 1.45rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #fff;
  border: 1px solid var(--trab-border);
  font-weight: 700;
  font-size: 0.72rem;
  flex: none;
}
.steps li.now {
  color: var(--trab-primary);
  font-weight: 600;
}
.steps li.now .step-dot {
  background: var(--trab-primary);
  border-color: var(--trab-primary);
  color: #fff;
}
.steps li.done .step-dot {
  background: #ecfdf5;
  border-color: var(--trab-primary);
  color: var(--trab-primary);
}
@media (max-width: 520px) {
  .step-name {
    display: none;
  }
}

/* What you are, as four things to pick rather than a list to open. */
.kinds {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 1.1rem;
}
.kind-tile {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.6rem 0.65rem;
  border: 1px solid var(--trab-border);
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.78rem;
  color: var(--trab-text);
  text-align: left;
  line-height: 1.3;
}
.kind-tile i {
  font-size: 0.95rem;
  color: var(--trab-muted);
  flex: none;
}
.kind-tile:hover {
  border-color: var(--trab-primary);
}
.kind-tile.chosen {
  border-color: var(--trab-primary);
  background: #f0fdf4;
  font-weight: 600;
}
.kind-tile.chosen i {
  color: var(--trab-primary);
}
.auth-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}
@media (max-width: 520px) {
  .auth-row {
    grid-template-columns: 1fr;
  }
}
.with-action {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}
.with-action :deep(input) {
  flex: 1;
}
.found {
  color: #047857;
  font-weight: 600;
}
</style>
