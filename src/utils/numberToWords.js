const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const SCALES = [
  { value: 1_000_000_000, word: 'Billion' },
  { value: 1_000_000, word: 'Million' },
  { value: 1_000, word: 'Thousand' },
  { value: 100, word: 'Hundred' },
];

/** Whole number → English words, as printed on government bills ("Twelve Thousand Five Hundred"). */
export function numberToWords(value) {
  const num = Math.floor(Math.abs(Number(value) || 0));
  if (num === 0) return 'Zero';
  if (num < 20) return ONES[num];
  if (num < 100) return TENS[Math.floor(num / 10)] + (num % 10 ? ` ${ONES[num % 10]}` : '');
  const scale = SCALES.find((s) => num >= s.value);
  const head = numberToWords(Math.floor(num / scale.value));
  const rest = num % scale.value;
  return `${head} ${scale.word}${rest ? ` ${numberToWords(rest)}` : ''}`;
}
