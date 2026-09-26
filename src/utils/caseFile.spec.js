import { describe, expect, it } from 'vitest';
import { billTotals, fileSize, groupDocuments, timelineIcon } from './caseFile.js';

describe('case file', () => {
  it('groups documents part by part and leaves out empty parts', () => {
    const groups = groupDocuments([
      { id: 'j', section: 'DECISION' },
      { id: 'a', section: 'PLEADINGS' },
      { id: 'x', section: 'SOMETHING_NEW' },
      { id: 'b', section: 'PLEADINGS' },
    ]);
    expect(groups.map((g) => [g.section, g.items.map((d) => d.id)])).toEqual([
      ['PLEADINGS', ['a', 'b']],
      ['DECISION', ['j']],
      ['OTHER', ['x']],
    ]);
  });

  it('adds up what is billed, paid and owed in each currency', () => {
    expect(
      billTotals([
        { currency: 'TZS', billedAmount: 5000, paidAmount: 0, billPaid: false },
        { currency: 'TZS', billedAmount: 20000, paidAmount: 20000, billPaid: true },
        { currency: 'USD', billedAmount: 100, paidAmount: 40, billPaid: false },
      ]),
    ).toEqual([
      { currency: 'TZS', billed: 25000, paid: 20000, outstanding: 5000 },
      { currency: 'USD', billed: 100, paid: 40, outstanding: 60 },
    ]);
  });

  it('counts a bill marked paid as settled even when the amount was not recorded', () => {
    expect(billTotals([{ currency: 'TZS', billedAmount: 5000, paidAmount: 0, billPaid: true }])).toEqual([
      { currency: 'TZS', billed: 5000, paid: 5000, outstanding: 0 },
    ]);
  });

  it('has an icon for every kind of event, and a plain one for anything new', () => {
    expect(timelineIcon('HEARING')).toBe('pi-calendar');
    expect(timelineIcon('UNKNOWN')).toBe('pi-circle');
  });

  it('writes file sizes the way people read them', () => {
    expect(fileSize(512)).toBe('512 B');
    expect(fileSize(2048)).toBe('2 KB');
    expect(fileSize(1572864)).toBe('1.5 MB');
  });
});
