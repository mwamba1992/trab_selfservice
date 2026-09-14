<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import AuthService from '@/service/AuthService.js';
import { SelfServiceDashboard } from '@/service/SelfServiceApi.js';
import { profileStore } from '@/stores/profile.js';

const { t } = useI18n();
const router = useRouter();

const stats = ref({ notices: 0, appeals: 0, applications: 0, bills: 0, pending: 0, unreadNotifications: 0 });
const loading = ref(true);
const failed = ref(false);

const userName = computed(() => {
  const user = profileStore.state.profile?.user;
  return (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : AuthService.getUserName()) || t('common.user');
});

const load = async () => {
  loading.value = true;
  failed.value = false;
  try {
    stats.value = await SelfServiceDashboard.getStats();
    profileStore.setUnread(stats.value.unreadNotifications || 0);
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const kpis = computed(() => [
  { key: 'notices', label: t('dashboard.noticesFiled'), value: stats.value.notices, icon: 'pi pi-file', color: '#1B6B3D', bg: 'rgba(27,107,61,0.08)', to: '/notices' },
  { key: 'appeals', label: t('dashboard.appeals'), value: stats.value.appeals, icon: 'pi pi-briefcase', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', to: '/appeals' },
  { key: 'applications', label: t('dashboard.applications'), value: stats.value.applications, icon: 'pi pi-inbox', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', to: '/applications' },
  { key: 'pending', label: t('dashboard.pendingPayment'), value: stats.value.pending, icon: 'pi pi-clock', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', to: '/bills' },
]);

const actions = computed(() => [
  { key: 'appellants', icon: 'pi pi-users', to: '/appellants', color: '#1B6B3D', bg: 'rgba(27,107,61,0.08)' },
  { key: 'fileNotice', icon: 'pi pi-file-plus', to: '/notices/new', color: '#B8860B', bg: 'rgba(212,175,55,0.1)' },
  { key: 'notices', icon: 'pi pi-file', to: '/notices', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  { key: 'appeals', icon: 'pi pi-briefcase', to: '/appeals', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  { key: 'applications', icon: 'pi pi-inbox', to: '/applications', color: '#0EA5E9', bg: 'rgba(14,165,233,0.08)' },
  { key: 'bills', icon: 'pi pi-wallet', to: '/bills', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
].map((a) => ({ ...a, label: t(`dashboard.actions.${a.key}.label`), desc: t(`dashboard.actions.${a.key}.desc`) })));
</script>

<template>
  <div>
    <div class="page-header">
      <h2>{{ t('dashboard.welcome', { name: userName }) }}</h2>
      <p>{{ t('dashboard.subtitle') }}</p>
    </div>

    <div v-if="failed" class="load-error" role="alert">
      <i class="pi pi-exclamation-triangle"></i>
      <span class="flex-1">{{ t('common.loadFailed') }}</span>
      <Button :label="t('common.retry')" size="small" outlined @click="load" />
    </div>

    <router-link v-if="stats.unreadNotifications > 0" to="/notifications" class="unread-banner">
      <i class="pi pi-bell"></i>
      <span class="flex-1">{{ t('dashboard.unread', { count: stats.unreadNotifications }) }}</span>
      <i class="pi pi-chevron-right"></i>
    </router-link>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <router-link v-for="k in kpis" :key="k.key" :to="k.to" class="kpi-card">
        <div class="kpi-top">
          <div>
            <p class="kpi-value" :style="{ color: k.key === 'pending' ? k.color : undefined }">
              <i v-if="loading" class="pi pi-spin pi-spinner kpi-spinner"></i>
              <template v-else>{{ k.value }}</template>
            </p>
            <p class="kpi-label">{{ k.label }}</p>
          </div>
          <div class="kpi-icon" :style="{ background: k.bg, color: k.color }"><i :class="k.icon"></i></div>
        </div>
      </router-link>
    </div>

    <h3 class="text-sm font-semibold mb-3" style="color:#475569">{{ t('dashboard.quickActions') }}</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <button v-for="a in actions" :key="a.key" type="button" class="action-card" @click="router.push(a.to)">
        <span class="action-icon" :style="{ background: a.bg, color: a.color }"><i :class="a.icon"></i></span>
        <span class="flex-1 text-left">
          <span class="action-title">{{ a.label }}</span>
          <span class="action-desc">{{ a.desc }}</span>
        </span>
        <i class="pi pi-chevron-right" style="color:#cbd5e1;font-size:0.85rem"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.load-error {
  display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;
  background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c;
  border-radius: 10px; padding: 0.6rem 0.9rem; font-size: 0.84rem; margin-bottom: 1rem;
}
.unread-banner {
  display: flex; align-items: center; gap: 0.6rem;
  background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8;
  border-radius: 10px; padding: 0.65rem 0.9rem; font-size: 0.84rem; margin-bottom: 1rem; text-decoration: none;
}
.kpi-card {
  display: block; text-decoration: none;
  background: #fff; border-radius: 12px; border: 1px solid #f1f5f9;
  padding: 1.1rem; box-shadow: 0 1px 4px rgba(0,0,0,0.03);
  transition: border-color 0.2s;
}
.kpi-card:hover { border-color: var(--trab-primary); }
.kpi-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
.kpi-value { font-size: 1.6rem; font-weight: 700; color: var(--trab-primary); line-height: 1; margin: 0; }
.kpi-spinner { font-size: 1.1rem; color: #cbd5e1; }
.kpi-label { font-size: 0.75rem; color: #64748B; margin: 0.4rem 0 0; }
.kpi-icon { width: 2.5rem; height: 2.5rem; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }

.action-card {
  width: 100%;
  background: #fff; border: 1px solid #f1f5f9; border-radius: 12px;
  padding: 1.1rem 1.25rem; display: flex; align-items: center; gap: 1rem;
  cursor: pointer; font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
}
.action-card:hover, .action-card:focus-visible { border-color: var(--trab-primary); box-shadow: 0 3px 12px rgba(27,107,61,0.06); transform: translateY(-1px); }
.action-icon { width: 2.75rem; height: 2.75rem; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.15rem; flex-shrink: 0; }
.action-title { display: block; font-size: 0.88rem; font-weight: 600; color: #1E293B; }
.action-desc { display: block; font-size: 0.75rem; color: #94a3b8; margin-top: 0.15rem; }

@media (max-width: 480px) {
  .kpi-value { font-size: 1.3rem; }
  .kpi-icon { display: none; }
}
</style>
