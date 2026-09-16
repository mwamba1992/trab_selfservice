// Written submissions close three days before the hearing sits.
// Mirrors the backend rule in common/filing/submission-window.util.ts.

export const SUBMISSION_CUTOFF_DAYS = 3;

export const SUBMISSION_STAGES = ['SUBMISSION_IN_CHIEF', 'REPLY', 'REJOINDER'];

/** i18n key for a stage, so both portals name the stages the same way. */
export const stageKey = (stage) => `submissions.stage.${stage}`;

const DAY_MS = 86_400_000;
const dayStart = (isoDate) => {
  const [y, m, d] = String(isoDate).slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Whole days left to file, negative once the window has closed. */
export function daysToDeadline(deadline, now = new Date()) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((dayStart(deadline) - today) / DAY_MS);
}

/**
 * How the window reads to the party: no hearing yet, closed, closing today,
 * or open with the days remaining. `window` is what the API returns for an
 * appeal: { hearingDate, deadline, open }.
 */
export function windowState(win = {}) {
  if (!win.hearingDate) return { key: 'submissions.noHearing', severity: 'secondary', days: null };
  const days = daysToDeadline(win.deadline);
  if (!win.open || days < 0) return { key: 'submissions.closed', severity: 'danger', days };
  if (days === 0) return { key: 'submissions.lastDay', severity: 'warn', days };
  return { key: days === 1 ? 'submissions.oneDayLeft' : 'submissions.daysLeft', severity: days <= 3 ? 'warn' : 'success', days };
}

/** Stages the party has already filed, so the form can lead with the next one. */
export function nextStage(submissions = [], party) {
  const filed = new Set(submissions.filter((s) => s.party === party).map((s) => s.stage));
  return SUBMISSION_STAGES.find((s) => !filed.has(s)) || 'REJOINDER';
}
