import { reactive, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { TraApi } from '@/service/TraApi.js';
import { apiErrorMessage } from '@/utils/format.js';

// Stored uploads sit behind a JWT-guarded route, so files are fetched with the
// token and handed to the browser as blobs rather than linked directly.

/** One preview window for the whole desk, mounted once in the layout. */
export const previewState = reactive({ request: null });

export function openPreview(request) {
  previewState.request = { ...request };
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

/** Content type from the file name; the download route labels every file generically. */
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

/** Opens a stored upload in the preview window, or downloads it through the token. */
export function useStoredFile() {
  const toast = useToast();
  const busy = ref(null);

  const openFile = async (fileName, mode, displayName) => {
    if (mode === 'view') {
      openPreview({ fileName, title: displayName || 'Document', downloadName: displayName });
      return;
    }
    busy.value = `${mode}:${fileName}`;
    try {
      const blob = await TraApi.fileBlob(fileName);
      const url = URL.createObjectURL(new Blob([blob], { type: mimeFor(fileName) }));
      const link = document.createElement('a');
      link.href = url;
      link.download = displayName || fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      toast.add({
        severity: 'error',
        summary: 'File unavailable',
        detail: apiErrorMessage(err, 'The file could not be retrieved. It may have been removed.'),
        life: 4000,
      });
    } finally {
      busy.value = null;
    }
  };

  return { busy, openFile };
}
