import { formatNida, formatTin, isValidNida, isValidTin } from './validators.js';

/**
 * What a filer may be, and the number each kind gives to prove it.
 *
 * Asked twice — once when an account is made, once when a filer sends the
 * registry different details — so the rules live here rather than in either
 * screen, and the two cannot drift apart.
 */
export const FILER_KINDS = ['ORGANISATION', 'INDIVIDUAL', 'ADVOCATE', 'TAX_CONSULTANT'];

/** The two who act for other people must show the Board their standing. */
const ACTS_FOR_OTHERS = ['ADVOCATE', 'TAX_CONSULTANT'];

export const needsCertificate = (kind) => ACTS_FOR_OTHERS.includes(kind);

export const KIND_ICONS = {
  ORGANISATION: 'pi-building',
  INDIVIDUAL: 'pi-user',
  ADVOCATE: 'pi-briefcase',
  TAX_CONSULTANT: 'pi-calculator',
};

const anyText = (v) => Boolean(String(v ?? '').trim());

/**
 * Each kind of number has its own shape. A TIN and a NIDA number are digits in
 * fixed groups, so the field takes digits only and writes the groups in as the
 * person types; a roll number is whatever the roll says it is.
 */
export const NUMBER_RULES = {
  ORGANISATION: {
    maxlength: 11,
    inputmode: 'numeric',
    placeholder: '123-456-789',
    format: formatTin,
    valid: isValidTin,
    message: 'validation.tin',
  },
  INDIVIDUAL: {
    maxlength: 23,
    inputmode: 'numeric',
    placeholder: '19900101-12345-00001-12',
    format: formatNida,
    valid: isValidNida,
    message: 'validation.nida',
  },
  ADVOCATE: {
    maxlength: 30,
    inputmode: 'text',
    placeholder: '',
    format: (v) => v,
    valid: anyText,
    message: 'validation.required',
  },
  TAX_CONSULTANT: {
    maxlength: 30,
    inputmode: 'text',
    placeholder: '',
    format: (v) => v,
    valid: anyText,
    message: 'validation.required',
  },
};

export const numberRuleFor = (kind) => NUMBER_RULES[kind] ?? NUMBER_RULES.ORGANISATION;

/**
 * Why this identity cannot be sent yet, or null — the same question the
 * server asks in filer-identity.util.ts, asked here so the filer hears it
 * before the form is sent. `hasCertificate` is what the record will hold: one
 * attached now, or one the Board already read.
 */
export const identityProblem = ({ kind, idNumber, hasCertificate }) => {
  if (!FILER_KINDS.includes(kind)) return 'filer.kindRequired';
  if (!numberRuleFor(kind).valid(idNumber)) return numberRuleFor(kind).message;
  if (needsCertificate(kind) && !hasCertificate) return 'filer.certificateRequired';
  return null;
};
