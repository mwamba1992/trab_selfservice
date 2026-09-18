import { describe, expect, it } from 'vitest';
import { identityProblem, needsCertificate, numberRuleFor } from './filerKinds.js';

describe('filer kinds', () => {
  it('asks only those who act for others for a certificate', () => {
    expect(needsCertificate('ADVOCATE')).toBe(true);
    expect(needsCertificate('TAX_CONSULTANT')).toBe(true);
    expect(needsCertificate('ORGANISATION')).toBe(false);
    expect(needsCertificate('INDIVIDUAL')).toBe(false);
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

  it('refuses an advocate who shows no certificate', () => {
    expect(identityProblem({ kind: 'ADVOCATE', idNumber: 'ROLL-4471' })).toBe(
      'filer.certificateRequired',
    );
  });

  // The Board keeps the certificate it already read, so a filer correcting
  // their roll number is not asked for it a second time.
  it('accepts an advocate whose certificate is already on file', () => {
    expect(
      identityProblem({ kind: 'ADVOCATE', idNumber: 'ROLL-4471', hasCertificate: true }),
    ).toBeNull();
  });

  it('will not take a kind it does not know', () => {
    expect(identityProblem({ kind: 'BANK', idNumber: '123' })).toBe('filer.kindRequired');
  });
});
