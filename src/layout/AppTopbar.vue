<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Drawer from 'primevue/drawer';
import Menu from 'primevue/menu';
import AuthService from '@/service/AuthService.js';
import { profileStore } from '@/stores/profile.js';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const drawerOpen = ref(false);
const userMenu = ref(null);

const navItems = computed(() => [
  { to: '/dashboard', icon: 'pi pi-home', label: t('nav.dashboard') },
  { to: '/appellants', icon: 'pi pi-users', label: t('nav.appellants') },
  { to: '/notices', icon: 'pi pi-file', label: t('nav.notices') },
  { to: '/appeals', icon: 'pi pi-briefcase', label: t('nav.appeals') },
  { to: '/applications', icon: 'pi pi-inbox', label: t('nav.applications') },
  { to: '/bills', icon: 'pi pi-wallet', label: t('nav.bills') },
  { to: '/summons', icon: 'pi pi-calendar', label: t('nav.hearings') },
  { to: '/decisions', icon: 'pi pi-verified', label: t('nav.decisions') },
]);

const userName = computed(() => {
  const user = profileStore.state.profile?.user;
  const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : AuthService.getUserName();
  return name || t('common.user');
});

const unread = computed(() => profileStore.state.unreadCount);
const unreadLabel = computed(() => (unread.value > 99 ? '99+' : String(unread.value)));

const logout = () => {
  AuthService.logout();
  router.push('/welcome');
};

const userMenuItems = computed(() => [
  { label: t('nav.profile'), icon: 'pi pi-user', command: () => router.push('/profile') },
  ...(profileStore.isCompanyAdmin ? [{ label: t('nav.staff'), icon: 'pi pi-users', command: () => router.push('/staff') }] : []),
  { separator: true },
  { label: t('common.signOut'), icon: 'pi pi-sign-out', command: logout },
]);

// Unread badge: refresh every minute while the tab is visible, and on navigation
let pollTimer = null;
const refreshBadge = () => {
  if (document.visibilityState === 'visible') profileStore.refreshUnread();
};

onMounted(() => {
  profileStore.load().catch(() => { /* profile page shows its own error */ });
  refreshBadge();
  pollTimer = setInterval(refreshBadge, 60000);
  document.addEventListener('visibilitychange', refreshBadge);
});

onBeforeUnmount(() => {
  clearInterval(pollTimer);
  document.removeEventListener('visibilitychange', refreshBadge);
});

watch(() => route.fullPath, () => {
  drawerOpen.value = false;
});
</script>

<template>
  <header class="topbar-wrap">
    <div class="layout-topbar">
      <button type="button" class="icon-btn menu-btn xl:hidden" :aria-label="t('nav.menu')" :aria-expanded="drawerOpen" @click="drawerOpen = true">
        <i class="pi pi-bars"></i>
      </button>

      <router-link to="/dashboard" class="brand">
        <img src="/coat-of-arms.svg" alt="" class="topbar-logo" />
        <div class="brand-text">
          <span class="topbar-name">{{ t('common.board') }}</span>
          <span class="topbar-badge">{{ t('common.portal') }}</span>
        </div>
      </router-link>

      <nav class="topbar-nav hidden xl:flex" :aria-label="t('nav.menu')">
        <router-link v-for="item in navItems" :key="item.to" :to="item.to" class="nav-link">
          <i :class="item.icon"></i> {{ item.label }}
        </router-link>
      </nav>

      <div class="topbar-end">
        <LanguageSwitcher class="hidden sm:inline-flex" />

        <router-link to="/notifications" class="icon-btn bell" :aria-label="t('nav.notifications')" v-tooltip.bottom="t('nav.notifications')">
          <i class="pi pi-bell"></i>
          <span v-if="unread > 0" class="badge">{{ unreadLabel }}</span>
        </router-link>

        <button type="button" class="user-chip" aria-haspopup="true" @click="userMenu.toggle($event)">
          <span class="user-avatar"><i class="pi pi-user"></i></span>
          <span class="user-name hidden md:inline">{{ userName }}</span>
          <i class="pi pi-angle-down hidden md:inline chevron"></i>
        </button>
        <Menu ref="userMenu" :model="userMenuItems" popup />
      </div>
    </div>
    <div class="accent-line"></div>

    <Drawer v-model:visible="drawerOpen" position="left" class="nav-drawer" :header="t('nav.menu')">
      <div class="drawer-user">
        <span class="user-avatar"><i class="pi pi-user"></i></span>
        <span class="drawer-name">{{ userName }}</span>
      </div>
      <nav class="drawer-nav">
        <router-link v-for="item in navItems" :key="item.to" :to="item.to" class="drawer-link">
          <i :class="item.icon"></i> {{ item.label }}
        </router-link>
        <router-link to="/notifications" class="drawer-link">
          <i class="pi pi-bell"></i> {{ t('nav.notifications') }}
          <span v-if="unread > 0" class="badge inline">{{ unreadLabel }}</span>
        </router-link>
        <router-link to="/profile" class="drawer-link"><i class="pi pi-id-card"></i> {{ t('nav.profile') }}</router-link>
        <router-link v-if="profileStore.isCompanyAdmin" to="/staff" class="drawer-link"><i class="pi pi-sitemap"></i> {{ t('nav.staff') }}</router-link>
      </nav>
      <div class="drawer-footer">
        <span class="drawer-label">{{ t('common.language') }}</span>
        <LanguageSwitcher variant="full" />
        <button type="button" class="drawer-signout" @click="logout"><i class="pi pi-sign-out"></i> {{ t('common.signOut') }}</button>
      </div>
    </Drawer>
  </header>
