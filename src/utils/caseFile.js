// The digital case file as the portal shows it. The backend decides what is on
// the file and in which part; these only arrange it for reading.

/** The parts of the file, in the order the bound copy is put together. */
export const CASE_FILE_SECTIONS = ['PLEADINGS', 'EVIDENCE', 'HEARING', 'DECISION', 'OTHER'];

/** Documents grouped by part of the file, leaving out parts with nothing in them. */
export function groupDocuments(documents = []) {
  return CASE_FILE_SECTIONS.map((section) => ({
    section,
    items: documents.filter((doc) => (CASE_FILE_SECTIONS.includes(doc.section) ? doc.section : 'OTHER') === section),
  })).filter((group) => group.items.length);
}

/** What has been billed on the case, what is paid and what is still owed, per currency. */
export function billTotals(bills = []) {
  const totals = new Map();
  for (const bill of bills) {
    const currency = bill.currency || 'TZS';
    const entry = totals.get(currency) ?? { currency, billed: 0, paid: 0, outstanding: 0 };
    const billed = Number(bill.billedAmount) || 0;
    const paid = bill.billPaid ? Math.max(Number(bill.paidAmount) || 0, billed) : Number(bill.paidAmount) || 0;
    entry.billed += billed;
    entry.paid += Math.min(paid, billed);
    entry.outstanding += Math.max(billed - paid, 0);
    totals.set(currency, entry);
  }
  return [...totals.values()];
}

const TIMELINE_ICONS = {
  NOTICE: 'pi-flag',
  FILING: 'pi-file',
  REGISTRY: 'pi-check-square',
  PAYMENT: 'pi-wallet',
  DOCUMENT: 'pi-paperclip',
  HEARING: 'pi-calendar',
  PLEADING: 'pi-comments',
  EXHIBIT: 'pi-bookmark',
  APPLICATION: 'pi-inbox',
  DECISION: 'pi-verified',
};

export function timelineIcon(kind) {
  return TIMELINE_ICONS[kind] ?? 'pi-circle';
}

/** A readable size for a stored file: "1.2 MB". */
export function fileSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
