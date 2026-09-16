<script setup>
import { computed, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import { TraApi, TRA_DOCUMENT_TYPES, MAX_UPLOAD_BYTES, ALLOWED_UPLOAD_EXTENSIONS } from '@/service/TraApi.js';
import { apiErrorMessage, formatDate, humanize } from '@/utils/format.js';
import { fileIcon, formatBytes, useStoredFile } from '@/utils/tra/files.js';
import SectionError from './SectionError.vue';

const props = defineProps({
  appealId: { type: String, required: true },
  documents: { type: Array, default: () => [] },
  canUpload: { type: Boolean, default: false },
  error: { type: String, default: '' },
  currentUserId: { type: String, default: null },
});
const emit = defineEmits(['uploaded', 'retry']);

const toast = useToast();
const { busy, openFile } = useStoredFile();

const docType = ref('EVIDENCE');
const remarks = ref('');
const file = ref(null);
const fileError = ref('');
const uploading = ref(false);
const fileInput = ref(null);

const docTypeOptions = computed(() => TRA_DOCUMENT_TYPES.map((t) => ({ value: t, label: humanize(t) })));

// The same limits the backend enforces, checked here so a refusal costs no upload.
function validate(f) {
  if (!f) return 'Choose a file to upload.';
  const dot = f.name.lastIndexOf('.');
  const ext = dot >= 0 ? f.name.slice(dot).toLowerCase() : '';
  if (!ALLOWED_UPLOAD_EXTENSIONS.includes(ext)) return `File type not allowed. Accepted: ${ALLOWED_UPLOAD_EXTENSIONS.join(', ')}.`;
  if (f.size === 0) return 'The selected file is empty.';
  if (f.size > MAX_UPLOAD_BYTES) return `This file is ${formatBytes(f.size)}. The maximum size is ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  return '';
}

const onPick = (e) => {
  file.value = e.target.files?.[0] ?? null;
  fileError.value = file.value ? validate(file.value) : '';
};

const upload = async () => {
  fileError.value = validate(file.value);
  if (fileError.value || !file.value) return;
  uploading.value = true;
  try {
    await TraApi.uploadDocument(props.appealId, file.value, docType.value, remarks.value);
    toast.add({ severity: 'success', summary: 'Uploaded', detail: `${humanize(docType.value)} document uploaded`, life: 3000 });
    file.value = null;
    remarks.value = '';
    docType.value = 'EVIDENCE';
    if (fileInput.value) fileInput.value.value = '';
    emit('uploaded');
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Upload failed',
      detail: apiErrorMessage(e, 'The document could not be uploaded.'),
      life: 4500,
    });
  } finally {
    uploading.value = false;
  }
};
</script>

<template>
  <div>
    <form v-if="canUpload" class="upload-zone" novalidate @submit.prevent="upload">
      <div class="upload-title"><i class="pi pi-cloud-upload" aria-hidden="true"></i> Upload document</div>
      <div class="upload-grid">
        <div class="upload-field">
          <label for="doc-type">Document type</label>
          <Select
            id="doc-type"
            v-model="docType"
            :options="docTypeOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :disabled="uploading"
          />
        </div>
        <div class="upload-field">
          <label for="doc-file">File <span class="req" aria-hidden="true">*</span></label>
          <input
            id="doc-file"
            ref="fileInput"
            type="file"
            class="fld-file"
            :accept="ALLOWED_UPLOAD_EXTENSIONS.join(',')"
            :disabled="uploading"
            :aria-invalid="!!fileError"
            aria-describedby="doc-file-help"
            required
            @change="onPick"
          />
          <div id="doc-file-help" class="help" :class="{ bad: fileError }" :role="fileError ? 'alert' : undefined">
            {{ fileError || 'PDF, JPG, PNG or Word — max 10 MB' }}
          </div>
        </div>
        <div class="upload-field span-2">
          <label for="doc-remarks">Remarks <span class="opt">(optional)</span></label>
          <Textarea
            id="doc-remarks"
            v-model="remarks"
            rows="2"
            maxlength="500"
            class="w-full"
            :disabled="uploading"
            placeholder="Short description of this document…"
          />
        </div>
      </div>
      <div class="upload-actions">
        <Button
          type="submit"
          :label="uploading ? 'Uploading…' : 'Upload'"
          icon="pi pi-upload"
          class="trab-btn"
          :loading="uploading"
          :disabled="uploading || !file"
        />
      </div>
    </form>

    <SectionError v-if="error" :message="error" @retry="emit('retry')" />
    <template v-else>
      <div v-if="documents.length" class="table-wrap">
        <table class="doc-table">
          <caption class="sr-only">
            Documents on this appeal
          </caption>
          <thead>
            <tr>
              <th scope="col">Document</th>
              <th scope="col">Type</th>
              <th scope="col">Size</th>
              <th scope="col">Uploaded</th>
              <th scope="col"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in documents" :key="d.id">
              <td>
                <div class="doc-name">
                  <i class="pi doc-icon" :class="fileIcon(d.originalName || d.fileName)" aria-hidden="true"></i>
                  <button type="button" class="name-btn" :disabled="!!busy" @click="openFile(d.fileName, 'view')">
                    {{ d.originalName || d.fileName }}
                  </button>
                </div>
                <div v-if="d.remarks" class="doc-remarks">{{ d.remarks }}</div>
              </td>
              <td>
                <Tag :value="humanize(d.documentType)" severity="secondary" />
              </td>
              <td class="muted">{{ formatBytes(d.fileSize) }}</td>
              <td class="muted">
                {{ formatDate(d.createdAt) }}
                <Tag v-if="currentUserId && d.uploadedBy === currentUserId" value="You" severity="success" class="ml-1" />
              </td>
              <td class="actions">
                <Button
                  v-tooltip.top="'View'"
                  type="button"
                  :icon="busy === `view:${d.fileName}` ? 'pi pi-spin pi-spinner' : 'pi pi-external-link'"
                  outlined
                  size="small"
                  :disabled="!!busy"
                  :aria-label="`View ${d.originalName || d.fileName} in a new tab`"
                  @click="openFile(d.fileName, 'view')"
                />
                <Button
                  v-tooltip.top="'Download'"
                  type="button"
                  :icon="busy === `download:${d.fileName}` ? 'pi pi-spin pi-spinner' : 'pi pi-download'"
                  outlined
                  size="small"
                  class="ml-2"
                  :disabled="!!busy"
                  :aria-label="`Download ${d.originalName || d.fileName}`"
                  @click="openFile(d.fileName, 'download', d.originalName)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-state">
        <i class="pi pi-paperclip" aria-hidden="true"></i>
        <p>No documents on this appeal.</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.upload-zone {
  border: 2px dashed var(--trab-border);
  border-radius: 10px;
  padding: 1rem 1.15rem;
  background: var(--trab-soft-bg);
  margin-bottom: 1rem;
}
.upload-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--trab-heading);
  margin-bottom: 0.75rem;
}
.upload-title i {
  color: var(--trab-primary);
}
.upload-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem 1rem;
}
.span-2 {
  grid-column: 1 / -1;
}
@media (max-width: 640px) {
  .upload-grid {
    grid-template-columns: 1fr;
  }
}
.upload-field label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--trab-label);
  margin-bottom: 0.3rem;
}
.req {
  color: var(--trab-danger);
}
.opt {
  font-weight: 500;
  color: var(--trab-muted);
}
.fld-file {
  width: 100%;
  font-size: 0.82rem;
  padding: 0.4rem;
  border: 1px solid var(--trab-border);
  border-radius: 7px;
  background: #fff;
}
.fld-file[aria-invalid='true'] {
  border-color: var(--trab-danger);
}
.fld-file:focus {
  border-color: var(--trab-primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(27, 107, 61, 0.15);
}
.help {
  font-size: 0.72rem;
  color: var(--trab-muted);
  margin-top: 0.25rem;
}
.help.bad {
  color: var(--trab-danger);
  font-weight: 600;
}
.upload-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.75rem;
}
.table-wrap {
  overflow-x: auto;
}
.doc-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 35rem;
}
.doc-table thead tr {
  background: var(--trab-line);
}
.doc-table th {
  padding: 0.6rem 0.9rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  text-align: left;
  color: var(--trab-label);
}
.doc-table td {
  padding: 0.7rem 0.9rem;
  font-size: 0.82rem;
  border-top: 1px solid #e5e7eb;
  vertical-align: top;
}
.doc-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.doc-icon {
  color: var(--trab-danger);
}
.name-btn {
  background: none;
  border: 0;
  padding: 0;
  font-size: 0.82rem;
  font-family: inherit;
  font-weight: 600;
  color: var(--trab-primary);
  text-align: left;
  cursor: pointer;
  overflow-wrap: anywhere;
}
.name-btn:hover {
  text-decoration: underline;
}
.name-btn:disabled {
  cursor: progress;
}
.doc-remarks {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0.25rem 0 0 1.4rem;
  white-space: pre-wrap;
}
.muted {
  color: #6b7280;
  white-space: nowrap;
}
.actions {
  white-space: nowrap;
  text-align: right;
}
</style>
