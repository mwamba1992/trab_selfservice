<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { SelfServiceDocuments } from '@/service/SelfServiceApi.js';
import { useLabels } from '@/composables/useLabels.js';
import { apiErrorMessage } from '@/utils/format.js';

const props = defineProps({
  visible: { type: Boolean, default: false },
  // { getDocuments(id), uploadDocument(id, file, type, remarks) } from SelfServiceApi
  api: { type: Object, required: true },
  sourceId: { type: String, default: null },
  reference: { type: String, default: '' },
});
const emit = defineEmits(['update:visible']);

const { t } = useI18n();
const toast = useToast();
const { docTypeLabel } = useLabels();

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];
// Preview MIME is derived from the server-generated extension, never from the
// response, so a stored file can't render as HTML inside the app origin.
const PREVIEW_MIME = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };

const docs = ref([]);
const loading = ref(false);
const file = ref(null);
const fileInput = ref(null);
const docType = ref('OTHER');
const remarks = ref('');
const uploading = ref(false);

const typeOptions = computed(() =>
  ['ANNEXTURE', 'EVIDENCE', 'SUPPORTING', 'OTHER'].map((value) => ({ value, label: docTypeLabel(value) })),
);

const extensionOf = (name) => (name?.split('.').pop() || '').toLowerCase();

const resetForm = () => {
  file.value = null;
  docType.value = 'OTHER';
  remarks.value = '';
  if (fileInput.value) fileInput.value.value = '';
};

const load = async () => {
  if (!props.sourceId) return;
  loading.value = true;
  try {
    docs.value = await props.api.getDocuments(props.sourceId);
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('documents.loadFailed')), life: 4000 });
  } finally {
    loading.value = false;
  }
};

watch(() => [props.visible, props.sourceId], ([visible]) => {
  if (visible) {
    docs.value = [];
    resetForm();
    load();
  }
}, { immediate: true });

const onFileSelect = (event) => {
  const selected = event.target.files?.[0] || null;
  file.value = null;
  if (!selected) return;
  if (!ALLOWED_EXTENSIONS.includes(extensionOf(selected.name))) {
    toast.add({ severity: 'warn', summary: t('common.validation'), detail: t('documents.badType'), life: 4000 });
    event.target.value = '';
    return;
  }
  if (selected.size > MAX_SIZE) {
    toast.add({ severity: 'warn', summary: t('common.validation'), detail: t('documents.tooLarge'), life: 4000 });
    event.target.value = '';
    return;
  }
  file.value = selected;
};

const upload = async () => {
  if (!file.value) return;
  uploading.value = true;
  try {
    await props.api.uploadDocument(props.sourceId, file.value, docType.value, remarks.value.trim());
    toast.add({ severity: 'success', summary: t('common.success'), detail: t('documents.uploaded'), life: 3000 });
    resetForm();
    await load();
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('documents.uploadFailed')), life: 5000 });
  } finally {
    uploading.value = false;
  }
};

// ─── Preview / download ───
const previewVisible = ref(false);
const previewUrl = ref('');
const previewName = ref('');
const previewKind = ref(null); // 'pdf' | 'image' | null
const openingId = ref(null);

const openDocument = async (doc) => {
  openingId.value = doc.id;
  try {
    const blob = await SelfServiceDocuments.download(doc.id);
    const ext = extensionOf(doc.fileName);
    const mime = PREVIEW_MIME[ext] || 'application/octet-stream';
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = URL.createObjectURL(new Blob([blob], { type: mime }));
    previewName.value = doc.originalName || doc.fileName;
    previewKind.value = ext === 'pdf' ? 'pdf' : PREVIEW_MIME[ext] ? 'image' : null;
    previewVisible.value = true;
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('documents.openFailed')), life: 4000 });
  } finally {
    openingId.value = null;
  }
};

const downloadPreview = () => {
  const link = document.createElement('a');
  link.href = previewUrl.value;
  link.download = previewName.value;
  link.click();
};

watch(previewVisible, (open) => {
  if (!open && previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = '';
  }
});
</script>

