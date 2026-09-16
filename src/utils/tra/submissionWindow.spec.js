import { afterEach, describe, expect, it, vi } from 'vitest';
import { windowState } from './submissionWindow.js';

const win = (over = {}) => ({ hearingDate: '2026-09-25', venue: 'Dar es Salaam', deadline: '2026-09-22', open: true, ...over });

const freeze = (iso) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${iso}T09:00:00Z`));
};

afterEach(() => vi.useRealTimers());

describe('windowState', () => {
  it('waits for a hearing to be scheduled', () => {
    expect(windowState(win({ hearingDate: null, deadline: null, open: false })).severity).toBe('secondary');
  });

  it('warns on the last day', () => {
    freeze('2026-09-22');
    expect(windowState(win()).severity).toBe('warn');
  });

  it('names the day the window shut', () => {
    freeze('2026-09-24');
    const state = windowState(win({ open: false }));
    expect(state.severity).toBe('danger');
    expect(state.message).toContain('2026-09-22');
  });

  it('counts the days left while the window is open', () => {
    freeze('2026-09-16');
    expect(windowState(win()).message).toContain('6 days left');
  });
});
