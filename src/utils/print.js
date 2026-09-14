// Styles for official printable documents (bills, receipts). Used both on
// screen and in the print window so the two can never drift apart.
export const DOCUMENT_STYLES = `
.trab-doc { font-family: Arial, sans-serif; color: #333; }
.trab-doc .doc-header { text-align: center; margin-bottom: 16px; }
.trab-doc .doc-header.split { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.trab-doc .doc-header .doc-heading { flex: 1; text-align: center; }
.trab-doc .doc-logo { height: 52px; }
.trab-doc .doc-republic { margin: 8px 0 2px; font-size: 15px; color: #333; text-transform: uppercase; }
.trab-doc .doc-board { margin: 0 0 8px; font-size: 13px; font-weight: 700; }
.trab-doc .doc-badge { display: inline-block; border: 1.5px solid #1B365D; color: #1B365D; padding: 3px 14px; border-radius: 3px; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; }
.trab-doc .doc-badge.success { border-color: #10B981; color: #10B981; }
.trab-doc .section-title { font-size: 11px; font-weight: 700; color: #1B365D; text-transform: uppercase; border-bottom: 2px solid #1B365D; padding-bottom: 4px; margin: 14px 0 8px; }
.trab-doc table { width: 100%; border-collapse: collapse; }
.trab-doc td { padding: 4px 8px; font-size: 13px; vertical-align: top; }
.trab-doc .label { color: #666; width: 180px; }
.trab-doc .items th { background: #f8f9fa; text-align: left; padding: 6px 8px; font-size: 12px; border-bottom: 2px solid #ddd; }
.trab-doc .items td { padding: 6px 8px; font-size: 13px; border-bottom: 1px solid #eee; }
.trab-doc .num { text-align: right; }
.trab-doc .total-row { background: #f0fdf4; }
.trab-doc .total-row td { border-top: 2px solid #1B365D; font-weight: 700; }
.trab-doc .paid-amount { color: #10B981; font-weight: 600; }
.trab-doc .status-paid { color: #10B981; }
.trab-doc .status-unpaid { color: #F59E0B; }
.trab-doc .bill-info { display: flex; gap: 16px; flex-wrap: wrap; }
.trab-doc .bill-info table { flex: 1; }
.trab-doc .qr { text-align: center; padding: 8px; flex-shrink: 0; font-size: 10px; color: #666; }
.trab-doc .qr img { width: 110px; height: 110px; display: block; margin-bottom: 4px; }
.trab-doc .pay-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.trab-doc .pay-box { border: 1px solid #ddd; border-radius: 4px; padding: 12px; font-size: 11px; line-height: 1.5; }
.trab-doc .pay-box h4 { margin: 0 0 8px; font-size: 13px; }
.trab-doc .pay-box p { margin: 0 0 8px; }
.trab-doc .signature { text-align: right; margin-top: 24px; }
.trab-doc .signature span { display: inline-block; border-top: 1px dashed #999; padding-top: 4px; font-size: 11px; color: #666; min-width: 160px; text-align: center; }
@media (max-width: 640px) {
  .trab-doc .pay-grid { grid-template-columns: 1fr; }
  .trab-doc .label { width: 120px; }
}
@media print { body { padding: 0; } }
`;

const STYLE_ID = 'trab-document-styles';

/** Adds the document styles to the page once (idempotent). */
export function ensureDocumentStyles(doc = document) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = DOCUMENT_STYLES;
  doc.head.appendChild(style);
}

/**
 * Opens a print window containing a copy of `element`. The title is set as
 * text (never parsed as HTML). Returns false when the popup was blocked.
 */
export function printElement(element, title) {
  if (!element) return false;
  const win = window.open('', '_blank');
  if (!win) return false;
  const doc = win.document;
  doc.open();
  doc.write(
    '<!doctype html><html><head><meta charset="utf-8"><title></title></head><body style="padding:20px;max-width:720px;margin:0 auto"></body></html>',
  );
  doc.close();
  doc.title = title;
  ensureDocumentStyles(doc);
  doc.body.appendChild(doc.importNode(element, true));
  win.focus();
  win.print();
  return true;
}
