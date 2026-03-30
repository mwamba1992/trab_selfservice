<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Toast from 'primevue/toast';
import AuthService from '@/service/AuthService.js';

const router = useRouter();
const toast = useToast();

const step = ref('phone');
const phone = ref('');
const otp = ref('');
const loading = ref(false);

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
  } finally {
    loading.value = false;
  }
};

const verifyOtp = async () => {
  if (!otp.value || otp.value.length < 6) {
    toast.add({ severity: 'warn', summary: 'Validation', detail: 'Enter the 6-digit OTP', life: 3000 });
    return;
  }
  loading.value = true;
  try {
    await AuthService.verifyOtp(phone.value, otp.value);
    router.push('/dashboard');
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Invalid OTP', detail: err.response?.data?.description || 'OTP verification failed', life: 4000 });
  } finally {
    loading.value = false;
  }
};

const goBack = () => { step.value = 'phone'; otp.value = ''; };
</script>

<template>
  <div class="login-page">
    <Toast />

    <!-- Top strip -->
    <header class="login-topbar">
      <div class="login-topbar-inner">
        <router-link to="/welcome" class="flex items-center gap-3" style="text-decoration:none">
          <img src="/coat-of-arms.png" alt="" class="topbar-logo" />
          <div>
            <h1 class="topbar-title">Tax Revenue Appeals Board</h1>
            <p class="topbar-sub">Self Service Portal</p>
          </div>
        </router-link>
      </div>
    </header>
    <div class="accent-line"></div>

    <!-- Login Card -->
    <div class="login-body">
      <div class="login-card">
        <div class="card-header">
          <div class="lock-icon"><i class="pi pi-lock"></i></div>
          <h2>Welcome Back</h2>
          <p>Sign in to access your account</p>
        </div>

        <!-- Step 1: Phone -->
        <form v-if="step === 'phone'" @submit.prevent="requestOtp" class="login-form">
          <div class="field">
            <label>Phone Number</label>
            <InputText v-model="phone" placeholder="e.g. 0712345678" class="w-full" maxlength="13" />
            <small>Enter your registered phone number</small>
          </div>
          <Button type="submit" label="Send Verification Code" :loading="loading" class="w-full trab-btn" icon="pi pi-send" />
        </form>

        <!-- Step 2: OTP -->
        <form v-if="step === 'otp'" @submit.prevent="verifyOtp" class="login-form">
          <p class="otp-info">
            Enter the 6-digit code sent to <strong>{{ phone }}</strong>
          </p>
          <div class="field">
            <label>Verification Code</label>
            <InputText v-model="otp" placeholder="000000" class="w-full otp-input" maxlength="6" />
          </div>
          <Button type="submit" label="Verify & Sign In" :loading="loading" class="w-full trab-btn" icon="pi pi-check" />
          <button type="button" class="change-phone" @click="goBack">
            <i class="pi pi-arrow-left"></i> Change phone number
          </button>
        </form>

        <div class="login-footer">
          <p>Don't have an account? <router-link to="/welcome">Learn more</router-link></p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #f8faf9;
  font-family: 'Poppins', -apple-system, sans-serif;
}

/* Topbar */
.login-topbar {
  background: #fff;
  padding: 0.6rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
}
.login-topbar-inner {
  max-width: 1140px;
  margin: 0 auto;
}
.topbar-logo { height: 42px; }
.topbar-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #1E293B;
  margin: 0;
  line-height: 1.2;
}
.topbar-sub {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--trab-primary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0;
}
.accent-line {
  height: 3px;
  background: linear-gradient(90deg, var(--trab-primary), var(--trab-accent));
}

/* Body */
.login-body {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 70px);
  padding: 2rem 1rem;
}

/* Card */
.login-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
  width: 100%;
  max-width: 420px;
  padding: 2.5rem;
}
.card-header {
  text-align: center;
  margin-bottom: 2rem;
}
.lock-icon {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 14px;
  background: rgba(27,107,61,0.08);
  color: var(--trab-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  margin: 0 auto 1rem;
}
.card-header h2 {
  font-size: 1.35rem;
  font-weight: 700;
  color: #1E293B;
  margin: 0 0 0.3rem;
}
.card-header p {
  font-size: 0.85rem;
  color: #64748B;
  margin: 0;
}

/* Form */
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
  background: none;
  border: none;
  color: #64748B;
  font-size: 0.82rem;
  cursor: pointer;
  text-align: center;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  transition: color 0.2s;
}
.change-phone:hover { color: var(--trab-primary); }

/* Footer */
.login-footer {
  text-align: center;
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid #f1f5f9;
}
.login-footer p {
  font-size: 0.82rem;
  color: #64748B;
  margin: 0;
}
.login-footer a {
  color: var(--trab-primary);
  font-weight: 600;
  text-decoration: none;
}
.login-footer a:hover { text-decoration: underline; }
</style>
