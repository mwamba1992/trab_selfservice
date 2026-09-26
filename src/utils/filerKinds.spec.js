import { describe, expect, it } from 'vitest';
import { identityProblem, numberRuleFor, offersCertificate } from './filerKinds.js';

describe('filer kinds', () => {
  it('offers a certificate only to those who act for others', () => {
    expect(offersCertificate('ADVOCATE')).toBe(true);
    expect(offersCertificate('TAX_CONSULTANT')).toBe(true);
    expect(offersCertificate('ORGANISATION')).toBe(false);
    expect(offersCertificate('INDIVIDUAL')).toBe(false);
  });

  it('writes a TIN in the groups it is read in', () => {
    expect(numberRuleFor('ORGANISATION').format('123456789')).toBe('123-456-789');
  });

  it('holds a company to a TIN and an individual to a NIDA number', () => {
    expect(identityProblem({ kind: 'ORGANISATION', idNumber: '123-456-789' })).toBeNull();
    expect(identityProblem({ kind: 'ORGANISATION', idNumber: '123' })).toBe('validation.tin');
    expect(identityProblem({ kind: 'INDIVIDUAL', idNumber: '19900101-12345-00001-12' })).toBeNull();
    expect(identityProblem({ kind: 'INDIVIDUAL', idNumber: '1990' })).toBe('validation.nida');
  });

  // The roll number is checked against the Judiciary's roll, not a certificate.
  it('takes an advocate on their roll number alone', () => {
    expect(identityProblem({ kind: 'ADVOCATE', idNumber: 'ROLL-4471' })).toBeNull();
    expect(identityProblem({ kind: 'ADVOCATE', idNumber: '  ' })).toBe('validation.required');
  });

  it('will not take a kind it does not know', () => {
    expect(identityProblem({ kind: 'BANK', idNumber: '123' })).toBe('filer.kindRequired');
  });
});
