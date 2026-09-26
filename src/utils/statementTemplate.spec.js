import { describe, expect, it } from 'vitest';
import { statementSkeleton, statementWritten } from './statementTemplate.js';

describe('statement of appeal layout', () => {
  it('starts in the language the filer is using', () => {
    expect(statementSkeleton('en')).toContain('Grounds of appeal');
    expect(statementSkeleton('sw')).toContain('Sababu za rufani');
    expect(statementSkeleton('fr')).toContain('Grounds of appeal');
  });

  it('knows an untouched layout from a written statement', () => {
    expect(statementWritten('', 'en')).toBe(false);
    expect(statementWritten(statementSkeleton('en'), 'en')).toBe(false);
    expect(statementWritten(statementSkeleton('sw'), 'en')).toBe(false);
    expect(statementWritten('<p>The assessment was raised out of time.</p>', 'en')).toBe(true);
  });
});
