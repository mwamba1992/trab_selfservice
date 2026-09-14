<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import { SelfServiceProfile } from '@/service/SelfServiceApi.js';
import { profileStore } from '@/stores/profile.js';
import { useLabels } from '@/composables/useLabels.js';
import { apiErrorMessage, formatDateTime } from '@/utils/format.js';
import { isValidEmail, isValidPhone, normalizePhone } from '@/utils/validators.js';

const { t, locale } = useI18n();
const toast = useToast();
const { statusLabel } = useLabels();

const loading = ref(true);
const failed = ref(false);
const profile = computed(() => profileStore.state.profile);
const isAdmin = computed(() => profile.value?.companyRole === 'ADMIN');

const personal = ref({ firstName: '', lastName: '', email: '' });
const personalErrors = ref({});
const savingPersonal = ref(false);

const company = ref({ name: '', vatNumber: '', businessType: '', phone: '', email: '', address: '' });
const companyErrors = ref({});
const savingCompany = ref(false);

const fill = (p) => {
  personal.value = { firstName: p.user.firstName || '', lastName: p.user.lastName || '', email: p.user.email || '' };
  if (p.company) {
    const c = p.company;
    company.value = { name: c.name || '', vatNumber: c.vatNumber || '', businessType: c.businessType || '', phone: c.phone || '', email: c.email || '', address: c.address || '' };
  }
};

const load = async () => {
  loading.value = true;
  failed.value = false;
  try {
    fill(await profileStore.load(true));
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const savePersonal = async () => {
  const errors = {};
  if (!personal.value.firstName.trim()) errors.firstName = t('common.required');
  if (personal.value.email.trim() && !isValidEmail(personal.value.email)) errors.email = t('validation.email');
  personalErrors.value = errors;
  if (Object.keys(errors).length) return;

  savingPersonal.value = true;
  try {
    const updated = await SelfServiceProfile.update({
      firstName: personal.value.firstName.trim(),
      lastName: personal.value.lastName.trim(),
      email: personal.value.email.trim(),
    });
    profileStore.setProfile(updated);
    fill(updated);
    toast.add({ severity: 'success', summary: t('common.success'), detail: t('profile.saved'), life: 3000 });
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('profile.saveFailed')), life: 5000 });
  } finally {
    savingPersonal.value = false;
  }
};

const saveCompany = async () => {
  const c = company.value;
  const errors = {};
  if (!c.name.trim()) errors.name = t('common.required');
  if (c.phone.trim() && !isValidPhone(c.phone)) errors.phone = t('validation.phone');
  if (c.email.trim() && !isValidEmail(c.email)) errors.email = t('validation.email');
  companyErrors.value = errors;
  if (Object.keys(errors).length) return;

  // The backend validates phone/email formats, so blanks are sent as "not provided"
  const optional = (value) => value.trim() || undefined;
  savingCompany.value = true;
  try {
    await SelfServiceProfile.updateCompany({
      name: c.name.trim(),
      vatNumber: optional(c.vatNumber),
      businessType: optional(c.businessType),
      phone: c.phone.trim() ? normalizePhone(c.phone) : undefined,
      email: optional(c.email),
      address: optional(c.address),
    });
    fill(await profileStore.load(true));
    toast.add({ severity: 'success', summary: t('common.success'), detail: t('profile.companySaved'), life: 3000 });
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('profile.saveFailed')), life: 5000 });
  } finally {
    savingCompany.value = false;
  }
};
</script>

