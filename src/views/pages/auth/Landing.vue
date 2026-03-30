<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Toast from 'primevue/toast';
import AuthService from '@/service/AuthService.js';

const router = useRouter();
const toast = useToast();

// Login dialog
const showLogin = ref(false);
const step = ref('phone');
const phone = ref('');
const otp = ref('');
const loading = ref(false);

const openLogin = () => { showLogin.value = true; step.value = 'phone'; phone.value = ''; otp.value = ''; };

const requestOtp = async () => {
  if (!phone.value || phone.value.length < 10) {
    toast.add({ severity: 'warn', summary: 'Validation', detail: 'Enter a valid phone number', life: 3000 });
    return;
  }
  loading.value = true;
  try {
    await AuthService.requestOtp(phone.value);
    step.value = 'otp';
    toast.add({ severity: 'success', summary: 'OTP Sent', detail: 'Check your phone for the verification code', life: 4000 });
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.description || 'Failed to send OTP', life: 4000 });
  } finally { loading.value = false; }
};

const verifyOtp = async () => {
  if (!otp.value || otp.value.length < 6) {
    toast.add({ severity: 'warn', summary: 'Validation', detail: 'Enter the 6-digit OTP', life: 3000 });
    return;
  }
  loading.value = true;
  try {
    await AuthService.verifyOtp(phone.value, otp.value);
    showLogin.value = false;
    router.push('/dashboard');
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Invalid OTP', detail: err.response?.data?.description || 'OTP verification failed', life: 4000 });
  } finally { loading.value = false; }
};

const goBack = () => { step.value = 'phone'; otp.value = ''; };
</script>

