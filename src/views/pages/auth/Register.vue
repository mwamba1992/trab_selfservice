<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import FilePicker from '@/components/FilePicker.vue';
import AuthService from '@/service/AuthService.js';
import { apiErrorMessage } from '@/utils/format.js';
import { formatNida, formatTin, isValidEmail, isValidNida, isValidOtp, isValidPhone, isValidTin, normalizePhone } from '@/utils/validators.js';

/**
 * Enrolment, as its own page rather than a dialog: nine fields never fitted a
 * card, and the questions fall into three that belong apart — who you are,
 * how the Board reaches you, and the code that proves the phone is yours.
 */
const { t } = useI18n();
const router = useRouter();
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

const NUMBER_RULES = {
  ORGANISATION: { maxlength: 11, inputmode: 'numeric', placeholder: '123-456-789', format: formatTin, valid: isValidTin, message: 'validation.tin' },
  INDIVIDUAL: { maxlength: 23, inputmode: 'numeric', placeholder: '19900101-12345-00001-12', format: formatNida, valid: isValidNida, message: 'validation.nida' },
  ADVOCATE: { maxlength: 30, inputmode: 'text', placeholder: '', format: (v) => v, valid: (v) => Boolean(String(v).trim()), message: 'validation.required' },
  TAX_CONSULTANT: { maxlength: 30, inputmode: 'text', placeholder: '', format: (v) => v, valid: (v) => Boolean(String(v).trim()), message: 'validation.required' },
};

const STEPS = ['identity', 'details', 'code'];

const step = ref('identity');
const loading = ref(false);
const lookingUp = ref(false);
const error = ref('');
const otp = ref('');
const challenge = ref('');
const phoneHint = ref('');
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

const stepIndex = computed(() => STEPS.indexOf(step.value));
const idLabel = computed(() => t(`filer.idLabel.${form.value.kind}`));
const needsCertificate = computed(() => NEEDS_CERTIFICATE.includes(form.value.kind));
const isCompany = computed(() => form.value.kind === 'ORGANISATION');
const numberRule = computed(() => NUMBER_RULES[form.value.kind]);

const chooseKind = (kind) => {
  form.value.kind = kind;
  form.value.idNumber = '';
  tinName.value = '';
  error.value = '';
};

