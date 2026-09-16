<script setup>
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Skeleton from 'primevue/skeleton';
import { SelfServiceAppeals, SelfServiceDecisions, SelfServiceDocuments } from '@/service/SelfServiceApi.js';
import { apiErrorMessage, formatMoney } from '@/utils/format.js';
import { openPreview } from '@/utils/preview.js';

const props = defineProps({
  visible: { type: Boolean, default: false },
  decision: { type: Object, default: null },
});
const emit = defineEmits(['update:visible']);

const { t, locale } = useI18n();
const toast = useToast();

const copies = ref([]);
const loading = ref(false);
const busyType = ref('');

const load = async () => {
  if (!props.decision) return;
  loading.value = true;
  try {
    copies.value = await SelfServiceAppeals.getCopies(props.decision.id);
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('common.loadFailed')), life: 4000 });
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.visible, props.decision?.id],
  ([open]) => open && load(),
);

const request = async (copy) => {
  busyType.value = copy.documentType;
  try {
    const res = await SelfServiceAppeals.requestCopy(props.decision.id, copy.documentType);
    toast.add({
      severity: 'success',
      summary: t('common.success'),
      detail: t('copies.requested', { control: res.controlNumber || '—' }),
      life: 7000,
    });
    await load();
  } catch (err) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t('common.actionFailed')), life: 6000 });
  } finally {
    busyType.value = '';
  }
};

// The copy opens in the preview window; it is downloaded or printed from there.
const open = (copy) => {
  const appealId = props.decision.id;
  openPreview({
    fileName: `${copy.label}.pdf`,
    title: copy.label,
    downloadName: `${copy.label}.pdf`,
    // The judgement lives on the appeal itself unless it was uploaded as a document.
    load: () => (copy.documentId ? SelfServiceDocuments.download(copy.documentId) : SelfServiceDecisions.downloadJudgement(appealId)),
  });
};
</script>

<template>
  <Dialog
    :visible="visible"
    :header="t('copies.title')"
    modal
    :style="{ width: '580px' }"
    :breakpoints="{ '640px': '95vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <p class="intro">{{ t('copies.intro') }}</p>

    <div v-if="loading" class="flex flex-col gap-2">
      <Skeleton v-for="n in 3" :key="n" height="3rem" />
    </div>

    <ul v-else class="copies">
      <li v-for="copy in copies" :key="copy.documentType">
        <div class="min-w-0">
          <div class="name">{{ copy.label }}</div>
          <div class="meta">
            <span v-if="!copy.available">{{ t('copies.notIssued') }}</span>
            <span v-else-if="copy.paid">{{ t('copies.paidOn', { amount: formatMoney(copy.amount, locale) }) }}</span>
            <span v-else-if="copy.requested">{{ t('copies.awaitingPayment', { control: copy.controlNumber || '—' }) }}</span>
            <span v-else>{{ t('copies.fee', { amount: formatMoney(copy.amount ?? 0, locale) }) }}</span>
          </div>
        </div>

        <Tag v-if="copy.paid" :value="t('copies.paid')" severity="success" />
        <Button
          v-if="copy.available && copy.paid"
          :label="t('copies.open')"
          icon="pi pi-external-link"
          size="small"
          class="trab-btn"
          :loading="busyType === copy.documentType"
          @click="open(copy)"
        />
        <Button
          v-else-if="copy.available && !copy.requested"
          :label="t('copies.request')"
          icon="pi pi-shopping-cart"
          size="small"
          outlined
          :loading="busyType === copy.documentType"
          @click="request(copy)"
        />
        <Button
          v-else-if="copy.available"
          :label="t('copies.payNow')"
          icon="pi pi-wallet"
          size="small"
          severity="warn"
          outlined
          @click="$router.push('/bills')"
        />
      </li>
    </ul>

    <template #footer><Button :label="t('common.close')" outlined @click="emit('update:visible', false)" /></template>
  </Dialog>
</template>

<style scoped>
.intro {
  margin: 0 0 1rem;
  font-size: 0.85rem;
  color: #6b7280;
}
.copies {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.6rem;
}
.copies li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}
.copies li > div:first-child {
  flex: 1;
}
.name {
  font-weight: 600;
  font-size: 0.9rem;
}
.meta {
  font-size: 0.78rem;
  color: #6b7280;
}
</style>
