import { describe, expect, it } from 'vitest';
import { daysToDeadline, nextStage, windowState } from './submissions.js';

const at = (iso) => new Date(`${iso}T09:00:00Z`);

describe('daysToDeadline', () => {
  it('counts whole days to the closing day', () => {
    expect(daysToDeadline('2026-09-20', at('2026-09-16'))).toBe(4);
  });

  it('goes negative once the window has shut', () => {
    expect(daysToDeadline('2026-09-14', at('2026-09-16'))).toBe(-2);
  });
});

describe('windowState', () => {
  it('says nothing is open before a hearing is scheduled', () => {
    expect(windowState({ hearingDate: null, deadline: null, open: false }).key).toBe('submissions.noHearing');
  });

  it('flags a shut window', () => {
    const state = windowState({ hearingDate: '2026-09-17', deadline: '2026-09-14', open: false });
    expect(state.key).toBe('submissions.closed');
    expect(state.severity).toBe('danger');
  });
});

describe('nextStage', () => {
  it('starts with the submission in chief', () => {
    expect(nextStage([], 'APPELLANT')).toBe('SUBMISSION_IN_CHIEF');
  });

  it('skips stages this party has already filed', () => {
    const filed = [
      { party: 'APPELLANT', stage: 'SUBMISSION_IN_CHIEF' },
      { party: 'RESPONDENT', stage: 'REPLY' },
    ];
    expect(nextStage(filed, 'APPELLANT')).toBe('REPLY');
  });
});