</template>

<style scoped>
.topbar-wrap { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; }
.layout-topbar {
  height: 3.75rem;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1.25rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  font-family: 'Poppins', sans-serif;
}
.brand { display: flex; align-items: center; gap: 0.6rem; text-decoration: none; min-width: 0; }
.brand-text { min-width: 0; }
.topbar-logo { height: 36px; flex-shrink: 0; }
.topbar-name { display: block; font-size: 0.82rem; font-weight: 700; color: #1E293B; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.topbar-badge { display: block; font-size: 0.58rem; font-weight: 600; color: var(--trab-primary); text-transform: uppercase; letter-spacing: 0.06em; }
.accent-line { height: 3px; background: linear-gradient(90deg, var(--trab-primary), var(--trab-accent)); }

.topbar-nav { margin-left: 1.25rem; gap: 0.15rem; align-items: center; }
.nav-link {
  display: flex; align-items: center; gap: 0.35rem;
  padding: 0.45rem 0.7rem;
  font-size: 0.78rem; font-weight: 500; color: #64748B;
  text-decoration: none; border-radius: 8px; white-space: nowrap;
  transition: color 0.15s, background 0.15s;
}
.nav-link:hover { color: var(--trab-primary); background: rgba(27,107,61,0.05); }
.nav-link.router-link-active { color: #fff; background: var(--trab-primary); font-weight: 600; }
.nav-link .pi { font-size: 0.82rem; }

.topbar-end { display: flex; align-items: center; gap: 0.6rem; margin-left: auto; }
.icon-btn {
  position: relative;
  width: 2.2rem; height: 2.2rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; text-decoration: none; flex-shrink: 0;
}
.icon-btn:hover { color: var(--trab-primary); border-color: var(--trab-primary); }
.badge {
  position: absolute; top: -6px; right: -6px;
  min-width: 1.15rem; height: 1.15rem; padding: 0 0.3rem;
  border-radius: 999px; background: #EF4444; color: #fff;
  font-size: 0.62rem; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center;
}
.badge.inline { position: static; margin-left: auto; }

.user-chip {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.25rem 0.6rem 0.25rem 0.25rem;
  background: #f8faf9; border-radius: 20px; border: 1px solid #e2e8f0;
  cursor: pointer; font-family: inherit;
}
.user-avatar {
  width: 1.75rem; height: 1.75rem; border-radius: 50%;
  background: var(--trab-primary); color: #fff;
  display: inline-flex; align-items: center; justify-content: center; font-size: 0.7rem; flex-shrink: 0;
}
.user-name { font-size: 0.78rem; font-weight: 500; color: #475569; max-width: 10rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chevron { font-size: 0.7rem; color: #94a3b8; }

.drawer-user { display: flex; align-items: center; gap: 0.6rem; padding: 0 0 1rem; border-bottom: 1px solid #f1f5f9; margin-bottom: 0.5rem; }
.drawer-name { font-weight: 600; font-size: 0.88rem; color: #1E293B; }
.drawer-nav { display: flex; flex-direction: column; gap: 0.15rem; }
.drawer-link {
  display: flex; align-items: center; gap: 0.7rem;
  padding: 0.7rem 0.75rem; border-radius: 8px;
  color: #334155; text-decoration: none; font-size: 0.88rem;
}
.drawer-link.router-link-active { background: var(--trab-primary); color: #fff; }
.drawer-footer { margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 0.6rem; align-items: flex-start; }
.drawer-label { font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
.drawer-signout {
  margin-top: 0.5rem; background: none; border: 1px solid #fecaca; color: #dc2626;
  border-radius: 8px; padding: 0.55rem 0.9rem; font-size: 0.85rem; cursor: pointer; font-family: inherit;
  display: inline-flex; align-items: center; gap: 0.5rem;
}

@media (max-width: 480px) {
  .layout-topbar { padding: 0 0.6rem; }
  .brand-text { display: none; }
}
</style>
