<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Toast from 'primevue/toast';
import AuthService from '@/service/AuthService.js';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import { safeRedirect } from '@/router/index.js';
import { apiErrorMessage } from '@/utils/format.js';
import { isValidPhone, normalizePhone, isValidOtp, isValidTin } from '@/utils/validators.js';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const toast = useToast();
const year = new Date().getFullYear();

const goToApp = () => router.replace(safeRedirect(route.query.redirect));

// ─── Sign in ───
const showLogin = ref(false);
const step = ref('phone');
const phone = ref('');
const otp = ref('');
const loading = ref(false);
const loginError = ref('');

const openLogin = () => {
  showLogin.value = true;
  step.value = 'phone';
  otp.value = '';
  loginError.value = '';
};

const requestOtp = async () => {
  loginError.value = '';
  if (!isValidPhone(phone.value)) {
    loginError.value = t('validation.phone');
    return;
  }
  loading.value = true;
  try {
    await AuthService.requestOtp(normalizePhone(phone.value));
    step.value = 'otp';
    toast.add({ severity: 'success', summary: t('auth.codeSentTitle'), detail: t('auth.codeSent'), life: 4000 });
  } catch (err) {
    loginError.value = apiErrorMessage(err, t('auth.sendFailed'));
  } finally {
    loading.value = false;
  }
};

const verifyOtp = async () => {
  loginError.value = '';
  if (!isValidOtp(otp.value)) {
    loginError.value = t('validation.otp');
    return;
  }
  loading.value = true;
  try {
    await AuthService.verifyOtp(normalizePhone(phone.value), otp.value);
    showLogin.value = false;
    goToApp();
  } catch (err) {
    loginError.value = apiErrorMessage(err, t('auth.verifyFailed'));
  } finally {
    loading.value = false;
  }
};

const changeNumber = () => {
  step.value = 'phone';
  otp.value = '';
  loginError.value = '';
};

// ─── Company registration ───
const showRegister = ref(false);
const regStep = ref(1); // 1 = TIN + admin, 2 = code
const regLoading = ref(false);
const regVerifying = ref(false);
const regError = ref('');
const regTin = ref('');
const regCompany = ref(null);
const regAdminName = ref('');
const regAdminPhone = ref('');
const regCompanyId = ref('');
const regOtp = ref('');

const regTinVerified = computed(() => !!regCompany.value);

const openRegister = () => {
  showRegister.value = true;
  regStep.value = 1;
  regError.value = '';
  regTin.value = '';
  regCompany.value = null;
  regAdminName.value = '';
  regAdminPhone.value = '';
  regOtp.value = '';
};

const regVerifyTin = async () => {
  regError.value = '';
  if (!isValidTin(regTin.value)) {
    regError.value = t('validation.tin');
    return;
  }
  regVerifying.value = true;
  try {
    const res = await AuthService.lookupTin(regTin.value.replace(/[\s-]/g, ''));
    if (!res.status || !res.data) {
      regError.value = res.description || t('auth.tinNotFound');
      return;
    }
    const d = res.data;
    regCompany.value = {
      name: d.CompanyName,
      business: d.BusinessType || '',
      vat: d.Vrn || '',
      address: [d.Region, d.District].filter(Boolean).join(', '),
    };
  } catch (err) {
    regError.value = apiErrorMessage(err, t('auth.tinVerifyFailed'));
  } finally {
    regVerifying.value = false;
  }
};

const regRegister = async () => {
  regError.value = '';
  if (!regAdminName.value.trim() || !regAdminPhone.value.trim()) {
    regError.value = t('auth.adminRequired');
    return;
  }
  if (!isValidPhone(regAdminPhone.value)) {
    regError.value = t('validation.phone');
    return;
  }
  regLoading.value = true;
  try {
    const result = await AuthService.registerCompany({
      tinNumber: regTin.value,
      adminName: regAdminName.value.trim(),
      adminPhone: normalizePhone(regAdminPhone.value),
    });
    regCompanyId.value = result.companyId;
    regStep.value = 2;
  } catch (err) {
    regError.value = apiErrorMessage(err, t('auth.registerFailed'));
  } finally {
    regLoading.value = false;
  }
};

