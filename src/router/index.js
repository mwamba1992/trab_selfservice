import { createRouter, createWebHistory } from 'vue-router';
import { AUDIENCES, session } from '@/service/session.js';

// One portal, two desks. `audience` says who a route belongs to; the guard
// below keeps each desk on its own side and out of the other's pages.
const routes = [
  {
    path: '/',
    component: () => import('@/layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: () => (session.isTra() ? '/tra/dashboard' : '/dashboard') },
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

      // ─── TRA desk ───
      {
        path: 'tra/dashboard',
        name: 'TraDashboard',
        component: () => import('@/views/tra/TraDashboard.vue'),
        meta: { audience: AUDIENCES.TRA },
      },
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

/** Where a desk lands after signing in, and where it is sent back to. */
export const homeFor = (userType) => (userType === AUDIENCES.TRA ? '/tra/dashboard' : '/dashboard');

/** Only same-app paths are accepted as a post-login redirect (no open redirects). */
export function safeRedirect(value, userType = AUDIENCES.APPELLANT) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/welcome')
    ? value
    : homeFor(userType);
}

/** True when this desk may open the route: unmarked routes belong to the appellant side. */
export function allowedAudience(routeAudience, userType) {
  return (routeAudience || AUDIENCES.APPELLANT) === userType;
}

router.beforeEach((to) => {
  const signedIn = session.isActive();
  const userType = session.getUserType();

  if (to.matched.some((r) => r.meta.requiresAuth) && !signedIn) {
    return { name: 'Landing', query: to.fullPath === '/' || to.fullPath === '/dashboard' ? {} : { redirect: to.fullPath } };
  }
  if (to.name === 'Landing' && signedIn) {
    return safeRedirect(to.query.redirect, userType);
  }
  // Signed in on the wrong desk: send the officer or appellant to their own home.
  if (signedIn && to.matched.some((r) => r.meta.requiresAuth) && !allowedAudience(to.meta.audience, userType)) {
    return homeFor(userType);
  }
  return true;
});

export default router;
