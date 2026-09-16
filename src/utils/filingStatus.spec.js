import { describe, expect, it } from 'vitest';
import { filingState, returnedFilings } from './filingStatus.js';

describe('filing status', () => {
  it('shows where the filing stands with the registry', () => {
    expect(filingState({ filingStatus: 'SUBMITTED' })).toEqual({ key: 'filingStatus.submitted', severity: 'warn' });
    expect(filingState({ filingStatus: 'RETURNED' })).toEqual({ key: 'filingStatus.returned', severity: 'danger' });
    expect(filingState({ filingStatus: 'ACCEPTED', paymentStatus: 'UNPAID' }).key).toBe('filingStatus.awaitingPayment');
    expect(filingState({ filingStatus: 'ACCEPTED', paymentStatus: 'PAID' }).key).toBe('filingStatus.registered');
  });

  it('treats a record filed before vetting existed by its payment', () => {
    expect(filingState({ paymentStatus: 'PAID' }).key).toBe('filingStatus.registered');
    expect(filingState({}).key).toBe('filingStatus.awaitingPayment');
  });

  it('picks out what needs correcting', () => {
    const rows = [
      { id: 1, filingStatus: 'RETURNED' },
      { id: 2, filingStatus: 'ACCEPTED' },
      { id: 3, filingStatus: 'RETURNED' },
    ];
    expect(returnedFilings(rows).map((r) => r.id)).toEqual([1, 3]);
  });
});
