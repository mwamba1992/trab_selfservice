import { describe, it, expect, beforeEach } from 'vitest';
import { session, isTokenExpired, decodeToken } from './session.js';
import { makeToken } from '@/test/tokens.js';

describe('session', () => {
  beforeEach(() => localStorage.clear());

  it('decodes and checks token expiry', () => {
    expect(decodeToken(makeToken(60)).sub).toBe('user-1');
    expect(decodeToken('garbage')).toBeNull();
    expect(isTokenExpired(makeToken(60))).toBe(false);
    expect(isTokenExpired(makeToken(-1))).toBe(true);
    expect(isTokenExpired(makeToken(20), 30)).toBe(true);
    expect(isTokenExpired(null)).toBe(true);
  });

  it('stores a sign-in and clears only auth keys', () => {
    localStorage.setItem('locale', 'sw');
    session.start({
      accessToken: makeToken(60),
      refreshToken: makeToken(3600),
      user: { id: 'u1', firstName: 'Asha', lastName: 'Juma', phone: '0712345678' },
      company: { id: 'c1', name: 'ACME' },
    });
    expect(session.getUserName()).toBe('Asha Juma');
    expect(session.getUserId()).toBe('u1');

    session.clear();
    expect(session.getAccessToken()).toBeNull();
    expect(localStorage.getItem('companyId')).toBeNull();
    expect(localStorage.getItem('locale')).toBe('sw');
  });

  it('stays active while the refresh token is valid, even if the access token expired', () => {
    session.setTokens({ accessToken: makeToken(-10), refreshToken: makeToken(3600) });
    expect(session.isActive()).toBe(true);

    session.setTokens({ accessToken: makeToken(-10), refreshToken: makeToken(-5) });
    expect(session.isActive()).toBe(false);
  });
});
