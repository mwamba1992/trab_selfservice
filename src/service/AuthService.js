import api from './Api.js';
import { AUDIENCES, session } from './session.js';
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

  /**
   * Step one of signing in: the password. A portal account is then sent a code
   * and finishes at completeLogin; the TRA desk signs in on the password
   * alone, so one form serves both and the desk comes from the answer, not
   * from the form used.
   */
  async startLogin(email, password) {
    try {
      const challenge = data(
        await api.post('/auth/portal/login', { email, password }),
      );
      return { desk: 'portal', ...challenge };
    } catch (err) {
      const message = err?.response?.data?.message ?? '';
      if (!/portal login only/i.test(String(message))) throw err;
      const result = data(await api.post('/auth/tra/login', { email, password }));
      session.start(result, result.user.userType || AUDIENCES.TRA);
      return { desk: 'tra', user: result.user };
    }
  },

  /** Step two: the code sent to the phone on the account. */
  async completeLogin(challenge, otp) {
    const result = data(await api.post('/auth/portal/verify', { challenge, otp }));
    session.start(result);
    return result.user;
  },

  /** A new portal account: who you are, and how you will sign in. */
  async register({ certificate, ...fields }) {
    const form = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') form.append(key, value);
    });
    if (certificate) form.append('certificate', certificate);
    return data(
      await api.post('/auth/portal/register', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
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

  /** The desk this session belongs to, so the shell knows which portal to show. */
  audience() {
    return session.getUserType();
  },

  isTra() {
    return session.isTra();
  },

  /** TRA permission check ('TRA Manage Users', 'TRA File Reply', …). */
  can(permission) {
    return session.getPermissions().includes(permission);
  },
};
