// Mirrors the backend rules (auth.dto.ts PHONE_REGEX, TIN stored as XXX-XXX-XXX).

const PHONE_REGEX = /^(\+?255|0)[0-9]{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const compact = (value) => String(value ?? '').replace(/[\s-]/g, '');

export function isValidPhone(value) {
  return PHONE_REGEX.test(compact(value));
}

/** 255712345678 / +255712345678 / 0712 345 678 → 0712345678 */
export function normalizePhone(value) {
  const digits = compact(value).replace(/^\+/, '');
  if (digits.startsWith('255') && digits.length === 12) return `0${digits.slice(3)}`;
  return digits;
}

export function isValidTin(value) {
  return /^[0-9]{9}$/.test(compact(value));
}

/** 123456789 → 123-456-789 (unchanged when not 9 digits) */
export function formatTin(value) {
  const digits = compact(value);
  return /^[0-9]{9}$/.test(digits) ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}` : String(value ?? '').trim();
}

/**
 * A National Identification Number is twenty digits, written in four groups:
 * 19900101-12345-00001-12. Only the digits matter to the Board.
 */
export function isValidNida(value) {
  return /^[0-9]{20}$/.test(compact(value));
}

/** Groups what has been typed so far, so the field reads as a NIDA number. */
export function formatNida(value) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 20);
  const groups = [digits.slice(0, 8), digits.slice(8, 13), digits.slice(13, 18), digits.slice(18, 20)];
  return groups.filter(Boolean).join('-');
}

export function isValidEmail(value) {
  return EMAIL_REGEX.test(String(value ?? '').trim());
}

export function isValidOtp(value) {
  return /^[0-9]{6}$/.test(String(value ?? ''));
}

/** Whole days from an ISO date (YYYY-MM-DD) to `today`; negative for future dates. */
export function daysSince(isoDate, today = new Date()) {
  if (!isoDate) return null;
  const start = new Date(`${isoDate}T00:00:00`);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((end - start) / 86400000);
}
