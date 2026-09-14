import { describe, it, expect } from 'vitest';
import en from './en.js';
import sw from './sw.js';

function flatten(obj, prefix = '') {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') Object.assign(acc, flatten(value, path));
    else acc[path] = value;
    return acc;
  }, {});
}

const enFlat = flatten(en);
const swFlat = flatten(sw);
const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('translations', () => {
  it('Swahili and English have exactly the same keys', () => {
    expect(Object.keys(swFlat).sort()).toEqual(Object.keys(enFlat).sort());
  });

  it('no translation is empty', () => {
    const empty = Object.entries({ ...enFlat, ...swFlat }).filter(([, v]) => typeof v === 'string' && !v.trim());
    expect(empty).toEqual([]);
  });

  it('every message uses the same placeholders in both languages', () => {
    const mismatched = Object.keys(enFlat).filter((key) => placeholders(enFlat[key]).join() !== placeholders(swFlat[key]).join());
    expect(mismatched).toEqual([]);
  });

  it('messages avoid characters vue-i18n treats as syntax', () => {
    const risky = Object.entries({ ...enFlat, ...swFlat }).filter(([, v]) => /[@|]/.test(String(v)));
    expect(risky).toEqual([]);
  });

  it('every static key used in the source exists', () => {
    const sources = import.meta.glob(['/src/**/*.vue', '/src/**/*.js', '!/src/**/*.spec.js'], {
      query: '?raw',
      import: 'default',
      eager: true,
    });
    const missing = new Set();
    for (const [file, code] of Object.entries(sources)) {
      for (const match of code.matchAll(/\bt\(\s*'([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+)'/g)) {
        if (!(match[1] in enFlat)) missing.add(`${file}: ${match[1]}`);
      }
    }
    expect([...missing]).toEqual([]);
  });
});
