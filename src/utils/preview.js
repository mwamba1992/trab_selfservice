import { reactive } from 'vue';

// One preview window for the whole portal. Nothing downloads straight away:
// a document opens here first, and the reader downloads or prints from it.

/** The document being previewed, or null. */
export const previewState = reactive({ request: null });

/**
 * Opens a document in the preview window.
 * `load` fetches the file as a Blob when the caller needs its own authenticated
 * route; without it the file is read from the stored-uploads route.
 */
export function openPreview({ fileName, title, downloadName, load }) {
  previewState.request = { fileName, title, downloadName: downloadName ?? null, load: load ?? null };
}

export function closePreview() {
  previewState.request = null;
}

const MIME_TYPES = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const extensionOf = (fileName) => (String(fileName).includes('.') ? String(fileName).split('.').pop().toLowerCase() : '');

/** Content type from the file name; the download routes label every file generically. */
export function mimeFor(fileName) {
  return MIME_TYPES[extensionOf(fileName)] ?? 'application/octet-stream';
}

export function previewKind(fileName) {
  const ext = extensionOf(fileName);
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg'].includes(ext)) return 'image';
  return 'other';
}

export function fileIcon(name) {
  const ext = extensionOf(name ?? '');
  if (ext === 'pdf') return 'pi-file-pdf';
  if (ext === 'doc' || ext === 'docx') return 'pi-file-word';
  if (['jpg', 'jpeg', 'png'].includes(ext)) return 'pi-image';
  return 'pi-file';
}

export function formatBytes(size) {
  const n = Number(size);
  if (!Number.isFinite(n) || n <= 0) return '-';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
