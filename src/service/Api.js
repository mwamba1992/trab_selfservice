import axios from 'axios';
import { Config } from '@/utils/Config.js';
import { session, isTokenExpired } from './session.js';
import { getStoredLocale } from '@/i18n/locale.js';

const api = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: 15000,
});

// Separate client so the refresh call never goes through the interceptors below.
export const authClient = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: 15000,
});

let onSessionExpired = () => { window.location.href = '/welcome?expired=1'; };

/** The router registers a handler that keeps the user's place (see main.js). */
export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

let refreshInFlight = null;

/**
 * Exchanges the refresh token for new tokens. Concurrent callers share one
 * request, so a page firing several calls at once refreshes only once.
 */
export function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = session.getRefreshToken();
      if (!refreshToken || isTokenExpired(refreshToken)) throw new Error('No usable refresh token');
      const res = await authClient.post('/auth/refresh', { refreshToken });
      const data = res.data?.data;
      if (!data?.accessToken) throw new Error('Token refresh failed');
      session.setTokens(data);
      return data.accessToken;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function expireSession() {
  session.clear();
  onSessionExpired();
}

api.interceptors.request.use(async (config) => {
  let token = session.getAccessToken();
  // Refresh shortly before expiry instead of waiting for a 401
  if (token && isTokenExpired(token, 30) && session.getRefreshToken()) {
    try {
      token = await refreshAccessToken();
    } catch {
      /* the 401 handler below decides what happens */
    }
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['Accept-Language'] = getStoredLocale();
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    // Only authenticated requests can be recovered — a 401 during sign-in is a
    // normal error for the caller to show.
    if (response?.status !== 401 || !config || !session.getAccessToken()) {
      return Promise.reject(error);
    }
    if (config._retried) {
      expireSession();
      return Promise.reject(error);
    }
    config._retried = true;
    try {
      const token = await refreshAccessToken();
      config.headers.Authorization = `Bearer ${token}`;
      return api(config);
    } catch {
      expireSession();
      return Promise.reject(error);
    }
  },
);

export default api;
