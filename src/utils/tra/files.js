import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { TraApi } from '@/service/TraApi.js';
import { apiErrorMessage } from '@/utils/format.js';
import { mimeFor, openPreview } from '@/utils/preview.js';

// Stored uploads sit behind a JWT-guarded route, so files are fetched with the
// token and handed to the browser as blobs rather than linked directly.

// The preview window itself is shared with the appellant side of the portal.
export { closePreview, fileIcon, formatBytes, mimeFor, openPreview, previewKind, previewState } from '@/utils/preview.js';

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