const regVerifyOtp = async () => {
  regError.value = '';
  if (!isValidOtp(regOtp.value)) {
    regError.value = t('validation.otp');
    return;
  }
  regLoading.value = true;
  try {
    await AuthService.verifyCompany({
      companyId: regCompanyId.value,
      phone: normalizePhone(regAdminPhone.value),
      otp: regOtp.value,
      adminName: regAdminName.value.trim(),
    });
    showRegister.value = false;
    goToApp();
  } catch (err) {
    regError.value = apiErrorMessage(err, t('auth.verifyFailed'));
  } finally {
    regLoading.value = false;
  }
};

const switchToRegister = () => { showLogin.value = false; openRegister(); };
const switchToLogin = () => { showRegister.value = false; openLogin(); };

onMounted(() => {
  if (route.query.expired) {
    toast.add({ severity: 'warn', summary: t('session.expiredTitle'), detail: t('session.expired'), life: 8000 });
    openLogin();
  } else if (route.query.redirect) {
    openLogin();
  }
});

const services = [
  { key: 'notice', icon: 'pi pi-file', color: '#1B6B3D', bg: 'rgba(27,107,61,0.08)' },
  { key: 'statement', icon: 'pi pi-briefcase', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  { key: 'track', icon: 'pi pi-search', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  { key: 'bills', icon: 'pi pi-wallet', color: '#B8860B', bg: 'rgba(212,175,55,0.1)' },
];
const steps = ['register', 'notice', 'pay', 'statement'];
</script>

<template>
  <div class="landing">
    <Toast :breakpoints="{ '640px': { width: '92vw', right: '4vw', left: '4vw' } }" />

    <header class="landing-topbar">
      <div class="landing-container topbar-row">
        <div class="flex items-center gap-3 min-w-0">
          <img src="/coat-of-arms.svg" alt="" class="topbar-logo" />
          <div class="min-w-0">
            <p class="topbar-title">{{ t('common.republic') }}</p>
            <p class="topbar-subtitle">{{ t('common.board') }}</p>
            <p class="topbar-badge">{{ t('common.portal') }}</p>
          </div>
        </div>
        <div class="topbar-actions">
          <LanguageSwitcher />
          <button class="btn-signin" @click="openLogin"><i class="pi pi-sign-in"></i> {{ t('auth.signIn') }}</button>
          <button class="btn-register" @click="openRegister"><i class="pi pi-user-plus"></i> {{ t('auth.registerCompany') }}</button>
        </div>
      </div>
    </header>

    <div class="accent-line"></div>

    <main>
      <section class="hero">
        <div class="hero-bg"></div>
        <div class="hero-content">
          <h1 class="hero-title">{{ t('landing.heroTitle') }}<br /><span class="hero-highlight">{{ t('landing.heroHighlight') }}</span></h1>
          <p class="hero-desc">{{ t('landing.heroDesc') }}</p>
          <div class="hero-buttons">
            <button class="btn-primary" @click="openLogin"><i class="pi pi-arrow-right"></i> {{ t('landing.startFiling') }}</button>
            <button class="btn-outline" @click="openLogin"><i class="pi pi-sign-in"></i> {{ t('landing.existingUser') }}</button>
          </div>
          <div class="hero-badges">
            <span><i class="pi pi-shield"></i> {{ t('landing.secure') }}</span>
            <span><i class="pi pi-verified"></i> {{ t('landing.official') }}</span>
            <span><i class="pi pi-clock"></i> {{ t('landing.available') }}</span>
          </div>
        </div>
      </section>

      <section class="services">
        <div class="landing-container">
          <h2 class="section-title">{{ t('landing.servicesTitle') }}</h2>
          <p class="section-desc">{{ t('landing.servicesDesc') }}</p>
          <div class="service-grid">
            <button v-for="s in services" :key="s.key" type="button" class="service-card" @click="openLogin">
              <span class="service-icon" :style="{ background: s.bg, color: s.color }"><i :class="s.icon"></i></span>
              <span class="service-name">{{ t(`landing.services.${s.key}.title`) }}</span>
              <span class="service-text">{{ t(`landing.services.${s.key}.text`) }}</span>
              <span class="service-link">{{ t('landing.getStarted') }} <i class="pi pi-arrow-right"></i></span>
            </button>
          </div>
        </div>
      </section>

      <section class="how-it-works">
        <div class="landing-container">
          <h2 class="section-title">{{ t('landing.howTitle') }}</h2>
          <p class="section-desc">{{ t('landing.howDesc') }}</p>
          <div class="steps-grid">
            <template v-for="(s, i) in steps" :key="s">
              <div class="step-card">
                <div class="step-number">{{ i + 1 }}</div>
                <h3 class="step-title">{{ t(`landing.steps.${s}.title`) }}</h3>
                <p class="step-desc">{{ t(`landing.steps.${s}.text`) }}</p>
              </div>
              <div v-if="i < steps.length - 1" class="step-connector" aria-hidden="true"><i class="pi pi-arrow-right"></i></div>
            </template>
          </div>
        </div>
      </section>
    </main>

    <footer class="landing-footer">
      <div class="accent-line"></div>
      <div class="landing-container footer-grid">
        <div>
          <h4 class="footer-heading">{{ t('common.board') }}</h4>
          <p class="footer-text">{{ t('landing.footerAbout') }}</p>
        </div>
        <div>
          <h4 class="footer-heading">{{ t('landing.quickLinks') }}</h4>
          <ul class="footer-links">
            <li><a href="#">{{ t('landing.aboutTrab') }}</a></li>
            <li><a href="#">{{ t('landing.contactSupport') }}</a></li>
            <li><a href="#">{{ t('landing.helpCenter') }}</a></li>
            <li><a href="#">{{ t('landing.privacy') }}</a></li>
          </ul>
        </div>
        <div>
          <h4 class="footer-heading">{{ t('landing.contactInfo') }}</h4>
          <ul class="footer-links">
            <li><i class="pi pi-phone"></i> +255 22 211 8439</li>
            <li><i class="pi pi-envelope"></i> info@trab.go.tz</li>
            <li><i class="pi pi-map-marker"></i> {{ t('landing.location') }}</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>{{ t('footer.rights', { year }) }}</p>
      </div>
    </footer>

    <!-- Sign-in dialog -->
    <Dialog v-model:visible="showLogin" modal :show-header="false" :style="{ width: '440px' }" :breakpoints="{ '520px': '94vw' }" :content-style="{ padding: '0', borderRadius: '20px', overflow: 'hidden' }" :pt="{ mask: { style: 'backdrop-filter:blur(6px);background:rgba(0,0,0,0.3)' } }" dismissable-mask>
      <div class="login-dialog">
        <div class="login-accent"></div>
        <div class="login-body">
          <div class="login-header">
            <div class="login-icon-wrap"><img src="/coat-of-arms.svg" alt="" class="login-logo" /></div>
            <h2>{{ t('auth.welcomeBack') }}</h2>
            <p>{{ t('auth.signInSubtitle') }}</p>
          </div>

          <div v-if="loginError" class="reg-error" role="alert"><i class="pi pi-exclamation-triangle"></i> {{ loginError }}</div>

          <form v-if="step === 'phone'" class="login-form" novalidate @submit.prevent="requestOtp">
            <div class="field">
              <label for="login-phone"><i class="pi pi-mobile"></i> {{ t('auth.phoneLabel') }}</label>
              <InputText id="login-phone" v-model="phone" placeholder="0712 345 678" class="w-full login-input" maxlength="16" inputmode="tel" autocomplete="tel" autofocus />
              <small>{{ t('auth.phoneHint') }}</small>
            </div>
            <Button type="submit" :label="t('auth.sendCode')" :loading="loading" class="w-full login-btn" icon="pi pi-send" />
            <div class="login-divider"><span>{{ t('auth.newToTrab') }}</span></div>
            <button type="button" class="register-link" @click="switchToRegister"><i class="pi pi-building"></i> {{ t('auth.registerYourCompany') }}</button>
          </form>

          <form v-if="step === 'otp'" class="login-form" novalidate @submit.prevent="verifyOtp">
            <div class="otp-icon"><i class="pi pi-lock"></i></div>
            <p class="otp-info">{{ t('auth.enterCode') }}<br /><strong>{{ phone }}</strong></p>
            <div class="field">
              <InputText v-model="otp" placeholder="------" class="w-full otp-input" maxlength="6" inputmode="numeric" autocomplete="one-time-code" :aria-label="t('validation.otp')" autofocus />
            </div>
            <Button type="submit" :label="t('auth.verifySignIn')" :loading="loading" class="w-full login-btn" icon="pi pi-sign-in" />
            <button type="button" class="change-phone" @click="changeNumber"><i class="pi pi-arrow-left"></i> {{ t('auth.useDifferentNumber') }}</button>
          </form>
        </div>
      </div>
    </Dialog>

    <!-- Registration dialog -->
    <Dialog v-model:visible="showRegister" modal :show-header="false" :style="{ width: '480px' }" :breakpoints="{ '520px': '94vw' }" :content-style="{ padding: '0', borderRadius: '20px', overflow: 'hidden' }" :pt="{ mask: { style: 'backdrop-filter:blur(6px);background:rgba(0,0,0,0.3)' } }" dismissable-mask>
      <div class="login-dialog">
        <div class="login-accent"></div>
        <div class="login-body">
          <div class="login-header">
            <div class="login-icon-wrap"><img src="/coat-of-arms.svg" alt="" class="login-logo" /></div>
            <h2>{{ t('auth.registerTitle') }}</h2>
            <p>{{ t('auth.registerSubtitle') }}</p>
          </div>

          <div v-if="regError" class="reg-error" role="alert"><i class="pi pi-exclamation-triangle"></i> {{ regError }}</div>

          <div v-if="regStep === 1" class="login-form">
            <form class="field" novalidate @submit.prevent="regVerifyTin">
              <label for="reg-tin"><i class="pi pi-id-card"></i> {{ t('auth.companyTin') }}</label>
              <div class="flex gap-2">
                <InputText id="reg-tin" v-model="regTin" placeholder="XXX-XXX-XXX" class="flex-1 login-input min-w-0" inputmode="numeric" :disabled="regTinVerified" />
                <Button v-if="!regTinVerified" type="submit" :label="t('auth.verify')" icon="pi pi-search" :loading="regVerifying" class="login-btn" style="padding:0.5rem 1rem !important" />
                <Button v-else icon="pi pi-check-circle" severity="success" disabled style="border-radius:10px" :aria-label="t('appellants.tinVerifiedTitle')" />
              </div>
            </form>

            <div v-if="regCompany" class="company-preview">
              <div class="cp-row"><span>{{ t('auth.company') }}</span><strong>{{ regCompany.name }}</strong></div>
              <div class="cp-row"><span>{{ t('auth.business') }}</span>{{ regCompany.business || t('common.dash') }}</div>
              <div class="cp-row"><span>{{ t('auth.vat') }}</span>{{ regCompany.vat || t('common.dash') }}</div>
              <div class="cp-row"><span>{{ t('fields.address') }}</span>{{ regCompany.address || t('common.dash') }}</div>
            </div>

            <form v-if="regCompany" novalidate @submit.prevent="regRegister">
              <div class="login-divider"><span>{{ t('auth.adminDetails') }}</span></div>
              <div class="field">
                <label for="reg-name"><i class="pi pi-user"></i> {{ t('auth.fullName') }}</label>
                <InputText id="reg-name" v-model="regAdminName" :placeholder="t('auth.fullNamePlaceholder')" class="w-full login-input" autocomplete="name" />
              </div>
              <div class="field" style="margin-top:0.75rem">
                <label for="reg-phone"><i class="pi pi-mobile"></i> {{ t('auth.phoneLabel') }}</label>
                <InputText id="reg-phone" v-model="regAdminPhone" placeholder="0712345678" class="w-full login-input" maxlength="16" inputmode="tel" autocomplete="tel" />
              </div>
              <Button type="submit" :label="t('auth.registerSendCode')" icon="pi pi-send" class="w-full login-btn" style="margin-top:1rem" :loading="regLoading" :disabled="!regAdminName || !regAdminPhone" />
            </form>

            <div class="login-divider" style="margin-top:1rem"><span>{{ t('auth.alreadyRegistered') }}</span></div>
            <button type="button" class="register-link" @click="switchToLogin"><i class="pi pi-sign-in"></i> {{ t('auth.signInInstead') }}</button>
          </div>

          <form v-if="regStep === 2" class="login-form" novalidate @submit.prevent="regVerifyOtp">
            <div class="otp-icon"><i class="pi pi-lock"></i></div>
            <p class="otp-info">{{ t('auth.enterCode') }}<br /><strong>{{ regAdminPhone }}</strong></p>
            <div class="field">
              <InputText v-model="regOtp" placeholder="------" class="w-full otp-input" maxlength="6" inputmode="numeric" autocomplete="one-time-code" :aria-label="t('validation.otp')" />
            </div>
            <Button type="submit" :label="t('auth.verifyComplete')" icon="pi pi-check" class="w-full login-btn" :loading="regLoading" />
            <button type="button" class="change-phone" @click="regStep = 1"><i class="pi pi-arrow-left"></i> {{ t('common.back') }}</button>
          </form>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.landing { font-family: 'Poppins', -apple-system, sans-serif; color: #1E293B; background: #fff; }
.landing-container { max-width: 1140px; margin: 0 auto; padding: 0 1.5rem; }

/* Topbar */
.landing-topbar { background: #fff; padding: 0.75rem 0; border-bottom: 1px solid #f1f5f9; }
.topbar-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
.topbar-actions { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
.topbar-logo { height: 52px; flex-shrink: 0; }
.topbar-title { font-size: 0.95rem; font-weight: 700; color: #1E293B; margin: 0; line-height: 1.2; }
.topbar-subtitle { font-size: 0.78rem; font-weight: 500; color: #475569; margin: 0; }
.topbar-badge { font-size: 0.6rem; font-weight: 600; color: var(--trab-primary); text-transform: uppercase; letter-spacing: 0.08em; margin: 0; }

.btn-signin {
  background: none; border: none; color: #475569; font-size: 0.85rem; font-weight: 500;
  cursor: pointer; padding: 0.5rem 0.8rem; border-radius: 6px; font-family: inherit;
  display: flex; align-items: center; gap: 0.4rem; transition: color 0.2s;
}
.btn-signin:hover { color: var(--trab-primary); }
.btn-register {
  background: var(--trab-primary); color: #fff; border: none; font-size: 0.85rem; font-weight: 500;
  cursor: pointer; padding: 0.55rem 1.1rem; border-radius: 8px; font-family: inherit;
  display: flex; align-items: center; gap: 0.4rem; transition: background 0.2s;
}
.btn-register:hover { background: var(--trab-primary-hover); }

.accent-line { height: 3px; background: linear-gradient(90deg, var(--trab-primary), var(--trab-accent)); }

/* Hero */
.hero { position: relative; padding: 5rem 1.5rem 4rem; text-align: center; overflow: hidden; }
.hero-bg { position: absolute; inset: 0; background: linear-gradient(135deg, #f0fdf4 0%, #f8faf9 40%, #fff 100%); z-index: 0; }
.hero-content { position: relative; z-index: 1; max-width: 720px; margin: 0 auto; }
.hero-title { font-size: 2.5rem; font-weight: 800; line-height: 1.15; color: #1E293B; margin: 0 0 1rem; }
.hero-highlight { color: var(--trab-primary); }
.hero-desc { font-size: 1.05rem; color: #64748B; margin: 0 0 2rem; line-height: 1.6; }
.hero-buttons { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-bottom: 2rem; }
.btn-primary {
  background: var(--trab-primary); color: #fff; border: none; font-size: 0.95rem; font-weight: 600;
  padding: 0.85rem 2rem; border-radius: 10px; cursor: pointer; font-family: inherit;
  display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s, transform 0.15s;
  box-shadow: 0 4px 14px rgba(27,107,61,0.25);
}
.btn-primary:hover { background: var(--trab-primary-hover); transform: translateY(-1px); }
.btn-outline {
  background: #fff; color: #475569; border: 1.5px solid #E2E8F0; font-size: 0.95rem; font-weight: 500;
  padding: 0.85rem 2rem; border-radius: 10px; cursor: pointer; font-family: inherit;
  display: flex; align-items: center; gap: 0.5rem; transition: border-color 0.2s, color 0.2s;
}
.btn-outline:hover { border-color: var(--trab-primary); color: var(--trab-primary); }
.hero-badges { display: flex; gap: 1.5rem 2rem; justify-content: center; flex-wrap: wrap; }
.hero-badges span { font-size: 0.8rem; color: #64748B; display: flex; align-items: center; gap: 0.4rem; }
.hero-badges .pi { color: var(--trab-primary); font-size: 0.85rem; }

/* Services */
.services { padding: 4rem 0; background: #fff; }
.section-title { text-align: center; font-size: 1.6rem; font-weight: 700; color: #1E293B; margin: 0 0 0.5rem; }
.section-desc { text-align: center; font-size: 0.9rem; color: #64748B; margin: 0 0 2.5rem; }
.service-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; }
.service-card {
  display: flex; flex-direction: column; align-items: flex-start; text-align: left;
  background: #fff; border: 1px solid #f1f5f9; border-radius: 12px; padding: 1.5rem;
  cursor: pointer; font-family: inherit; transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
}
.service-card:hover, .service-card:focus-visible { border-color: var(--trab-primary); box-shadow: 0 4px 16px rgba(27,107,61,0.08); transform: translateY(-2px); }
.service-icon { width: 3rem; height: 3rem; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 1rem; }
.service-name { font-size: 0.95rem; font-weight: 600; color: #1E293B; margin: 0 0 0.5rem; }
.service-text { font-size: 0.8rem; color: #64748B; line-height: 1.5; margin: 0 0 1rem; flex: 1; }
.service-link { font-size: 0.8rem; font-weight: 600; color: var(--trab-primary); display: flex; align-items: center; gap: 0.3rem; }

/* How it works */
.how-it-works { padding: 4rem 0; background: #f8faf9; }
.steps-grid { display: flex; align-items: center; justify-content: center; gap: 0.5rem; flex-wrap: wrap; }
.step-card { background: #fff; border: 1px solid #f1f5f9; border-radius: 12px; padding: 1.75rem 1.5rem; text-align: center; width: 200px; flex-shrink: 0; }
.step-number { width: 2.5rem; height: 2.5rem; border-radius: 50%; background: var(--trab-primary); color: #fff; font-size: 1rem; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.75rem; }
.step-title { font-size: 0.9rem; font-weight: 600; color: #1E293B; margin: 0 0 0.4rem; }
.step-desc { font-size: 0.75rem; color: #64748B; line-height: 1.5; margin: 0; }
.step-connector { color: #cbd5e1; font-size: 1rem; }

/* Footer */
.landing-footer { background: #1E293B; color: #94a3b8; }
.footer-grid { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 2rem; padding: 3rem 1.5rem 2rem; }
.footer-heading { color: #fff; font-size: 0.9rem; font-weight: 600; margin: 0 0 0.75rem; }
.footer-text { font-size: 0.82rem; line-height: 1.6; margin: 0; }
.footer-links { list-style: none; padding: 0; margin: 0; }
.footer-links li { font-size: 0.82rem; padding: 0.25rem 0; display: flex; align-items: center; gap: 0.5rem; }
.footer-links a { color: #94a3b8; text-decoration: none; transition: color 0.2s; }
.footer-links a:hover { color: #fff; }
.footer-bottom { border-top: 1px solid #334155; padding: 1rem; text-align: center; font-size: 0.78rem; }

/* Dialogs */
.login-dialog { font-family: 'Poppins', sans-serif; }
.login-accent { height: 4px; background: linear-gradient(90deg, #1B6B3D, #D4AF37, #1B365D); }
.login-body { padding: 2rem 2.5rem 2.5rem; }
.login-header { text-align: center; margin-bottom: 1.5rem; }
.login-icon-wrap { width: 70px; height: 70px; border-radius: 50%; background: linear-gradient(135deg, #f0fdf4, #ecfdf5); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; box-shadow: 0 4px 12px rgba(27,107,61,0.1); }
.login-logo { height: 42px; }
.login-header h2 { font-size: 1.35rem; font-weight: 700; color: #1E293B; margin: 0 0 0.25rem; }
.login-header p { font-size: 0.82rem; color: #94a3b8; margin: 0; }
.login-form { display: flex; flex-direction: column; gap: 1rem; }
.field label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 0.4rem; }
.field label .pi { font-size: 0.85rem; color: #1B6B3D; }
.field small { display: block; font-size: 0.72rem; color: #94a3b8; margin-top: 0.35rem; }
.login-input { border-radius: 10px !important; padding: 0.7rem 0.85rem !important; font-size: 0.95rem !important; }
.login-btn { background: linear-gradient(135deg, #1B6B3D, #166534) !important; border: none !important; border-radius: 12px !important; font-weight: 600 !important; font-size: 0.9rem !important; padding: 0.8rem !important; box-shadow: 0 4px 14px rgba(27,107,61,0.3) !important; }
.login-divider { text-align: center; position: relative; margin: 0.5rem 0; }
.login-divider::before { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: #e2e8f0; }
.login-divider span { position: relative; background: #fff; padding: 0 0.75rem; font-size: 0.75rem; color: #94a3b8; }
.register-link { width: 100%; background: none; border: 1.5px solid #e2e8f0; color: #475569; font-size: 0.85rem; font-weight: 500; padding: 0.7rem; border-radius: 12px; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
.register-link:hover { border-color: #1B6B3D; color: #1B6B3D; }
.otp-icon { text-align: center; margin-bottom: 0.5rem; }
.otp-icon .pi { font-size: 2rem; color: #1B6B3D; background: linear-gradient(135deg, #f0fdf4, #ecfdf5); width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; }
.otp-input { text-align: center !important; font-size: 1.8rem !important; letter-spacing: 0.6em !important; font-weight: 700 !important; border-radius: 12px !important; padding: 0.8rem !important; border: 2px solid #e2e8f0 !important; }
.otp-input:focus { border-color: #1B6B3D !important; }
.otp-info { text-align: center; font-size: 0.85rem; color: #64748B; margin: 0 0 0.5rem; line-height: 1.5; }
.change-phone { background: none; border: none; color: #64748B; font-size: 0.82rem; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 0.3rem; margin-top: 0.25rem; }
.change-phone:hover { color: #1B6B3D; }
.reg-error { background: #fef2f2; color: #dc2626; padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.8rem; margin-bottom: 0.75rem; }
.company-preview { background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 0.6rem 0.8rem; margin-bottom: 0.75rem; }
.cp-row { display: flex; justify-content: space-between; gap: 0.75rem; padding: 0.25rem 0; font-size: 0.8rem; border-bottom: 1px solid #d1fae5; }
.cp-row:last-child { border-bottom: none; }
.cp-row span { color: #64748B; }

@media (max-width: 900px) {
  .service-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 768px) {
  .hero { padding: 3rem 1rem 2.5rem; }
  .hero-title { font-size: 1.75rem; }
  .footer-grid { grid-template-columns: 1fr; }
  .steps-grid { flex-direction: column; }
  .step-connector { transform: rotate(90deg); }
  .btn-signin, .btn-register { font-size: 0.78rem; padding: 0.45rem 0.7rem; }
  .login-body { padding: 1.5rem 1.25rem 1.75rem; }
}
@media (max-width: 480px) {
  .service-grid { grid-template-columns: 1fr; }
  .hero-buttons { flex-direction: column; align-items: stretch; }
  .hero-buttons button { justify-content: center; }
  .topbar-logo { height: 40px; }
  .topbar-title { font-size: 0.8rem; }
}
</style>
