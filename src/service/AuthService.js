import api from './Api.js';

export default {
  async requestOtp(phone) {
    const res = await api.post('/auth/otp/request', { phone });
    return res.data.data;
  },

  async verifyOtp(phone, otp) {
    const res = await api.post('/auth/otp/verify', { phone, otp });
    const { accessToken, refreshToken, user } = res.data.data;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('userId', user.id);
    localStorage.setItem('userName', `${user.firstName} ${user.lastName}`);
    localStorage.setItem('userPhone', user.phone);
    return user;
  },

  logout() {
    localStorage.clear();
    window.location.href = '/login';
  },

  isAuthenticated() {
    const token = localStorage.getItem('access_token');
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // expired if exp (seconds) is in the past
      if (payload.exp * 1000 < Date.now()) {
        localStorage.clear();
        return false;
      }
      return true;
    } catch {
      localStorage.clear();
      return false;
    }
  },

  getUserName() {
    return localStorage.getItem('userName') || '';
  },

  getUserPhone() {
    return localStorage.getItem('userPhone') || '';
  },

  async getProfile() {
    const res = await api.get('/auth/me');
    return res.data.data;
  },
};
