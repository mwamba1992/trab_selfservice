<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import api from '@/service/Api.js';
import AuthService from '@/service/AuthService.js';

const router = useRouter();
const step = ref(1); // 1=TIN, 2=OTP
const loading = ref(false);
const error = ref('');

// Step 1: TIN + Company details
const tinNumber = ref('');
const companyName = ref('');
const companyPhone = ref('');
const companyEmail = ref('');
const companyAddress = ref('');
const companyBusiness = ref('');
const companyVat = ref('');
const adminName = ref('');
const adminPhone = ref('');
const tinVerified = ref(false);
const verifying = ref(false);

// Step 2: OTP
const companyId = ref('');
const otp = ref('');

const verifyTin = async () => {
  if (!tinNumber.value || tinNumber.value.replace(/[-\s]/g, '').length < 3) {
    error.value = 'Enter a valid TIN number';
    return;
  }
  verifying.value = true;
  error.value = '';
  try {
    const res = await api.get(`/auth/tin-lookup/${tinNumber.value}`);
    if (!res.data.status || !res.data.data) {
      error.value = res.data.description || 'TIN not found';
      return;
    }
    const d = res.data.data;
    companyName.value = d.CompanyName;
    companyPhone.value = d.Mobile || '';
    companyEmail.value = d.Email || '';
    companyAddress.value = [d.Region, d.District].filter(Boolean).join(', ');
    companyBusiness.value = d.BusinessType || '';
    companyVat.value = d.Vrn || '';
    tinVerified.value = true;
  } catch {
    error.value = 'TIN verification failed';
  } finally {
    verifying.value = false;
  }
};

const register = async () => {
  if (!adminName.value || !adminPhone.value) {
    error.value = 'Admin name and phone are required';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const res = await api.post('/auth/company/register', {
      tinNumber: tinNumber.value,
      adminName: adminName.value,
      adminPhone: adminPhone.value,
    });
    if (!res.data.status) {
      error.value = res.data.description || 'Registration failed';
      return;
    }
    companyId.value = res.data.data.companyId;
    step.value = 2;
  } catch (err) {
    error.value = err.response?.data?.description || 'Registration failed';
  } finally {
    loading.value = false;
  }
};

