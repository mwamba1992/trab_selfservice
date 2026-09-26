// How a hearing is held, and the link the parties join by when it is online.
// The server checks the link too; this only says what is wrong before saving.

export const HEARING_MODES = [
  { value: 'IN_PERSON', label: 'In person' },
  { value: 'VIRTUAL', label: 'Virtual' },
  { value: 'HYBRID', label: 'Hybrid' },
];

export const isOnline = (mode) => mode === 'VIRTUAL' || mode === 'HYBRID';

/** The link if it is a plain https address, or null. */
export function safeMeetingLink(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' && url.hostname.includes('.') && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

/** Why the link cannot be used for this hearing, or '' when it can. */
export function meetingLinkProblem(mode, link) {
  if (!isOnline(mode)) return '';
  if (!String(link ?? '').trim()) return 'Give the meeting link the parties will use to join';
  if (!safeMeetingLink(link)) return 'The meeting link must be a full https:// address';
  return '';
}

const PLATFORMS = [
  [/(^|\.)teams\.(microsoft|live)\.com$/, 'Microsoft Teams'],
  [/(^|\.)zoom\.us$/, 'Zoom'],
  [/(^|\.)meet\.google\.com$/, 'Google Meet'],
  [/(^|\.)webex\.com$/, 'Webex'],
  [/(^|\.)meet\.jit\.si$/, 'Jitsi Meet'],
];

/** The platform a link belongs to, for labelling the join button. */
export function platformOf(link) {
  const safe = safeMeetingLink(link);
  if (!safe) return '';
  const host = new URL(safe).hostname.toLowerCase();
  return PLATFORMS.find(([pattern]) => pattern.test(host))?.[1] ?? '';
}
