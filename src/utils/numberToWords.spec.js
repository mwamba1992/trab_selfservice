import { describe, it, expect } from 'vitest';
import { numberToWords } from './numberToWords.js';

describe('numberToWords', () => {
  it.each([
    [0, 'Zero'],
    [7, 'Seven'],
    [19, 'Nineteen'],
    [40, 'Forty'],
    [85, 'Eighty Five'],
    [100, 'One Hundred'],
    [512, 'Five Hundred Twelve'],
    [12500, 'Twelve Thousand Five Hundred'],
    [1000001, 'One Million One'],
    [2300450000, 'Two Billion Three Hundred Million Four Hundred Fifty Thousand'],
  ])('%i → %s', (value, words) => {
    expect(numberToWords(value)).toBe(words);
  });

  it('ignores decimals and bad input', () => {
    expect(numberToWords('50000.75')).toBe('Fifty Thousand');
    expect(numberToWords(undefined)).toBe('Zero');
  });
});
