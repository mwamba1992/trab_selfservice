// Single owner of the auth tokens and cached user details in localStorage.
const KEYS = {
  access: 'access_token',
  refresh: 'refresh_token',
  userId: 'userId',
  userName: 'userName',
  userPhone: 'userPhone',
  userType: 'userType',
  permissions: 'permissions',
  role: 'userRole',
  companyId: 'companyId',
  companyName: 'companyName',
};

/** The two audiences of the portal: the appellant side and the TRA desk. */
export const AUDIENCES = { APPELLANT: 'APPELLANT', TRA: 'TRA' };

const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key, value) => {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode) — session lives for this page only */
  }
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

  /** Which desk this session belongs to. Appellant unless a TRA officer signed in. */
  getUserType: () => read(KEYS.userType) || AUDIENCES.APPELLANT,
  isTra() {
    return this.getUserType() === AUDIENCES.TRA;
  },

  /** TRA permissions from the login response; empty for appellants. */
  getPermissions() {
    try {
      return JSON.parse(read(KEYS.permissions) || '[]');
    } catch {
      return [];
    }
  },

  setTokens({ accessToken, refreshToken }) {
    write(KEYS.access, accessToken);
    if (refreshToken) write(KEYS.refresh, refreshToken);
  },

  /** Stores the result of a successful sign-in or registration. */
  start({ accessToken, refreshToken, user, company }, userType = AUDIENCES.APPELLANT) {
    this.setTokens({ accessToken, refreshToken });
    write(KEYS.userType, userType);
    write(KEYS.permissions, JSON.stringify(user.permissions || []));
    write(KEYS.role, user.role || '');
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

  setRole(role) {
    write(KEYS.role, role || '');
  },
  getRole: () => read(KEYS.role) || '',

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
