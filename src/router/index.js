import { createRouter, createWebHistory } from 'vue-router';
import AuthService from '@/service/AuthService.js';

const routes = [
  {
    path: '/',
    component: () => import('@/layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/Dashboard.vue') },
      { path: 'appellants', name: 'MyAppellants', component: () => import('@/views/MyAppellants.vue') },
      { path: 'notices', name: 'MyNotices', component: () => import('@/views/MyNotices.vue') },
      { path: 'notices/new', name: 'FileNotice', component: () => import('@/views/FileNotice.vue') },
      { path: 'appeals', name: 'MyAppeals', component: () => import('@/views/MyAppeals.vue') },
      { path: 'bills', name: 'MyBills', component: () => import('@/views/MyBills.vue') },
    ],
  },
  { path: '/welcome', name: 'Landing', component: () => import('@/views/pages/auth/Landing.vue') },
  { path: '/login', redirect: '/welcome' },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/pages/auth/NotFound.vue') },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !AuthService.isAuthenticated()) {
    next({ path: '/welcome' });
  } else if ((to.path === '/login' || to.path === '/welcome') && AuthService.isAuthenticated()) {
    next('/dashboard');
  } else {
    next();
  }
});

export default router;
