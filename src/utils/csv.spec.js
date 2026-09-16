import { describe, expect, it } from 'vitest';
import { isoDate, toCsv } from './csv.js';

describe('isoDate', () => {
  it('uses the local day, not UTC', () => {
    // 01:00 in Dar es Salaam is still the previous day in UTC.
    expect(isoDate(new Date(2026, 8, 16, 1, 0, 0))).toBe('2026-09-16');
  });
});

describe('toCsv', () => {
  it('quotes cells holding commas, quotes or newlines', () => {
    expect(toCsv(['a'], [['x,y']])).toBe('a\n"x,y"');
    expect(toCsv(['a'], [['say "hi"']])).toBe('a\n"say ""hi"""');
  });

  it('defuses a cell a spreadsheet would read as a formula', () => {
    expect(toCsv(['a'], [['=SUM(A1)']])).toBe("a\n'=SUM(A1)");
  });

  it('writes empty cells for missing values', () => {
    expect(toCsv(['a', 'b'], [[null, undefined]])).toBe('a,b\n,');
  });
});