<template>
  <Dialog
    :visible="visible"
    :header="t('documents.title', { ref: reference })"
    modal
    :style="{ width: '680px' }"
    :breakpoints="{ '768px': '95vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="flex flex-col gap-4 mt-2">
      <div class="upload-box">
        <h4 class="upload-title">{{ t('documents.upload') }}</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="field-label" for="doc-type">{{ t('fields.type') }}</label>
            <Select v-model="docType" input-id="doc-type" :options="typeOptions" option-label="label" option-value="value" class="w-full" />
          </div>
          <div>
            <label class="field-label" for="doc-remarks">{{ t('fields.remarks') }}</label>
            <InputText id="doc-remarks" v-model="remarks" :placeholder="t('common.optional')" class="w-full" maxlength="500" />
          </div>
          <div class="sm:col-span-2">
            <label class="field-label" for="doc-file">{{ t('fields.file') }}</label>
            <input id="doc-file" ref="fileInput" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" class="file-input" @change="onFileSelect" />
            <small class="hint">{{ t('documents.allowed') }}</small>
          </div>
        </div>
        <div class="flex justify-end mt-3">
          <Button :label="t('documents.upload')" icon="pi pi-upload" size="small" class="trab-btn" :loading="uploading" :disabled="!file" @click="upload" />
        </div>
      </div>

      <DataTable :value="docs" :loading="loading" data-key="id" striped-rows size="small">
        <Column :header="t('common.sn')" style="width:3rem"><template #body="{ index }">{{ index + 1 }}</template></Column>
        <Column field="originalName" :header="t('fields.fileName')" />
        <Column :header="t('fields.type')">
          <template #body="{ data }"><Tag :value="docTypeLabel(data.documentType)" severity="info" /></template>
        </Column>
        <Column :header="t('fields.size')"><template #body="{ data }">{{ (Number(data.fileSize) / 1024).toFixed(1) }} KB</template></Column>
        <Column style="width:4rem">
          <template #body="{ data }">
            <Button icon="pi pi-eye" text rounded size="small" :loading="openingId === data.id" :aria-label="t('common.view')" v-tooltip.top="t('common.view')" @click="openDocument(data)" />
          </template>
        </Column>
        <template #empty><div class="text-center py-4 empty-text">{{ t('documents.empty') }}</div></template>
      </DataTable>
    </div>
    <template #footer><Button :label="t('common.close')" outlined @click="emit('update:visible', false)" /></template>
  </Dialog>

  <Dialog
    v-model:visible="previewVisible"
    :header="previewName"
    modal
    :style="{ width: '860px' }"
    :breakpoints="{ '768px': '98vw' }"
    :content-style="{ padding: 0, height: previewKind ? '75vh' : 'auto' }"
  >
    <iframe v-if="previewKind === 'pdf'" :src="previewUrl" :title="previewName" class="preview-frame" />
    <div v-else-if="previewKind === 'image'" class="preview-image"><img :src="previewUrl" :alt="previewName" /></div>
    <p v-else class="p-4 text-sm empty-text">{{ t('documents.noPreview') }}</p>
    <template #footer>
      <Button :label="t('common.download')" icon="pi pi-download" outlined @click="downloadPreview" />
      <Button :label="t('common.close')" outlined @click="previewVisible = false" />
    </template>
  </Dialog>
</template>

<style scoped>
.upload-box { background: #f8faf9; border-radius: 8px; border: 1px solid #e2e8f0; padding: 0.9rem; }
.upload-title { font-size: 0.85rem; font-weight: 600; color: var(--trab-primary); margin: 0 0 0.75rem; }
.field-label { display: block; font-size: 0.76rem; font-weight: 600; color: #475569; margin-bottom: 0.25rem; }
.file-input { font-size: 0.82rem; max-width: 100%; }
.hint { display: block; font-size: 0.72rem; color: #94a3b8; margin-top: 0.25rem; }
.empty-text { color: #94a3b8; font-size: 0.84rem; }
.preview-frame { width: 100%; height: 100%; border: none; }
.preview-image { height: 100%; display: flex; align-items: center; justify-content: center; background: #f1f5f9; }
.preview-image img { max-width: 100%; max-height: 100%; object-fit: contain; }
</style>