const verifyOtp = async () => {
  if (!otp.value || otp.value.length < 6) {
    error.value = 'Enter the 6-digit OTP';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const res = await api.post('/auth/company/verify', {
      companyId: companyId.value,
      phone: adminPhone.value,
      otp: otp.value,
      adminName: adminName.value,
    });
    if (!res.data.status) {
      error.value = res.data.description || 'Verification failed';
      return;
    }
    const { accessToken, refreshToken, user, company } = res.data.data;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('userId', user.id);
    localStorage.setItem('userName', `${user.firstName} ${user.lastName}`);
    localStorage.setItem('userPhone', user.phone);
    localStorage.setItem('companyId', company.id);
    localStorage.setItem('companyName', company.name);
    router.push('/dashboard');
  } catch (err) {
    error.value = err.response?.data?.description || 'Verification failed';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="register-page">
    <div class="register-card">
      <div class="text-center mb-4">
        <img src="/coat-of-arms.svg" alt="" style="height:60px" />
        <h2 class="title">Register Your Company</h2>
        <p class="subtitle">Tax Revenue Appeals Board — Self Service Portal</p>
      </div>

      <div v-if="error" class="error-box">{{ error }}</div>

      <!-- Step 1: TIN Verification + Admin Details -->
      <div v-if="step === 1">
        <div class="mb-4">
          <label class="field-label">Company TIN Number *</label>
          <div class="flex gap-2">
            <InputText v-model="tinNumber" class="flex-1" placeholder="XXX-XXX-XXX" :disabled="tinVerified" />
            <Button v-if="!tinVerified" label="Verify" icon="pi pi-search" :loading="verifying" @click="verifyTin" class="btn-primary" />
            <Button v-else icon="pi pi-check-circle" severity="success" disabled />
          </div>
        </div>

        <div v-if="tinVerified" class="company-preview mb-4">
          <div class="preview-row"><span class="preview-label">Company</span><strong>{{ companyName }}</strong></div>
          <div class="preview-row"><span class="preview-label">Business</span>{{ companyBusiness }}</div>
          <div class="preview-row"><span class="preview-label">VAT</span>{{ companyVat || '-' }}</div>
          <div class="preview-row"><span class="preview-label">Phone</span>{{ companyPhone || '-' }}</div>
          <div class="preview-row"><span class="preview-label">Email</span>{{ companyEmail || '-' }}</div>
          <div class="preview-row"><span class="preview-label">Address</span>{{ companyAddress || '-' }}</div>
        </div>

        <div v-if="tinVerified">
          <h4 class="section-title">Admin Details</h4>
          <p class="help-text">This person will be the company administrator on the portal.</p>
          <div class="mb-3">
            <label class="field-label">Full Name *</label>
            <InputText v-model="adminName" class="w-full" placeholder="e.g. John Doe" />
          </div>
          <div class="mb-4">
            <label class="field-label">Phone Number *</label>
            <InputText v-model="adminPhone" class="w-full" placeholder="0XXXXXXXXX" maxlength="13" />
          </div>
          <Button label="Register & Send OTP" icon="pi pi-send" class="btn-primary w-full" :loading="loading" @click="register" :disabled="!adminName || !adminPhone" />
        </div>

        <div class="text-center mt-4">
          <router-link to="/welcome" class="link">Already registered? Login here</router-link>
        </div>
      </div>

      <!-- Step 2: OTP Verification -->
      <div v-if="step === 2">
        <div class="text-center mb-4">
          <i class="pi pi-mobile" style="font-size:2.5rem;color:#1B6B3D"></i>
          <p class="mt-2" style="color:#475569">OTP sent to <strong>{{ adminPhone }}</strong></p>
        </div>
        <div class="mb-4">
          <label class="field-label">Enter OTP Code</label>
          <InputText v-model="otp" class="w-full text-center" placeholder="000000" maxlength="6" style="font-size:1.5rem;letter-spacing:0.5rem" />
        </div>
        <Button label="Verify & Complete Registration" icon="pi pi-check" class="btn-primary w-full" :loading="loading" @click="verifyOtp" />
        <div class="text-center mt-3">
          <Button label="Back" text size="small" @click="step = 1" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-page { min-height:100vh; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 50%,#f8fafc 100%); padding:1rem; }
.register-card { background:#fff; border-radius:12px; padding:2rem; max-width:480px; width:100%; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
.title { font-size:1.3rem; font-weight:700; color:#1B365D; margin:0.5rem 0 0.2rem; }
.subtitle { font-size:0.82rem; color:#64748B; margin:0; }
.field-label { display:block; font-size:0.78rem; font-weight:600; color:#475569; margin-bottom:0.3rem; }
.section-title { font-size:0.9rem; font-weight:700; color:#1B365D; margin:0 0 0.3rem; }
.help-text { font-size:0.76rem; color:#94a3b8; margin-bottom:0.75rem; }
.btn-primary { background:#1B6B3D!important; border-color:#1B6B3D!important; }
.error-box { background:#fef2f2; color:#dc2626; padding:0.6rem 0.8rem; border-radius:8px; font-size:0.82rem; margin-bottom:1rem; }
.company-preview { background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:0.75rem; }
.preview-row { display:flex; justify-content:space-between; padding:0.3rem 0; font-size:0.82rem; border-bottom:1px solid #d1fae5; }
.preview-row:last-child { border-bottom:none; }
.preview-label { color:#64748B; }
.link { color:#1B6B3D; font-size:0.82rem; text-decoration:none; }
.link:hover { text-decoration:underline; }
</style>
