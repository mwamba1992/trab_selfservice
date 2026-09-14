<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import { SelfServiceCompany } from '@/service/SelfServiceApi.js';
import { profileStore } from '@/stores/profile.js';
import { useLabels } from '@/composables/useLabels.js';
import { apiErrorMessage } from '@/utils/format.js';
import { isValidPhone, normalizePhone } from '@/utils/validators.js';

const { t } = useI18n();
const toast = useToast();
const confirm = useConfirm();
const { statusLabel } = useLabels();

const staff = ref([]);
const loading = ref(false);
const failed = ref(false);
const dialogVisible = ref(false);
const newName = ref('');
const newPhone = ref('');
const formErrors = ref({});
const saving = ref(false);

const company = computed(() => profileStore.state.profile?.company);
const isAdmin = computed(() => profileStore.isCompanyAdmin);
const activeCount = computed(() => staff.value.filter((s) => s.isActive).length);
const maxStaff = computed(() => company.value?.maxStaff || 3);
const canAdd = computed(() => isAdmin.value && activeCount.value < maxStaff.value);

const displayName = (s) => `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim();

const loadData = async () => {
  loading.value = true;
  failed.value = false;
  try {
    const [list] = await Promise.all([SelfServiceCompany.getStaff(), profileStore.load()]);
    staff.value = list || [];
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);

const openAdd = () => {
  newName.value = '';
  newPhone.value = '';
  formErrors.value = {};
  dialogVisible.value = true;
};

const addStaff = async () => {
  const errors = {};
  if (!newName.value.trim()) errors.name = t('common.required');
  if (!isValidPhone(newPhone.value)) errors.phone = t('validation.phone');
  formErrors.value = errors;
  if (Object.keys(errors).length) return;

  saving.value = true;
  try {
    await SelfServiceCompany.addStaff({ name: newName.value.trim(), phone: normalizePhone(newPhone.value) });
    toast.add({ severity: 'success', summary: t('common.success'), detail: t('staff.added'), life: 4000 });
    dialogVisible.value = false;
    await loadData();
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('common.actionFailed')), life: 5000 });
  } finally {
    saving.value = false;
  }
};

const deactivate = (s) => {
  confirm.require({
    header: t('confirm.title'),
    message: t('staff.confirmDeactivate', { name: displayName(s) }),
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: t('staff.deactivate'), severity: 'danger' },
    rejectProps: { label: t('common.cancel'), outlined: true },
    accept: async () => {
      try {
        await SelfServiceCompany.deactivateStaff(s.id);
        toast.add({ severity: 'success', summary: t('common.success'), detail: t('staff.deactivated'), life: 3000 });
        await loadData();
      } catch (err) {
        toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('common.actionFailed')), life: 5000 });
      }
    },
  });
};

const reactivate = async (s) => {
  try {
    await SelfServiceCompany.reactivateStaff(s.id);
    toast.add({ severity: 'success', summary: t('common.success'), detail: t('staff.reactivated'), life: 3000 });
    await loadData();
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('common.actionFailed')), life: 5000 });
  }
};
</script>

<template>
  <div>
    <div class="page-header">
      <h2>{{ t('staff.title') }}</h2>
      <p>{{ t('staff.subtitle') }}</p>
    </div>

    <div v-if="company" class="ss-card mb-3">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 class="text-base font-bold" style="color:#1E293B">{{ company.name }}</h3>
          <p class="text-xs" style="color:#64748B">{{ t('fields.tin') }}: {{ company.tinNumber }}<template v-if="company.businessType"> | {{ company.businessType }}</template></p>
        </div>
        <Tag :value="t('staff.count', { active: activeCount, max: maxStaff })" :severity="activeCount < maxStaff ? 'info' : 'warn'" />
      </div>
    </div>

    <div v-if="!isAdmin && !loading" class="info-note mb-3"><i class="pi pi-info-circle"></i> {{ t('staff.adminOnly') }}</div>

    <div class="ss-card mb-3">
      <div class="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <span class="text-sm font-semibold" style="color:#475569">{{ t('staff.companyStaff') }}</span>
        <Button v-if="isAdmin" :label="t('staff.addStaff')" icon="pi pi-user-plus" size="small" class="trab-btn" :disabled="!canAdd" @click="openAdd" />
      </div>

      <div v-if="failed" class="state-box" role="alert">
        <p>{{ t('staff.loadFailed') }}</p>
        <Button :label="t('common.retry')" size="small" outlined @click="loadData" />
      </div>

      <DataTable v-else :value="staff" :loading="loading" data-key="id">
        <Column :header="t('common.sn')" style="width:3rem"><template #body="{ index }">{{ index + 1 }}</template></Column>
        <Column :header="t('fields.name')"><template #body="{ data }">{{ displayName(data) || t('common.dash') }}</template></Column>
        <Column :header="t('fields.phone')"><template #body="{ data }">{{ data.user?.phone || t('common.dash') }}</template></Column>
        <Column :header="t('fields.role')">
          <template #body="{ data }"><Tag :value="statusLabel(data.role)" :severity="data.role === 'ADMIN' ? 'success' : 'info'" /></template>
        </Column>
        <Column :header="t('common.status')">
          <template #body="{ data }"><Tag :value="statusLabel(data.isActive ? 'ACTIVE' : 'INACTIVE')" :severity="data.isActive ? 'success' : 'danger'" /></template>
        </Column>
        <Column v-if="isAdmin" :header="t('common.actions')" style="width:7rem">
          <template #body="{ data }">
            <Button v-if="data.isActive && data.role !== 'ADMIN'" icon="pi pi-ban" text rounded size="small" severity="danger" :aria-label="t('staff.deactivate')" v-tooltip.top="t('staff.deactivate')" @click="deactivate(data)" />
            <Button v-if="!data.isActive" icon="pi pi-refresh" text rounded size="small" severity="success" :aria-label="t('staff.reactivate')" v-tooltip.top="t('staff.reactivate')" @click="reactivate(data)" />
          </template>
        </Column>
        <template #empty><div class="text-center py-4" style="color:#94a3b8">{{ t('staff.empty') }}</div></template>
      </DataTable>
    </div>

    <Dialog v-model:visible="dialogVisible" :header="t('staff.addTitle')" modal :style="{ width: '420px' }" :breakpoints="{ '640px': '95vw' }">
      <form novalidate @submit.prevent="addStaff">
        <p class="hint mb-3">{{ t('staff.addHint') }}</p>
        <div class="mb-3">
          <label class="field-label" for="s-name">{{ t('auth.fullName') }} *</label>
          <InputText id="s-name" v-model="newName" class="w-full" :placeholder="t('staff.namePlaceholder')" :invalid="!!formErrors.name" />
          <small v-if="formErrors.name" class="field-error">{{ formErrors.name }}</small>
        </div>
        <div class="mb-1">
          <label class="field-label" for="s-phone">{{ t('auth.phoneLabel') }} *</label>
          <InputText id="s-phone" v-model="newPhone" class="w-full" placeholder="0712345678" inputmode="tel" maxlength="13" :invalid="!!formErrors.phone" />
          <small v-if="formErrors.phone" class="field-error">{{ formErrors.phone }}</small>
        </div>
      </form>
      <template #footer>
        <Button :label="t('common.cancel')" text @click="dialogVisible = false" />
        <Button :label="t('staff.addStaff')" icon="pi pi-check" class="trab-btn" :loading="saving" @click="addStaff" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.field-label { display: block; font-size: 0.78rem; font-weight: 600; color: #475569; margin-bottom: 0.3rem; }
.field-error { display: block; color: #dc2626; font-size: 0.74rem; margin-top: 0.2rem; }
.hint { font-size: 0.76rem; color: #94a3b8; line-height: 1.4; }
.info-note { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; border-radius: 10px; padding: 0.6rem 0.9rem; font-size: 0.82rem; }
.state-box { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 2rem 1rem; color: #94a3b8; font-size: 0.86rem; }
</style>
