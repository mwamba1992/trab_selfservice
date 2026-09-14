import { createRouter, createWebHistory } from 'vue-router';
import { session } from '@/service/session.js';

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
      { path: 'appeals/file', name: 'FileAppeal', component: () => import('@/views/FileAppeal.vue') },
      { path: 'applications', name: 'MyApplications', component: () => import('@/views/MyApplications.vue') },
      { path: 'applications/new', name: 'FileApplication', component: () => import('@/views/FileApplication.vue') },
      { path: 'bills', name: 'MyBills', component: () => import('@/views/MyBills.vue') },
      { path: 'summons', name: 'MySummons', component: () => import('@/views/MySummons.vue') },
      { path: 'decisions', name: 'MyDecisions', component: () => import('@/views/MyDecisions.vue') },
      { path: 'notifications', name: 'Notifications', component: () => import('@/views/Notifications.vue') },
      { path: 'profile', name: 'Profile', component: () => import('@/views/Profile.vue') },
      { path: 'staff', name: 'StaffManagement', component: () => import('@/views/StaffManagement.vue') },
    ],
  },
  { path: '/welcome', name: 'Landing', component: () => import('@/views/pages/auth/Landing.vue') },
  { path: '/login', redirect: '/welcome' },
  { path: '/register', redirect: '/welcome' },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/pages/auth/NotFound.vue') },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

/** Only same-app paths are accepted as a post-login redirect (no open redirects). */
export function safeRedirect(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/welcome')
    ? value
    : '/dashboard';
}

router.beforeEach((to) => {
  const signedIn = session.isActive();
  if (to.matched.some((r) => r.meta.requiresAuth) && !signedIn) {
    return { name: 'Landing', query: to.fullPath === '/' || to.fullPath === '/dashboard' ? {} : { redirect: to.fullPath } };
  }
  if (to.name === 'Landing' && signedIn) {
    return safeRedirect(to.query.redirect);
  }
  return true;
});

export default router;
