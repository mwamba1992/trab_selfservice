<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Toast from 'primevue/toast';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import LoginDialog from '@/components/auth/LoginDialog.vue';
import { safeRedirect } from '@/router/index.js';
import { session } from '@/service/session.js';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const toast = useToast();
const year = new Date().getFullYear();

const showLogin = ref(false);
const openLogin = () => {
  showLogin.value = true;
};
// Enrolment is three questions, so it has a page rather than a card.
const goToRegister = () => router.push('/register');
const goToApp = () => router.replace(safeRedirect(route.query.redirect, session.getUserType()));

onMounted(() => {
  if (route.query.expired) {
    toast.add({ severity: 'warn', summary: t('session.expiredTitle'), detail: t('session.expired'), life: 8000 });
    openLogin();
  } else if (route.query.redirect) {
    openLogin();
  }
});

const services = [
  { key: 'notice', icon: 'pi pi-file', tone: 'green' },
  { key: 'statement', icon: 'pi pi-briefcase', tone: 'violet' },
  { key: 'track', icon: 'pi pi-search', tone: 'blue' },
  { key: 'bills', icon: 'pi pi-wallet', tone: 'gold' },
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
          <button class="btn-register" @click="goToRegister"><i class="pi pi-user-plus"></i> {{ t('auth.createAccount') }}</button>
        </div>
      </div>
    </header>

    <div class="accent-line"></div>

    <main>
      <section class="hero">
        <div class="hero-content">
          <h1 class="hero-title">
            {{ t('landing.heroTitle') }}<br /><span class="hero-highlight">{{ t('landing.heroHighlight') }}</span>
          </h1>
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
              <span class="service-icon" :class="s.tone"><i :class="s.icon"></i></span>
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
            <li>
              <a href="#">{{ t('landing.aboutTrab') }}</a>
            </li>
            <li>
              <a href="#">{{ t('landing.contactSupport') }}</a>
            </li>
            <li>
              <a href="#">{{ t('landing.helpCenter') }}</a>
            </li>
            <li>
              <a href="#">{{ t('landing.privacy') }}</a>
            </li>
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

    <LoginDialog v-model:visible="showLogin" @signed-in="goToApp" @register="goToRegister" />
  </div>
</template>

<style scoped>
.landing {
  font-family:
    'Poppins',
    -apple-system,
    sans-serif;
  color: var(--trab-heading);
  background: #fff;
}
.landing-container {
  max-width: 1140px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.landing-topbar {
  background: #fff;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--trab-line);
}
.topbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.topbar-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.topbar-logo {
  height: 52px;
  flex-shrink: 0;
}
.topbar-title {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
}
.topbar-subtitle {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--trab-label);
  margin: 0;
}
.topbar-badge {
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--trab-primary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0;
}

.btn-signin,
.btn-register,
.btn-primary,
.btn-outline {
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition:
    background 0.2s,
    color 0.2s,
    border-color 0.2s,
    transform 0.15s;
}
.btn-signin {
  background: none;
  border: none;
  color: var(--trab-label);
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.5rem 0.8rem;
  border-radius: 6px;
}
.btn-signin:hover {
  color: var(--trab-primary);
}
.btn-register {
  background: var(--trab-primary);
  color: #fff;
  border: none;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.55rem 1.1rem;
  border-radius: 8px;
}
.btn-register:hover {
  background: var(--trab-primary-hover);
}

.accent-line {
  height: 3px;
  background: linear-gradient(90deg, var(--trab-primary), var(--trab-accent));
}

.hero {
  padding: 5rem 1.5rem 4rem;
  text-align: center;
  background: linear-gradient(135deg, #f0fdf4 0%, #f8faf9 40%, #fff 100%);
}
.hero-content {
  max-width: 720px;
  margin: 0 auto;
}
.hero-title {
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1.15;
  margin: 0 0 1rem;
}
.hero-highlight {
  color: var(--trab-primary);
}
.hero-desc {
  font-size: 1.05rem;
  color: var(--trab-muted);
  margin: 0 0 2rem;
  line-height: 1.6;
}
.hero-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}
.btn-primary {
  background: var(--trab-primary);
  color: #fff;
  border: none;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.85rem 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 14px rgba(27, 107, 61, 0.25);
}
.btn-primary:hover {
  background: var(--trab-primary-hover);
  transform: translateY(-1px);
}
.btn-outline {
  background: #fff;
  color: var(--trab-label);
  border: 1.5px solid var(--trab-border);
  font-size: 0.95rem;
  font-weight: 500;
  padding: 0.85rem 2rem;
  border-radius: 10px;
}
.btn-outline:hover {
  border-color: var(--trab-primary);
  color: var(--trab-primary);
}
.hero-badges {
  display: flex;
  gap: 1.5rem 2rem;
  justify-content: center;
  flex-wrap: wrap;
}
.hero-badges span {
  font-size: 0.8rem;
  color: var(--trab-muted);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.hero-badges .pi {
  color: var(--trab-primary);
  font-size: 0.85rem;
}

.services {
  padding: 4rem 0;
  background: #fff;
}
.section-title {
  text-align: center;
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
}
.section-desc {
  text-align: center;
  font-size: 0.9rem;
  color: var(--trab-muted);
  margin: 0 0 2.5rem;
}
.service-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;
}
.service-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  background: #fff;
  border: 1px solid var(--trab-line);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  font-family: inherit;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.15s;
}
.service-card:hover,
.service-card:focus-visible {
  border-color: var(--trab-primary);
  box-shadow: 0 4px 16px rgba(27, 107, 61, 0.08);
  transform: translateY(-2px);
}
.service-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  margin-bottom: 1rem;
}
.service-icon.green {
  background: rgba(27, 107, 61, 0.08);
  color: #1b6b3d;
}
.service-icon.violet {
  background: rgba(139, 92, 246, 0.08);
  color: #8b5cf6;
}
.service-icon.blue {
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
}
.service-icon.gold {
  background: rgba(212, 175, 55, 0.1);
  color: #b8860b;
}
.service-name {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
}
.service-text {
  font-size: 0.8rem;
  color: var(--trab-muted);
  line-height: 1.5;
  margin: 0 0 1rem;
  flex: 1;
}
.service-link {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--trab-primary);
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.how-it-works {
  padding: 4rem 0;
  background: var(--trab-soft-bg);
}
.steps-grid {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.step-card {
  background: #fff;
  border: 1px solid var(--trab-line);
  border-radius: 12px;
  padding: 1.75rem 1.5rem;
  text-align: center;
  width: 200px;
  flex-shrink: 0;
}
.step-number {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: var(--trab-primary);
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.75rem;
}
.step-title {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 0.4rem;
}
.step-desc {
  font-size: 0.75rem;
  color: var(--trab-muted);
  line-height: 1.5;
  margin: 0;
}
.step-connector {
  color: var(--trab-placeholder-icon);
}

.landing-footer {
  background: var(--trab-heading);
  color: var(--trab-subtle);
}
.footer-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr;
  gap: 2rem;
  padding: 3rem 1.5rem 2rem;
}
.footer-heading {
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
}
.footer-text {
  font-size: 0.82rem;
  line-height: 1.6;
  margin: 0;
}
.footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
}
.footer-links li {
  font-size: 0.82rem;
  padding: 0.25rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.footer-links a {
  color: var(--trab-subtle);
  text-decoration: none;
}
.footer-links a:hover {
  color: #fff;
}
.footer-bottom {
  border-top: 1px solid #334155;
  padding: 1rem;
  text-align: center;
  font-size: 0.78rem;
}

@media (max-width: 900px) {
  .service-grid {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 768px) {
  .hero {
    padding: 3rem 1rem 2.5rem;
  }
  .hero-title {
    font-size: 1.75rem;
  }
  .footer-grid {
    grid-template-columns: 1fr;
  }
  .steps-grid {
    flex-direction: column;
  }
  .step-connector {
    transform: rotate(90deg);
  }
  .btn-signin,
  .btn-register {
    font-size: 0.78rem;
    padding: 0.45rem 0.7rem;
  }
}
@media (max-width: 480px) {
  .service-grid {
    grid-template-columns: 1fr;
  }
  .hero-buttons {
    flex-direction: column;
    align-items: stretch;
  }
  .hero-buttons button {
    justify-content: center;
  }
  .topbar-logo {
    height: 40px;
  }
  .topbar-title {
    font-size: 0.8rem;
  }
}
</style>
