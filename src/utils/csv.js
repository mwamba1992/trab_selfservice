/** YYYY-MM-DD in local time (toISOString() is UTC — the previous day before 03:00 in Tanzania). */
export function isoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export const todayIso = () => isoDate(new Date());

/** CSV with quoting for commas, quotes and newlines, and a leading apostrophe against spreadsheet formula injection. */
export function toCsv(headers, rows) {
  const cell = (value) => {
    let text = value === null || value === undefined ? '' : String(value);
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers, ...rows].map((row) => row.map(cell).join(',')).join('\n');
}

export function downloadCsv(fileName, headers, rows) {
  const url = URL.createObjectURL(new Blob([toCsv(headers, rows)], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
