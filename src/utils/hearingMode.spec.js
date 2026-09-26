import { describe, expect, it } from 'vitest';
import { isOnline, meetingLinkProblem, platformOf, safeMeetingLink } from './hearingMode.js';

describe('hearing mode', () => {
  it('knows which hearings are held online', () => {
    expect(isOnline('VIRTUAL')).toBe(true);
    expect(isOnline('HYBRID')).toBe(true);
    expect(isOnline('IN_PERSON')).toBe(false);
  });

  it('asks for a link only when the hearing is online', () => {
    expect(meetingLinkProblem('IN_PERSON', '')).toBe('');
    expect(meetingLinkProblem('VIRTUAL', '')).toBe('Give the meeting link the parties will use to join');
    expect(meetingLinkProblem('HYBRID', 'zoom.us/j/1')).toBe('The meeting link must be a full https:// address');
    expect(meetingLinkProblem('VIRTUAL', 'https://zoom.us/j/1')).toBe('');
  });

  it('never lets through a link a browser would run', () => {
    expect(safeMeetingLink('javascript:alert(1)')).toBeNull();
    expect(safeMeetingLink('http://zoom.us/j/1')).toBeNull();
    expect(safeMeetingLink('https://zoom.us/j/1')).toBe('https://zoom.us/j/1');
  });

  it('names the platform so the button says where it goes', () => {
    expect(platformOf('https://teams.microsoft.com/l/meetup-join/x')).toBe('Microsoft Teams');
    expect(platformOf('https://us02web.zoom.us/j/1')).toBe('Zoom');
    expect(platformOf('https://meet.google.com/abc-defg-hij')).toBe('Google Meet');
    expect(platformOf('https://example.org/room')).toBe('');
    expect(platformOf('javascript:x')).toBe('');
  });
});