<template>
  <div>
    <div class="page-header">
      <h2>{{ t('profile.title') }}</h2>
      <p>{{ t('profile.subtitle') }}</p>
    </div>

    <div v-if="loading" class="ss-card state-box"><i class="pi pi-spin pi-spinner"></i></div>

    <div v-else-if="failed" class="ss-card state-box" role="alert">
      <i class="pi pi-exclamation-triangle" style="color:#dc2626"></i>
      <p>{{ t('profile.loadFailed') }}</p>
      <Button :label="t('common.retry')" size="small" outlined @click="load" />
    </div>

    <div v-else-if="profile" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Personal -->
      <section class="ss-card lg:col-span-2">
        <h3 class="section-heading">{{ t('profile.personal') }}</h3>
        <form class="grid grid-cols-1 sm:grid-cols-2 gap-3" novalidate @submit.prevent="savePersonal">
          <div>
            <label class="field-label" for="p-first">{{ t('fields.firstName') }} *</label>
            <InputText id="p-first" v-model="personal.firstName" class="w-full" maxlength="100" :invalid="!!personalErrors.firstName" />
            <small v-if="personalErrors.firstName" class="field-error">{{ personalErrors.firstName }}</small>
          </div>
          <div>
            <label class="field-label" for="p-last">{{ t('fields.lastName') }}</label>
            <InputText id="p-last" v-model="personal.lastName" class="w-full" maxlength="100" />
          </div>
          <div>
            <label class="field-label" for="p-email">{{ t('fields.email') }}</label>
            <InputText id="p-email" v-model="personal.email" type="email" class="w-full" :invalid="!!personalErrors.email" />
            <small v-if="personalErrors.email" class="field-error">{{ personalErrors.email }}</small>
          </div>
          <div>
            <label class="field-label" for="p-phone">{{ t('fields.phone') }}</label>
            <InputText id="p-phone" :model-value="profile.user.phone" class="w-full" disabled />
            <small class="hint">{{ t('profile.phoneLocked') }}</small>
          </div>
          <div class="sm:col-span-2 flex justify-end">
            <Button type="submit" :label="t('common.save')" icon="pi pi-check" class="trab-btn" :loading="savingPersonal" />
          </div>
        </form>
      </section>

      <!-- Account summary + preferences -->
      <section class="ss-card">
        <h3 class="section-heading">{{ t('profile.preferences') }}</h3>
        <p class="hint mb-2">{{ t('profile.languageHint') }}</p>
        <LanguageSwitcher variant="full" />
        <dl class="summary">
          <div v-if="profile.companyRole"><dt>{{ t('profile.yourRole') }}</dt><dd><Tag :value="statusLabel(profile.companyRole)" :severity="isAdmin ? 'success' : 'info'" /></dd></div>
          <div><dt>{{ t('profile.memberSince') }}</dt><dd>{{ formatDateTime(profile.user.createdAt, locale) || t('common.dash') }}</dd></div>
          <div><dt>{{ t('profile.lastLogin') }}</dt><dd>{{ formatDateTime(profile.user.lastLoginAt, locale) || t('common.dash') }}</dd></div>
        </dl>
        <router-link v-if="isAdmin" to="/staff" class="staff-link"><i class="pi pi-users"></i> {{ t('profile.manageStaff') }}</router-link>
      </section>

      <!-- Company -->
      <section class="ss-card lg:col-span-3">
        <h3 class="section-heading">{{ t('profile.company') }}</h3>
        <p v-if="!profile.company" class="hint">{{ t('profile.noCompany') }}</p>
        <template v-else>
          <p v-if="!isAdmin" class="hint mb-3">{{ t('profile.companyHint') }}</p>
          <form class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" novalidate @submit.prevent="saveCompany">
            <div>
              <label class="field-label" for="c-name">{{ t('fields.companyName') }} *</label>
              <InputText id="c-name" v-model="company.name" class="w-full" :disabled="!isAdmin" :invalid="!!companyErrors.name" />
              <small v-if="companyErrors.name" class="field-error">{{ companyErrors.name }}</small>
            </div>
            <div>
              <label class="field-label" for="c-tin">{{ t('fields.tinNumber') }}</label>
              <InputText id="c-tin" :model-value="profile.company.tinNumber" class="w-full" disabled />
            </div>
            <div>
              <label class="field-label" for="c-vat">{{ t('fields.vat') }}</label>
              <InputText id="c-vat" v-model="company.vatNumber" class="w-full" :disabled="!isAdmin" />
            </div>
            <div>
              <label class="field-label" for="c-business">{{ t('fields.business') }}</label>
              <InputText id="c-business" v-model="company.businessType" class="w-full" :disabled="!isAdmin" />
            </div>
            <div>
              <label class="field-label" for="c-phone">{{ t('fields.phone') }}</label>
              <InputText id="c-phone" v-model="company.phone" class="w-full" inputmode="tel" :disabled="!isAdmin" :invalid="!!companyErrors.phone" />
              <small v-if="companyErrors.phone" class="field-error">{{ companyErrors.phone }}</small>
            </div>
            <div>
              <label class="field-label" for="c-email">{{ t('fields.email') }}</label>
              <InputText id="c-email" v-model="company.email" type="email" class="w-full" :disabled="!isAdmin" :invalid="!!companyErrors.email" />
              <small v-if="companyErrors.email" class="field-error">{{ companyErrors.email }}</small>
            </div>
            <div class="sm:col-span-2 lg:col-span-3">
              <label class="field-label" for="c-address">{{ t('fields.address') }}</label>
              <InputText id="c-address" v-model="company.address" class="w-full" :disabled="!isAdmin" />
            </div>
            <div v-if="isAdmin" class="sm:col-span-2 lg:col-span-3 flex justify-end">
              <Button type="submit" :label="t('common.save')" icon="pi pi-check" class="trab-btn" :loading="savingCompany" />
            </div>
          </form>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.state-box { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 2.5rem 1rem; color: #94a3b8; font-size: 0.86rem; text-align: center; }
.section-heading { font-size: 0.92rem; font-weight: 700; color: #1E293B; margin: 0 0 0.9rem; }
.field-label { display: block; font-size: 0.78rem; font-weight: 600; color: #475569; margin-bottom: 0.3rem; }
.field-error { display: block; color: #dc2626; font-size: 0.74rem; margin-top: 0.2rem; }
.hint { display: block; font-size: 0.74rem; color: #94a3b8; margin-top: 0.25rem; }
.summary { margin: 1.25rem 0 0; display: flex; flex-direction: column; gap: 0.6rem; }
.summary div { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 0.82rem; }
.summary dt { color: #64748b; }
.summary dd { margin: 0; color: #1E293B; font-weight: 500; text-align: right; }
.staff-link { display: inline-flex; align-items: center; gap: 0.45rem; margin-top: 1.1rem; color: var(--trab-primary); font-weight: 600; font-size: 0.84rem; text-decoration: none; }
</style>
