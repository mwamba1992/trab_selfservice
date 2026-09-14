// Single owner of the auth tokens and cached user details in localStorage.
const KEYS = {
  access: 'access_token',
  refresh: 'refresh_token',
  userId: 'userId',
  userName: 'userName',
  userPhone: 'userPhone',
  companyId: 'companyId',
  companyName: 'companyName',
};

const read = (key) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const write = (key, value) => {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* storage unavailable (private mode) — session lives for this page only */ }
};

export function decodeToken(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

/** True when the token is missing, malformed, or expires within `skewSeconds`. */
export function isTokenExpired(token, skewSeconds = 0) {
  const payload = token ? decodeToken(token) : null;
  if (!payload?.exp) return true;
  return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
}

export const session = {
  getAccessToken: () => read(KEYS.access),
  getRefreshToken: () => read(KEYS.refresh),
  getUserId: () => read(KEYS.userId),
  getUserName: () => read(KEYS.userName) || '',
  getUserPhone: () => read(KEYS.userPhone) || '',

  setTokens({ accessToken, refreshToken }) {
    write(KEYS.access, accessToken);
    if (refreshToken) write(KEYS.refresh, refreshToken);
  },

  /** Stores the result of a successful sign-in or registration. */
  start({ accessToken, refreshToken, user, company }) {
    this.setTokens({ accessToken, refreshToken });
    write(KEYS.userId, user.id);
    this.setUserName(`${user.firstName || ''} ${user.lastName || ''}`);
    write(KEYS.userPhone, user.phone || '');
    if (company) {
      write(KEYS.companyId, company.id);
      write(KEYS.companyName, company.name);
    }
  },

  setUserName(name) {
    write(KEYS.userName, name.trim());
  },

  clear() {
    Object.values(KEYS).forEach((key) => write(key, null));
  },

  /** A session is usable while either token can still authenticate a request. */
  isActive() {
    const refresh = read(KEYS.refresh);
    if (refresh && !isTokenExpired(refresh)) return true;
    const access = read(KEYS.access);
    return !!access && !isTokenExpired(access);
  },
};
