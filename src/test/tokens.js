/** Builds an unsigned JWT-shaped token expiring `seconds` from now (tests only). */
export function makeToken(seconds, extra = {}) {
  const encode = (obj) => btoa(JSON.stringify(obj)).replace(/=+$/, '');
  const payload = { sub: 'user-1', exp: Math.floor(Date.now() / 1000) + seconds, ...extra };
  return `${encode({ alg: 'none' })}.${encode(payload)}.signature`;
}
