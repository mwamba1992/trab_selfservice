import { describe, it, expect } from 'vitest';
import { isValidPhone, normalizePhone, isValidTin, formatTin, isValidEmail, isValidOtp, daysSince } from './validators.js';

describe('validators', () => {
  it('accepts Tanzanian phone formats and rejects others', () => {
    expect(isValidPhone('0712345678')).toBe(true);
    expect(isValidPhone('0712 345 678')).toBe(true);
    expect(isValidPhone('255712345678')).toBe(true);
    expect(isValidPhone('+255712345678')).toBe(true);
    expect(isValidPhone('071234567')).toBe(false);
    expect(isValidPhone('12345678901')).toBe(false);
    expect(isValidPhone('')).toBe(false);
  });

  it('normalises phones to the stored 0XXXXXXXXX format', () => {
    expect(normalizePhone('+255712345678')).toBe('0712345678');
    expect(normalizePhone('255 712 345 678')).toBe('0712345678');
    expect(normalizePhone('0712-345-678')).toBe('0712345678');
  });

  it('validates and formats TINs', () => {
    expect(isValidTin('123-456-789')).toBe(true);
    expect(isValidTin('123456789')).toBe(true);
    expect(isValidTin('12345678')).toBe(false);
    expect(formatTin('123456789')).toBe('123-456-789');
    expect(formatTin(' 123 456 789 ')).toBe('123-456-789');
    expect(formatTin('12345')).toBe('12345');
  });

  it('validates emails and one-time codes', () => {
    expect(isValidEmail('legal@acme.co.tz')).toBe(true);
    expect(isValidEmail('legal@acme')).toBe(false);
    expect(isValidOtp('123456')).toBe(true);
    expect(isValidOtp('12345a')).toBe(false);
  });

  it('counts whole days since a date', () => {
    const today = new Date(2026, 8, 14);
    expect(daysSince('2026-09-14', today)).toBe(0);
    expect(daysSince('2026-08-15', today)).toBe(30);
    expect(daysSince('2026-09-20', today)).toBe(-6);
    expect(daysSince('', today)).toBeNull();
  });
});
