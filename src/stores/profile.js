import { reactive, readonly } from 'vue';
import { SelfServiceProfile, SelfServiceNotifications } from '@/service/SelfServiceApi.js';
import { session } from '@/service/session.js';

// Small shared state for the signed-in user: profile (for the menu and
// profile page) and the unread-notification badge.
const state = reactive({
  profile: null,
  loading: false,
  unreadCount: 0,
});

let loadPromise = null;

export const profileStore = {
  state: readonly(state),

  get isCompanyAdmin() {
    return state.profile?.companyRole === 'ADMIN';
  },

  load(force = false) {
    if (state.profile && !force) return Promise.resolve(state.profile);
    if (!loadPromise) {
      state.loading = true;
      loadPromise = SelfServiceProfile.get()
        .then((profile) => {
          state.profile = profile;
          session.setUserName(`${profile.user.firstName || ''} ${profile.user.lastName || ''}`);
          return profile;
        })
        .finally(() => {
          state.loading = false;
          loadPromise = null;
        });
    }
    return loadPromise;
  },

  setProfile(profile) {
    state.profile = profile;
    session.setUserName(`${profile.user.firstName || ''} ${profile.user.lastName || ''}`);
  },

  async refreshUnread() {
    try {
      state.unreadCount = await SelfServiceNotifications.unreadCount();
    } catch { /* badge is best-effort */ }
  },

  setUnread(count) {
    state.unreadCount = Math.max(0, count);
  },

  reset() {
    state.profile = null;
    state.unreadCount = 0;
  },
};
