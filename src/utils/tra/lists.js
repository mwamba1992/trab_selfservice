// Badges and option lists shared by the TRA desk's case views.
// Ported from the standalone TRA portal; the rules mirror the backend utils
// (tra/appeal-list-filter.util.ts, decision-action.util.ts, hearing-response.util.ts).
import { formatDate } from '@/utils/format.js';

// ─── Reply deadlines on the case list ───

const CLOSED_STATUSES = ['CONCLUDED', 'DECIDED'];

function replyState(appeal) {
  if (appeal.replyStatus) return appeal.replyStatus;
  const closed =
    appeal.caseClosed ??
    (CLOSED_STATUSES.includes(appeal.statusTrend) || (!!appeal.outcomeOfDecision && appeal.outcomeOfDecision !== 'NO DECISION'));
  if (appeal.traReplied) return 'REPLIED';
  if (closed) return 'NOT_REQUIRED';
  return appeal.overdue ? 'OVERDUE' : 'PENDING';
}

/** Reply column badge. Countdowns only for open cases; closed cases show "Not required". */
export function replyBadge(appeal) {
  const due = appeal.replyDueDate ? `Due ${formatDate(appeal.replyDueDate)}` : '';
  switch (replyState(appeal)) {
    case 'REPLIED':
      return appeal.repliedAt
        ? { severity: 'success', text: `Filed ${formatDate(appeal.repliedAt)}`, title: 'Reply filed' }
        : { severity: 'success', text: 'Replied', title: 'Reply filed' };
    case 'NOT_REQUIRED':
      return { severity: 'secondary', text: 'Not required', title: 'Case closed: no reply expected' };
    case 'OVERDUE':
      return { severity: 'danger', text: 'Overdue', title: due };
    default: {
      const days = appeal.daysRemaining;
      if (days === null || days === undefined) return { severity: 'warn', text: 'Pending', title: due };
      return { severity: days <= 7 ? 'warn' : 'secondary', text: `${days}d left`, title: due };
    }
  }
}

// ─── Case deadlines feed ───

export const DEADLINE_LABELS = {
  REPLY: 'Statement of reply',
  TRIBUNAL_APPEAL: 'Appeal to Tribunal',
  HEARING: 'Hearing',
};

export const DEADLINE_ICONS = {
  REPLY: 'pi-pencil',
  TRIBUNAL_APPEAL: 'pi-directions',
  HEARING: 'pi-calendar-clock',
};

const plural = (n) => `${n} day${n === 1 ? '' : 's'}`;

/** Urgency chip: overdue and today in red, within a week in amber. */
export function deadlineChip(deadline) {
  const days = deadline.daysRemaining;
  if (deadline.overdue || days < 0) return { severity: 'danger', text: `Overdue ${plural(Math.abs(days))}` };
  if (days === 0) return { severity: 'danger', text: 'Today' };
  if (days === 1) return { severity: 'warn', text: 'Tomorrow' };
  return { severity: days <= 7 ? 'warn' : 'secondary', text: `In ${plural(days)}` };
}

// ─── What TRA did after a decision ───

export const DECISION_ACTION_LABELS = {
  REFUND_ISSUED: 'Refund issued',
  ASSESSMENT_REVISED: 'Assessment revised',
  TAX_ENFORCED: 'Tax enforced',
  APPEAL_TO_TRIBUNAL: 'Appealed to the Tribunal',
  NO_ACTION_REQUIRED: 'No action required',
};

export const DECISION_ACTION_OPTIONS = Object.keys(DECISION_ACTION_LABELS).map((value) => ({
  value,
  label: DECISION_ACTION_LABELS[value],
}));

/** A decided appeal with nothing recorded still needs attention. */
export function decisionActionBadge(action) {
  if (!action) return { severity: 'warn', text: 'Not recorded' };
  if (action.action === 'NO_ACTION_REQUIRED') return { severity: 'secondary', text: DECISION_ACTION_LABELS.NO_ACTION_REQUIRED };
  if (action.action === 'APPEAL_TO_TRIBUNAL') return { severity: 'danger', text: DECISION_ACTION_LABELS.APPEAL_TO_TRIBUNAL };
  return { severity: 'success', text: DECISION_ACTION_LABELS[action.action] };
}

export function decisionActionProblem(input) {
  if (input.action !== 'NO_ACTION_REQUIRED' && !input.details?.trim()) return 'Say what TRA did, so the Board and auditors can follow it.';
  return '';
}

// ─── Answering a summons ───

export const ATTENDANCE_OPTIONS = [
  { value: 'ATTENDING', label: 'TRA will attend' },
  { value: 'ADJOURNMENT_REQUESTED', label: 'Request an adjournment' },
  { value: 'NOT_ATTENDING', label: 'TRA will not attend' },
];

export function hearingResponseBadge(response, summonsStatus) {
  if (!response)
    return summonsStatus === 'CONCLUDED'
      ? { severity: 'secondary', text: 'No response' }
      : { severity: 'danger', text: 'Awaiting response' };
  if (response.attendance === 'ATTENDING') return { severity: 'success', text: 'Attending' };
  if (response.attendance === 'ADJOURNMENT_REQUESTED') return { severity: 'warn', text: 'Adjournment requested' };
  return { severity: 'danger', text: 'Not attending' };
}

export function hearingResponseProblem(input) {
  if (input.attendance === 'ATTENDING' && !input.appearingCounsel?.trim()) return 'Name the counsel or officer appearing for TRA.';
  if (input.attendance === 'ADJOURNMENT_REQUESTED' && !input.remarks?.trim()) return 'Give the reason for requesting an adjournment.';
  if (input.attendance === 'NOT_ATTENDING' && !input.remarks?.trim()) return 'Give the reason TRA will not attend.';
  return '';
}

/** True when a click landed on an element that handles itself (link, button, field). */
export function isInteractiveTarget(event) {
  const target = event.target;
  return target instanceof Element && !!target.closest('a, button, input, select, textarea, label');
}
