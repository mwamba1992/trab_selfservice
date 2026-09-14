import api from './Api.js';
import { session } from './session.js';
import { clearDrafts } from '@/composables/useDraft.js';
import { profileStore } from '@/stores/profile.js';

const data = (res) => res.data.data;

export default {
  async requestOtp(phone) {
    return data(await api.post('/auth/otp/request', { phone }));
  },

  async verifyOtp(phone, otp) {
    const result = data(await api.post('/auth/otp/verify', { phone, otp }));
    session.start(result);
    return result.user;
  },

  async lookupTin(tin) {
    const res = await api.get(`/auth/tin-lookup/${encodeURIComponent(tin)}`);
    return res.data;
  },

  async registerCompany(payload) {
    return data(await api.post('/auth/company/register', payload));
  },

  async verifyCompany(payload) {
    const result = data(await api.post('/auth/company/verify', payload));
    session.start(result);
    return result;
  },

  /** Explicit sign-out also discards unfinished drafts on this device. */
  logout() {
    clearDrafts();
    session.clear();
    profileStore.reset();
  },

  isAuthenticated() {
    return session.isActive();
  },

  getUserName() {
    return session.getUserName();
  },
};
