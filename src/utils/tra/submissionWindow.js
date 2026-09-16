// Written submissions close three days before the hearing sits.
// Mirrors the backend rule in common/filing/submission-window.util.ts.
import { daysToDeadline } from '@/utils/submissions.js';

export const SUBMISSION_CUTOFF_DAYS = 3;

/** How the filing window reads to an officer, in plain English. */
export function windowState(win) {
  if (!win?.hearingDate || !win.deadline)
    return { severity: 'secondary', message: 'Submissions open once a hearing is scheduled for this appeal.' };

  const days = daysToDeadline(win.deadline);
  if (!win.open || days < 0)
    return {
      severity: 'danger',
      message: `Submissions closed on ${win.deadline}, ${SUBMISSION_CUTOFF_DAYS} days before the hearing sits.`,
    };
  if (days === 0) return { severity: 'warn', message: `Today is the last day to file — submissions close on ${win.deadline}.` };
  if (days === 1) return { severity: 'warn', message: `One day left — submissions close on ${win.deadline}.` };
  return { severity: 'success', message: `${days} days left — submissions close on ${win.deadline}.` };
}
