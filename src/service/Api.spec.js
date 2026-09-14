import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AxiosError } from 'axios';
import api, { authClient, setSessionExpiredHandler } from './Api.js';
import { session } from './session.js';
import { makeToken } from '@/test/tokens.js';

const ok = (config, data = {}) => ({ data, status: 200, statusText: 'OK', headers: {}, config });
const unauthorized = (config) =>
  new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, { data: {}, status: 401, statusText: 'Unauthorized', headers: {}, config });

describe('Api session handling', () => {
  let expired;

  beforeEach(() => {
    localStorage.clear();
    expired = vi.fn();
    setSessionExpiredHandler(expired);
  });

  it('refreshes once for concurrent 401s and retries each request with the new token', async () => {
    const oldToken = makeToken(600);
    const newToken = makeToken(900, { v: 2 });
    session.setTokens({ accessToken: oldToken, refreshToken: makeToken(3600) });

    const refresh = vi.fn(async (config) => ok(config, { data: { accessToken: newToken, refreshToken: makeToken(7200) } }));
    authClient.defaults.adapter = refresh;
    api.defaults.adapter = async (config) => {
      if (config.headers.Authorization === `Bearer ${oldToken}`) throw unauthorized(config);
      return ok(config, { url: config.url });
    };

    const [a, b] = await Promise.all([api.get('/one'), api.get('/two')]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(a.data.url).toBe('/one');
    expect(b.data.url).toBe('/two');
    expect(session.getAccessToken()).toBe(newToken);
    expect(expired).not.toHaveBeenCalled();
  });

  it('ends the session when the refresh fails', async () => {
    session.setTokens({ accessToken: makeToken(600), refreshToken: makeToken(3600) });
    authClient.defaults.adapter = async (config) => { throw unauthorized(config); };
    api.defaults.adapter = async (config) => { throw unauthorized(config); };

    await expect(api.get('/secure')).rejects.toBeInstanceOf(AxiosError);
    expect(expired).toHaveBeenCalledTimes(1);
    expect(session.getAccessToken()).toBeNull();
  });

  it('leaves a 401 without a session (e.g. a failed sign-in) to the caller', async () => {
    const refresh = vi.fn();
    authClient.defaults.adapter = refresh;
    api.defaults.adapter = async (config) => { throw unauthorized(config); };

    await expect(api.post('/auth/otp/verify', {})).rejects.toBeInstanceOf(AxiosError);
    expect(refresh).not.toHaveBeenCalled();
    expect(expired).not.toHaveBeenCalled();
  });

  it('refreshes before sending when the access token is about to expire', async () => {
    const newToken = makeToken(900, { v: 3 });
    session.setTokens({ accessToken: makeToken(10), refreshToken: makeToken(3600) });
    authClient.defaults.adapter = async (config) => ok(config, { data: { accessToken: newToken } });
    const seen = [];
    api.defaults.adapter = async (config) => {
      seen.push(config.headers.Authorization);
      return ok(config);
    };

    await api.get('/profile');

    expect(seen).toEqual([`Bearer ${newToken}`]);
  });

  it('sends the chosen language', async () => {
    localStorage.setItem('locale', 'sw');
    let language;
    api.defaults.adapter = async (config) => {
      language = config.headers['Accept-Language'];
      return ok(config);
    };
    await api.get('/self-service/tax-types');
    expect(language).toBe('sw');
  });
});
