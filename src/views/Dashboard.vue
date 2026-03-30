<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AuthService from '@/service/AuthService.js';
import { SelfServiceDashboard } from '@/service/SelfServiceApi.js';

const router = useRouter();
const userName = AuthService.getUserName();

const stats = ref({ notices: 0, appeals: 0, bills: 0, pending: 0 });

onMounted(async () => {
  try { stats.value = await SelfServiceDashboard.getStats(); } catch {}
});

const actions = [
  { label: 'My Appellants', icon: 'pi pi-users', to: '/appellants', color: '#1B6B3D', bg: 'rgba(27,107,61,0.08)', desc: 'Manage companies you represent' },
  { label: 'File a Notice', icon: 'pi pi-file-plus', to: '/notices/new', color: '#D4AF37', bg: 'rgba(212,175,55,0.08)', desc: 'Start a new Notice of Appeal' },
  { label: 'My Notices', icon: 'pi pi-file', to: '/notices', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', desc: 'View and track your filed notices' },
  { label: 'My Appeals', icon: 'pi pi-briefcase', to: '/appeals', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', desc: 'Monitor your appeal cases' },
  { label: 'My Bills', icon: 'pi pi-wallet', to: '/bills', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', desc: 'View bills and payment status' },
];
</script>

<template>
  <div>
    <div class="page-header">
      <h2>Welcome back, {{ userName || 'User' }}</h2>
      <p>What would you like to do today?</p>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <div class="kpi-card">
        <div class="kpi-top">
          <div>
            <p class="kpi-value">{{ stats.notices }}</p>
            <p class="kpi-label">Notices Filed</p>
          </div>
          <div class="kpi-icon" style="background:rgba(27,107,61,0.08);color:#1B6B3D"><i class="pi pi-file"></i></div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top">
          <div>
            <p class="kpi-value">{{ stats.appeals }}</p>
            <p class="kpi-label">Appeals</p>
          </div>
          <div class="kpi-icon" style="background:rgba(59,130,246,0.08);color:#3B82F6"><i class="pi pi-briefcase"></i></div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top">
          <div>
            <p class="kpi-value">{{ stats.bills }}</p>
            <p class="kpi-label">Total Bills</p>
          </div>
          <div class="kpi-icon" style="background:rgba(139,92,246,0.08);color:#8B5CF6"><i class="pi pi-wallet"></i></div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top">
          <div>
            <p class="kpi-value" style="color:#F59E0B">{{ stats.pending }}</p>
            <p class="kpi-label">Pending Payment</p>
          </div>
          <div class="kpi-icon" style="background:rgba(245,158,11,0.08);color:#F59E0B"><i class="pi pi-clock"></i></div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <h3 class="text-sm font-semibold mb-3" style="color:#475569">Quick Actions</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div v-for="a in actions" :key="a.label" class="action-card" @click="router.push(a.to)">
        <div class="action-icon" :style="{background: a.bg, color: a.color}">
          <i :class="a.icon"></i>
        </div>
        <div class="flex-1">
          <h4 class="action-title">{{ a.label }}</h4>
          <p class="action-desc">{{ a.desc }}</p>
        </div>
        <i class="pi pi-chevron-right" style="color:#cbd5e1;font-size:0.85rem"></i>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kpi-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  padding: 1.25rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}
.kpi-top { display: flex; justify-content: space-between; align-items: flex-start; }
.kpi-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--trab-primary);
  line-height: 1;
  font-family: 'Poppins', sans-serif;
}
.kpi-label {
  font-size: 0.75rem;
  color: #64748B;
  margin-top: 0.4rem;
  font-family: 'Poppins', sans-serif;
}
.kpi-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.action-card {
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 12px;
  padding: 1.15rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
}
.action-card:hover {
  border-color: var(--trab-primary);
  box-shadow: 0 3px 12px rgba(27,107,61,0.06);
  transform: translateY(-1px);
}
.action-icon {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  flex-shrink: 0;
}
.action-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: #1E293B;
  margin: 0;
  font-family: 'Poppins', sans-serif;
}
.action-desc {
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 0.15rem 0 0;
}
</style>
