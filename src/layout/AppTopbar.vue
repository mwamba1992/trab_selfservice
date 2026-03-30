<script setup>
import { useRouter } from 'vue-router';
import AuthService from '@/service/AuthService.js';

const router = useRouter();
const userName = AuthService.getUserName();

const logout = () => { AuthService.logout(); };
const goTo = (path) => { router.push(path); };
</script>

<template>
  <div class="topbar-wrap">
    <div class="layout-topbar">
      <div class="flex items-center gap-3 cursor-pointer" @click="goTo('/dashboard')">
        <img src="/coat-of-arms.svg" alt="" class="topbar-logo" />
        <div>
          <span class="topbar-name">Tax Revenue Appeals Board</span>
          <span class="topbar-badge">Self Service Portal</span>
        </div>
      </div>

      <nav class="topbar-nav hidden lg:flex">
        <router-link to="/dashboard" class="nav-link"><i class="pi pi-home"></i> Dashboard</router-link>
        <router-link to="/appellants" class="nav-link"><i class="pi pi-users"></i> My Appellants</router-link>
        <router-link to="/notices" class="nav-link"><i class="pi pi-file"></i> My Notices</router-link>
        <router-link to="/appeals" class="nav-link"><i class="pi pi-briefcase"></i> My Appeals</router-link>
        <router-link to="/bills" class="nav-link"><i class="pi pi-wallet"></i> My Bills</router-link>
      </nav>

      <div class="topbar-end">
        <div class="user-chip">
          <div class="user-avatar"><i class="pi pi-user"></i></div>
          <span class="user-name hidden md:inline">{{ userName }}</span>
        </div>
        <button class="logout-btn" @click="logout" title="Sign out">
          <i class="pi pi-sign-out"></i>
        </button>
      </div>
    </div>
    <div class="accent-line"></div>
  </div>
</template>

<style scoped>
.topbar-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}
.layout-topbar {
  height: 3.75rem;
  background: #fff;
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  font-family: 'Poppins', sans-serif;
}
.topbar-logo { height: 36px; }
.topbar-name {
  display: block;
  font-size: 0.82rem;
  font-weight: 700;
  color: #1E293B;
  line-height: 1.1;
}
.topbar-badge {
  display: block;
  font-size: 0.58rem;
  font-weight: 600;
  color: var(--trab-primary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.accent-line {
  height: 3px;
  background: linear-gradient(90deg, var(--trab-primary), var(--trab-accent));
}

.topbar-nav {
  margin-left: 2rem;
  gap: 0.25rem;
  align-items: center;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.85rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: #64748B;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.15s;
  font-family: 'Poppins', sans-serif;
}
.nav-link:hover {
  color: var(--trab-primary);
  background: rgba(27,107,61,0.05);
}
.nav-link.router-link-active {
  color: #fff;
  background: var(--trab-primary);
  font-weight: 600;
}
.nav-link .pi { font-size: 0.85rem; }

.topbar-end {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
}
.user-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.75rem 0.3rem 0.3rem;
  background: #f8faf9;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
}
.user-avatar {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: var(--trab-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
}
.user-name {
  font-size: 0.78rem;
  font-weight: 500;
  color: #475569;
}
.logout-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  background: none;
  border: 1px solid #e2e8f0;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  transition: all 0.15s;
}
.logout-btn:hover { color: #EF4444; border-color: #EF4444; }
</style>
