import { describe, expect, it } from 'vitest';
import {
  deadlineChip,
  decisionActionBadge,
  decisionActionProblem,
  hearingResponseBadge,
  hearingResponseProblem,
  replyBadge,
} from './lists.js';

describe('replyBadge', () => {
  it('shows when the reply was filed', () => {
    const badge = replyBadge({ replyStatus: 'REPLIED', repliedAt: '2026-09-10' });
    expect(badge.severity).toBe('success');
    expect(badge.text).toContain('Filed');
  });

  it('asks for nothing on a closed case', () => {
    expect(replyBadge({ statusTrend: 'DECIDED', traReplied: false }).text).toBe('Not required');
  });

  it('counts down an open case and warns inside a week', () => {
    const badge = replyBadge({ replyStatus: 'PENDING', daysRemaining: 5, replyDueDate: '2026-09-21' });
    expect(badge.text).toBe('5d left');
    expect(badge.severity).toBe('warn');
  });

  it('flags an overdue reply', () => {
    expect(replyBadge({ replyStatus: 'OVERDUE' }).severity).toBe('danger');
  });
});

describe('deadlineChip', () => {
  it('reads today as urgent', () => {
    expect(deadlineChip({ daysRemaining: 0, overdue: false })).toEqual({ severity: 'danger', text: 'Today' });
  });

  it('counts the days it has been overdue', () => {
    expect(deadlineChip({ daysRemaining: -3, overdue: true }).text).toBe('Overdue 3 days');
  });

  it('stays quiet when the date is far off', () => {
    expect(deadlineChip({ daysRemaining: 20, overdue: false }).severity).toBe('secondary');
  });
});

describe('decisionAction', () => {
  it('nags when a decided appeal has no action recorded', () => {
    expect(decisionActionBadge(null)).toEqual({ severity: 'warn', text: 'Not recorded' });
  });

  it('marks a tribunal appeal apart', () => {
    expect(decisionActionBadge({ action: 'APPEAL_TO_TRIBUNAL' }).severity).toBe('danger');
  });

  it('requires details for every action but "no action required"', () => {
    expect(decisionActionProblem({ action: 'REFUND_ISSUED', details: '' })).not.toBe('');
    expect(decisionActionProblem({ action: 'NO_ACTION_REQUIRED' })).toBe('');
  });
});

describe('hearingResponse', () => {
  it('chases an unanswered open summons', () => {
    expect(hearingResponseBadge(null, 'SERVED')).toEqual({ severity: 'danger', text: 'Awaiting response' });
  });

  it('leaves a concluded summons alone', () => {
    expect(hearingResponseBadge(null, 'CONCLUDED').severity).toBe('secondary');
  });

  it('asks who is appearing, and why when TRA stays away', () => {
    expect(hearingResponseProblem({ attendance: 'ATTENDING', appearingCounsel: '' })).toContain('counsel');
    expect(hearingResponseProblem({ attendance: 'NOT_ATTENDING', remarks: '' })).toContain('reason');
    expect(hearingResponseProblem({ attendance: 'ATTENDING', appearingCounsel: 'Adv. Mushi' })).toBe('');
  });
});