<template>
  <div class="landing">
    <Toast />

    <!-- Top Bar -->
    <header class="landing-topbar">
      <div class="landing-container flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="/coat-of-arms.svg" alt="Coat of Arms" class="topbar-logo" />
          <div>
            <h1 class="topbar-title">The United Republic of Tanzania</h1>
            <p class="topbar-subtitle">Tax Revenue Appeals Board</p>
            <p class="topbar-badge">Self Service Portal</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button class="btn-signin" @click="openLogin">
            <i class="pi pi-sign-in"></i> Sign In
          </button>
          <button class="btn-register" @click="openLogin">
            <i class="pi pi-user-plus"></i> Register
          </button>
        </div>
      </div>
    </header>

    <div class="accent-line"></div>

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <h2 class="hero-title">
          File Your Tax Appeal<br />
          <span class="hero-highlight">Online, Anytime</span>
        </h2>
        <p class="hero-desc">
          File notices of appeal, lodge statements, track your cases and make payments — all in one secure portal.
        </p>
        <div class="hero-buttons">
          <button class="btn-primary" @click="openLogin">
            <i class="pi pi-arrow-right"></i> Start Filing
          </button>
          <button class="btn-outline" @click="openLogin">
            <i class="pi pi-sign-in"></i> Existing User Login
          </button>
        </div>
        <div class="hero-badges">
          <span><i class="pi pi-shield"></i> Secure &amp; Encrypted</span>
          <span><i class="pi pi-verified"></i> Official Government Portal</span>
          <span><i class="pi pi-clock"></i> 24/7 Available</span>
        </div>
      </div>
    </section>

    <!-- Services Section -->
    <section class="services">
      <div class="landing-container">
        <h3 class="section-title">Available Services</h3>
        <p class="section-desc">Select a service below to begin your appeal process</p>
        <div class="service-grid">
          <div class="service-card" @click="openLogin">
            <div class="service-icon" style="background:rgba(27,107,61,0.08);color:#1B6B3D"><i class="pi pi-file"></i></div>
            <h4 class="service-name">File Notice of Appeal</h4>
            <p class="service-text">Submit your Notice of Appeal against a taxation decision within 30 days</p>
            <span class="service-link">Get started <i class="pi pi-arrow-right"></i></span>
          </div>
          <div class="service-card" @click="openLogin">
            <div class="service-icon" style="background:rgba(139,92,246,0.08);color:#8B5CF6"><i class="pi pi-briefcase"></i></div>
            <h4 class="service-name">Lodge Statement</h4>
            <p class="service-text">File your Statement of Appeal with tax dispute details, witnesses and evidence</p>
            <span class="service-link">Get started <i class="pi pi-arrow-right"></i></span>
          </div>
          <div class="service-card" @click="openLogin">
            <div class="service-icon" style="background:rgba(59,130,246,0.08);color:#3B82F6"><i class="pi pi-search"></i></div>
            <h4 class="service-name">Track My Cases</h4>
            <p class="service-text">Monitor the status of your appeals, hearings and decisions in real time</p>
            <span class="service-link">Get started <i class="pi pi-arrow-right"></i></span>
          </div>
          <div class="service-card" @click="openLogin">
            <div class="service-icon" style="background:rgba(212,175,55,0.08);color:#D4AF37"><i class="pi pi-wallet"></i></div>
            <h4 class="service-name">View Bills &amp; Payments</h4>
            <p class="service-text">Check your bills, control numbers and payment receipts</p>
            <span class="service-link">Get started <i class="pi pi-arrow-right"></i></span>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section class="how-it-works">
      <div class="landing-container">
        <h3 class="section-title">How It Works</h3>
        <p class="section-desc">Simple steps to file your tax appeal online</p>
        <div class="steps-grid">
          <div class="step-card">
            <div class="step-number">1</div>
            <h4 class="step-title">Register / Login</h4>
            <p class="step-desc">Sign in with your phone number via OTP verification</p>
          </div>
          <div class="step-connector"><i class="pi pi-arrow-right"></i></div>
          <div class="step-card">
            <div class="step-number">2</div>
            <h4 class="step-title">File Notice</h4>
            <p class="step-desc">Submit your Notice of Appeal with appellant and taxation details</p>
          </div>
          <div class="step-connector"><i class="pi pi-arrow-right"></i></div>
          <div class="step-card">
            <div class="step-number">3</div>
            <h4 class="step-title">Pay Fees</h4>
            <p class="step-desc">Get a control number and pay via mobile money or bank</p>
          </div>
          <div class="step-connector"><i class="pi pi-arrow-right"></i></div>
          <div class="step-card">
            <div class="step-number">4</div>
            <h4 class="step-title">Lodge Statement</h4>
            <p class="step-desc">Complete your appeal with full statement and supporting documents</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="accent-line"></div>
      <div class="landing-container footer-grid">
        <div>
          <h4 class="footer-heading">Tax Revenue Appeals Board</h4>
          <p class="footer-text">Official digital platform for filing and managing tax appeals in Tanzania.</p>
        </div>
        <div>
          <h4 class="footer-heading">Quick Links</h4>
          <ul class="footer-links">
            <li><a href="#">About TRAB</a></li>
            <li><a href="#">Contact Support</a></li>
            <li><a href="#">Help Center</a></li>
            <li><a href="#">Privacy Policy</a></li>
          </ul>
        </div>
        <div>
          <h4 class="footer-heading">Contact Information</h4>
          <ul class="footer-links">
            <li><i class="pi pi-phone"></i> +255 22 211 8439</li>
            <li><i class="pi pi-envelope"></i> info@trab.go.tz</li>
            <li><i class="pi pi-map-marker"></i> Dar es Salaam, Tanzania</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; {{ new Date().getFullYear() }} Tax Revenue Appeals Board. All rights reserved.</p>
      </div>
    </footer>

    <!-- Login Dialog -->
    <Dialog v-model:visible="showLogin" modal :showHeader="false" :style="{width:'420px'}" :contentStyle="{padding:'0',borderRadius:'16px'}" :pt="{mask:{style:'backdrop-filter:blur(4px)'}}" :dismissableMask="true">
      <div class="login-dialog">
        <div class="login-header">
          <img src="/coat-of-arms.svg" alt="" class="login-logo" />
          <h2>Welcome to TRAB</h2>
          <p>Sign in to access the Self Service Portal</p>
        </div>

        <!-- Phone step -->
        <form v-if="step === 'phone'" @submit.prevent="requestOtp" class="login-form">
          <div class="field">
            <label>Phone Number</label>
            <InputText v-model="phone" placeholder="e.g. 0712345678" class="w-full" maxlength="13" />
            <small>Enter your registered phone number</small>
          </div>
          <Button type="submit" label="Send Verification Code" :loading="loading" class="w-full trab-btn" icon="pi pi-send" />
        </form>

        <!-- OTP step -->
        <form v-if="step === 'otp'" @submit.prevent="verifyOtp" class="login-form">
          <p class="otp-info">Enter the 6-digit code sent to <strong>{{ phone }}</strong></p>
          <div class="field">
            <label>Verification Code</label>
            <InputText v-model="otp" placeholder="000000" class="w-full otp-input" maxlength="6" />
          </div>
          <Button type="submit" label="Verify & Sign In" :loading="loading" class="w-full trab-btn" icon="pi pi-check" />
          <button type="button" class="change-phone" @click="goBack">
            <i class="pi pi-arrow-left"></i> Change phone number
          </button>
        </form>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.landing {
  font-family: 'Poppins', -apple-system, sans-serif;
  color: #1E293B;
  background: #fff;
}
.landing-container {
  max-width: 1140px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

/* Topbar */
.landing-topbar {
  background: #fff;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f1f5f9;
}
.topbar-logo { height: 52px; }
.topbar-title { font-size: 0.95rem; font-weight: 700; color: #1E293B; margin: 0; line-height: 1.2; }
.topbar-subtitle { font-size: 0.78rem; font-weight: 500; color: #475569; margin: 0; }
.topbar-badge { font-size: 0.6rem; font-weight: 600; color: var(--trab-primary); text-transform: uppercase; letter-spacing: 0.08em; margin: 0; }

.btn-signin {
  background: none; border: none; color: #475569; font-size: 0.85rem; font-weight: 500;
  cursor: pointer; padding: 0.5rem 1rem; border-radius: 6px; font-family: inherit;
  display: flex; align-items: center; gap: 0.4rem; transition: color 0.2s;
}
.btn-signin:hover { color: var(--trab-primary); }

.btn-register {
  background: var(--trab-primary); color: #fff; border: none; font-size: 0.85rem; font-weight: 500;
  cursor: pointer; padding: 0.55rem 1.25rem; border-radius: 8px; font-family: inherit;
  display: flex; align-items: center; gap: 0.4rem; transition: background 0.2s;
}
.btn-register:hover { background: var(--trab-primary-hover); }

.accent-line { height: 3px; background: linear-gradient(90deg, var(--trab-primary), var(--trab-accent)); }

/* Hero */
.hero { position: relative; padding: 5rem 1.5rem 4rem; text-align: center; overflow: hidden; }
.hero-bg { position: absolute; inset: 0; background: linear-gradient(135deg, #f0fdf4 0%, #f8faf9 40%, #fff 100%); z-index: 0; }
.hero-content { position: relative; z-index: 1; max-width: 700px; margin: 0 auto; }
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

.hero-badges { display: flex; gap: 2rem; justify-content: center; flex-wrap: wrap; }
.hero-badges span { font-size: 0.8rem; color: #64748B; display: flex; align-items: center; gap: 0.4rem; }
.hero-badges .pi { color: var(--trab-primary); font-size: 0.85rem; }

/* Services */
.services { padding: 4rem 0; background: #fff; }
.section-title { text-align: center; font-size: 1.6rem; font-weight: 700; color: #1E293B; margin: 0 0 0.5rem; }
.section-desc { text-align: center; font-size: 0.9rem; color: #64748B; margin: 0 0 2.5rem; }
.service-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; }
.service-card {
  background: #fff; border: 1px solid #f1f5f9; border-radius: 12px; padding: 1.5rem;
  cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
}
.service-card:hover { border-color: var(--trab-primary); box-shadow: 0 4px 16px rgba(27,107,61,0.08); transform: translateY(-2px); }
.service-icon { width: 3rem; height: 3rem; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 1rem; }
.service-name { font-size: 0.95rem; font-weight: 600; color: #1E293B; margin: 0 0 0.5rem; }
.service-text { font-size: 0.8rem; color: #64748B; line-height: 1.5; margin: 0 0 1rem; }
.service-link { font-size: 0.8rem; font-weight: 600; color: var(--trab-primary); display: flex; align-items: center; gap: 0.3rem; }

/* How It Works */
.how-it-works { padding: 4rem 0; background: #f8faf9; }
.steps-grid { display: flex; align-items: center; justify-content: center; gap: 0.5rem; flex-wrap: wrap; }
.step-card { background: #fff; border: 1px solid #f1f5f9; border-radius: 12px; padding: 1.75rem 1.5rem; text-align: center; width: 200px; flex-shrink: 0; }
.step-number { width: 2.5rem; height: 2.5rem; border-radius: 50%; background: var(--trab-primary); color: #fff; font-size: 1rem; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.75rem; }
.step-title { font-size: 0.9rem; font-weight: 600; color: #1E293B; margin: 0 0 0.4rem; }
.step-desc { font-size: 0.75rem; color: #64748B; line-height: 1.5; margin: 0; }
.step-connector { color: #cbd5e1; font-size: 1rem; }

/* Footer */
.landing-footer { background: #1E293B; color: #94a3b8; padding-top: 0; }
.footer-grid { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 2rem; padding: 3rem 0 2rem; }
.footer-heading { color: #fff; font-size: 0.9rem; font-weight: 600; margin: 0 0 0.75rem; }
.footer-text { font-size: 0.82rem; line-height: 1.6; margin: 0; }
.footer-links { list-style: none; padding: 0; margin: 0; }
.footer-links li { font-size: 0.82rem; padding: 0.25rem 0; display: flex; align-items: center; gap: 0.5rem; }
.footer-links a { color: #94a3b8; text-decoration: none; transition: color 0.2s; }
.footer-links a:hover { color: #fff; }
.footer-bottom { border-top: 1px solid #334155; padding: 1rem 0; text-align: center; font-size: 0.78rem; }

/* Login Dialog */
.login-dialog {
  padding: 2.5rem;
  font-family: 'Poppins', sans-serif;
}
.login-header {
  text-align: center;
  margin-bottom: 2rem;
}
.login-logo {
  height: 56px;
  margin-bottom: 1rem;
}
.login-header h2 {
  font-size: 1.3rem;
  font-weight: 700;
  color: #1E293B;
  margin: 0 0 0.3rem;
}
.login-header p {
  font-size: 0.85rem;
  color: #64748B;
  margin: 0;
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.field label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 0.4rem;
}
.field small {
  display: block;
  font-size: 0.72rem;
  color: #94a3b8;
  margin-top: 0.3rem;
}
.otp-input {
  text-align: center !important;
  font-size: 1.5rem !important;
  letter-spacing: 0.5em !important;
  font-weight: 600 !important;
}
.otp-info {
  text-align: center;
  font-size: 0.85rem;
  color: #64748B;
  margin: 0;
}
.trab-btn {
  background: var(--trab-primary) !important;
  border-color: var(--trab-primary) !important;
  border-radius: 10px !important;
  font-weight: 600 !important;
  font-size: 0.9rem !important;
  padding: 0.75rem !important;
}
.trab-btn:hover {
  background: var(--trab-primary-hover) !important;
  border-color: var(--trab-primary-hover) !important;
}
.change-phone {
  background: none; border: none; color: #64748B; font-size: 0.82rem;
  cursor: pointer; text-align: center; font-family: inherit;
  display: flex; align-items: center; justify-content: center; gap: 0.3rem; transition: color 0.2s;
}
.change-phone:hover { color: var(--trab-primary); }

/* Responsive */
@media (max-width: 768px) {
  .hero-title { font-size: 1.75rem; }
  .service-grid { grid-template-columns: 1fr 1fr; }
  .footer-grid { grid-template-columns: 1fr; }
  .steps-grid { flex-direction: column; }
  .step-connector { transform: rotate(90deg); }
  .landing-topbar .btn-signin,
  .landing-topbar .btn-register { font-size: 0.78rem; padding: 0.45rem 0.75rem; }
}
@media (max-width: 480px) {
  .service-grid { grid-template-columns: 1fr; }
  .hero-buttons { flex-direction: column; align-items: center; }
}
</style>
