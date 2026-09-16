// Where a filing stands with the registry, from the appellant's side.
// Mirrors the backend states in common/filing/filing-workflow.util.ts.

/**
 * Returns the i18n key and severity for a notice, appeal or application.
 * Older records carry no filingStatus; they were admitted when they were
 * recorded, so they fall through to the payment/number view.
 */
export function filingState(record = {}) {
  if (record.filingStatus === 'SUBMITTED') return { key: 'filingStatus.submitted', severity: 'warn' };
  if (record.filingStatus === 'RETURNED') return { key: 'filingStatus.returned', severity: 'danger' };
  if (record.paymentStatus === 'PAID') return { key: 'filingStatus.registered', severity: 'success' };
  return { key: 'filingStatus.awaitingPayment', severity: 'info' };
}

/** Filings the appellant must fix and send again. */
export const returnedFilings = (rows = []) => rows.filter((r) => r.filingStatus === 'RETURNED');