/** Keeps the number in the shape its kind uses while it is being typed. */
const onNumberInput = (event) => {
  form.value.idNumber = numberRule.value.format(event.target.value);
};

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
    router.push('/dashboard');
  } catch (err) {
    error.value = apiErrorMessage(err, t('auth.verifyFailed'));
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="register-page">
    <header class="register-top">
      <router-link to="/welcome" class="brand">
        <img src="/coat-of-arms.svg" alt="" class="brand-logo" />
        <span>
          <strong>{{ t('common.board') }}</strong>
          <small>{{ t('common.portal') }}</small>
        </span>
      </router-link>
      <router-link to="/welcome" class="back-link"><i class="pi pi-arrow-left"></i> {{ t('common.back') }}</router-link>
    </header>

    <main class="register-main">
      <div class="register-card">
        <ol class="steps" :aria-label="t('auth.createAccount')">
          <li v-for="(name, index) in STEPS" :key="name" :class="{ done: index < stepIndex, now: index === stepIndex }">
            <span class="step-dot">{{ index + 1 }}</span>
            <span class="step-name">{{ t(`auth.step.${name}`) }}</span>
          </li>
        </ol>

        <div v-if="error" class="register-error" role="alert"><i class="pi pi-exclamation-triangle"></i> {{ error }}</div>

        <!-- 1. Who you are -->
        <form v-if="step === 'identity'" class="panel" novalidate @submit.prevent="toDetails">
          <h1>{{ t('auth.step.identity') }}</h1>
          <p class="lede">{{ t('auth.identityLede') }}</p>

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

          <div class="field">
            <label for="reg-number">{{ idLabel }}</label>
            <div class="with-action">
              <InputText
                id="reg-number"
                :model-value="form.idNumber"
                :maxlength="numberRule.maxlength"
                :inputmode="numberRule.inputmode"
                :placeholder="numberRule.placeholder"
                class="w-full"
                @input="onNumberInput"
              />
              <Button v-if="isCompany" type="button" :label="t('auth.checkTin')" outlined :loading="lookingUp" @click="lookupTin" />
            </div>
            <small v-if="tinName" class="found"><i class="pi pi-check-circle"></i> {{ tinName }}</small>
          </div>

          <div v-if="needsCertificate" class="field">
            <label>{{ t('filer.certificate') }}</label>
            <FilePicker v-model="form.certificate" accept="application/pdf,image/*" />
            <small>{{ t('filer.certificateHint') }}</small>
          </div>

          <Button type="submit" :label="t('common.continue')" icon="pi pi-arrow-right" icon-pos="right" class="trab-btn w-full" />
          <router-link to="/welcome" class="quiet-link">{{ t('auth.haveAccount') }}</router-link>
        </form>

        <!-- 2. How the Board reaches you -->
        <form v-else-if="step === 'details'" class="panel" novalidate @submit.prevent="submit">
          <h1>{{ t('auth.step.details') }}</h1>
          <p class="lede">{{ t('auth.detailsLede') }}</p>

          <div class="field">
            <label for="reg-registered-name">{{ t('filer.registeredName') }}</label>
            <InputText id="reg-registered-name" v-model="form.registeredName" class="w-full" />
          </div>

          <div class="two-up">
            <div class="field">
              <label for="reg-first">{{ t('fields.firstName') }}</label>
              <InputText id="reg-first" v-model="form.firstName" class="w-full" autocomplete="given-name" />
            </div>
            <div class="field">
              <label for="reg-last">{{ t('fields.lastName') }}</label>
              <InputText id="reg-last" v-model="form.lastName" class="w-full" autocomplete="family-name" />
            </div>
          </div>

          <div class="two-up">
            <div class="field">
              <label for="reg-email">{{ t('fields.email') }}</label>
              <InputText id="reg-email" v-model="form.email" type="email" class="w-full" autocomplete="email" />
            </div>
            <div class="field">
              <label for="reg-phone">{{ t('auth.phoneLabel') }}</label>
              <InputText id="reg-phone" v-model="form.phone" placeholder="0712 345 678" class="w-full" inputmode="tel" />
              <small>{{ t('auth.phoneForCode') }}</small>
            </div>
          </div>

          <div class="field">
            <label for="reg-password">{{ t('auth.passwordLabel') }}</label>
            <Password id="reg-password" v-model="form.password" toggle-mask input-class="w-full" class="w-full" autocomplete="new-password" />
            <small>{{ t('auth.passwordRule') }}</small>
          </div>

          <div class="actions">
            <Button type="button" :label="t('common.back')" icon="pi pi-arrow-left" text @click="step = 'identity'" />
            <Button type="submit" :label="t('auth.createAccount')" icon="pi pi-user-plus" :loading="loading" class="trab-btn" />
          </div>
        </form>

        <!-- 3. The code -->
        <form v-else class="panel code-panel" novalidate @submit.prevent="verify">
          <div class="code-icon"><i class="pi pi-mobile"></i></div>
          <h1>{{ t('auth.codeTitle') }}</h1>
          <p class="lede">{{ t('auth.enterCode') }} <strong>{{ phoneHint }}</strong></p>
          <InputText
            v-model="otp"
            placeholder="------"
            class="otp-input"
            maxlength="6"
            inputmode="numeric"
            autocomplete="one-time-code"
            :aria-label="t('validation.otp')"
          />
          <Button type="submit" :label="t('auth.finishSetup')" icon="pi pi-check" :loading="loading" class="trab-btn w-full" />
        </form>
      </div>
    </main>
  </div>
</template>

<style scoped>
.register-page {
  min-height: 100vh;
  background: var(--trab-bg, #f8faf9);
  font-family: 'Poppins', -apple-system, sans-serif;
  display: flex;
  flex-direction: column;
}
.register-top {
  background: #fff;
  border-bottom: 1px solid var(--trab-border);
  padding: 0.7rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
  color: var(--trab-text);
}
.brand-logo {
  height: 40px;
}
.brand span {
  display: grid;
  line-height: 1.25;
}
.brand strong {
  font-size: 0.9rem;
}
.brand small {
  font-size: 0.72rem;
  color: var(--trab-muted);
}
.back-link {
  font-size: 0.82rem;
  color: var(--trab-muted);
  text-decoration: none;
}
.back-link:hover {
  color: var(--trab-primary);
}

.register-main {
  flex: 1;
  display: flex;
  justify-content: center;
  /* The card is as tall as the step it is showing, not as tall as the page. */
  align-items: flex-start;
  padding: 2.5rem 1.25rem 3rem;
}
.register-card {
  width: 100%;
  max-width: 620px;
  background: #fff;
  border: 1px solid var(--trab-border);
  border-radius: 14px;
  padding: 1.6rem 1.8rem 2rem;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

/* Three questions, and where you are among them. */
.steps {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  list-style: none;
  margin: 0 0 1.6rem;
  padding: 0;
}
.steps li {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex: 1;
  font-size: 0.75rem;
  color: var(--trab-muted);
}
.steps li + li::before {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--trab-border);
  margin-right: 0.2rem;
}
.step-dot {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #fff;
  border: 1px solid var(--trab-border);
  font-weight: 700;
  font-size: 0.75rem;
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
@media (max-width: 560px) {
  .step-name {
    display: none;
  }
}

.panel h1 {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0;
  color: var(--trab-text);
}
.lede {
  margin: 0.3rem 0 1.3rem;
  font-size: 0.85rem;
  color: var(--trab-muted);
  line-height: 1.55;
}

/* What you are, as four things to pick rather than a list to open. */
.kinds {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.6rem;
  margin-bottom: 1.3rem;
}
@media (max-width: 480px) {
  .kinds {
    grid-template-columns: 1fr;
  }
}
.kind-tile {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--trab-border);
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.85rem;
  color: var(--trab-text);
  text-align: left;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}
.kind-tile i {
  font-size: 1.05rem;
  color: var(--trab-muted);
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

.field {
  display: grid;
  gap: 0.35rem;
  margin-bottom: 1.1rem;
}
.field label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--trab-text);
}
.field small {
  font-size: 0.73rem;
  color: var(--trab-muted);
}
.two-up {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.9rem;
  /* A hint under one field must not stretch the input beside it. */
  align-items: start;
}
@media (max-width: 480px) {
  .two-up {
    grid-template-columns: 1fr;
  }
}
.with-action {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.with-action :deep(input) {
  flex: 1;
}
.found {
  color: var(--trab-primary);
  font-weight: 600;
}
.register-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fef2f2;
  color: #b42318;
  border-radius: 8px;
  padding: 0.65rem 0.8rem;
  font-size: 0.82rem;
  margin-bottom: 1.1rem;
}
.actions {
  display: flex;
  justify-content: space-between;
  gap: 0.6rem;
  margin-top: 0.4rem;
}
.quiet-link {
  display: block;
  text-align: center;
  margin-top: 0.9rem;
  font-size: 0.82rem;
  color: var(--trab-muted);
  text-decoration: none;
}
.quiet-link:hover {
  color: var(--trab-primary);
}

.code-panel {
  text-align: center;
}
.code-icon {
  width: 3.2rem;
  height: 3.2rem;
  border-radius: 999px;
  background: #f0fdf4;
  color: var(--trab-primary);
  display: grid;
  place-items: center;
  margin: 0 auto 0.8rem;
  font-size: 1.3rem;
}
.otp-input {
  display: block;
  margin: 0 auto 1.2rem;
  width: 11rem;
  text-align: center;
  letter-spacing: 0.5rem;
  font-size: 1.2rem;
}
</style>
