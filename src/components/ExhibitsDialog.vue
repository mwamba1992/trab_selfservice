<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import Skeleton from 'primevue/skeleton';
import { SelfServiceAppeals } from '@/service/SelfServiceApi.js';
import { apiErrorMessage, formatDate } from '@/utils/format.js';

/**
 * What the Board admitted in evidence on this appeal. Read only: the marks are
 * the Board's to give, but the appellant has to know what their own documents
 * are now called before referring to them.
 */
const props = defineProps({
  visible: { type: Boolean, default: false },
  appeal: { type: Object, default: null },
});
const emit = defineEmits(['update:visible']);

const { t } = useI18n();
const toast = useToast();

const loading = ref(false);
const exhibits = ref([]);
const register = ref({ admitted: 0, refused: 0, signedAt: null });

const admitted = computed(() => exhibits.value.filter((exhibit) => exhibit.ruling === 'ADMITTED'));
const refused = computed(() => exhibits.value.filter((exhibit) => exhibit.ruling === 'REFUSED'));
const tenderedBy = (party) => t(party === 'RESPONDENT' ? 'exhibits.tenderedByRespondent' : 'exhibits.tenderedByAppellant');

const load = async () => {
  if (!props.appeal) return;
  loading.value = true;
  try {
    const found = await SelfServiceAppeals.getExhibits(props.appeal.id);
    exhibits.value = found.exhibits ?? [];
    register.value = found.register ?? register.value;
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: t('common.error'),
      detail: apiErrorMessage(err, t('exhibits.failed')),
      life: 4000,
    });
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.visible, props.appeal?.id],
  ([open]) => {
    if (!open) return;
    exhibits.value = [];
    load();
  },
);
</script>

<template>
  <Dialog
    :visible="visible"
    :header="`${t('exhibits.title')} — ${appeal?.appealNo || ''}`"
    modal
    :style="{ width: '760px' }"
    :breakpoints="{ '820px': '95vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <p class="intro">{{ t('exhibits.intro') }}</p>

    <div v-if="loading" class="loading">
      <Skeleton height="2.5rem" class="mb-2" />
      <Skeleton height="2.5rem" />
    </div>

    <template v-else>
      <p v-if="!exhibits.length" class="muted">{{ t('exhibits.none') }}</p>

      <table v-else class="exhibits">
        <tr v-for="exhibit in admitted" :key="exhibit.id">
          <td class="mark">{{ exhibit.mark }}</td>
          <td>
            {{ exhibit.description }}
            <span class="by">{{ tenderedBy(exhibit.party) }} · {{ t('exhibits.admittedOn', { date: formatDate(exhibit.ruledDate) }) }}</span>
          </td>
          <td class="state">
            <Tag v-if="exhibit.signedAt" :value="t('exhibits.inRegister')" severity="success" />
            <Tag v-else :value="t('exhibits.notInRegister')" severity="warn" />
          </td>
        </tr>
      </table>

      <template v-if="refused.length">
        <h4 class="section-title">{{ t('exhibits.refusedTitle') }}</h4>
        <ul class="refused">
          <li v-for="exhibit in refused" :key="exhibit.id">
            {{ exhibit.description }} — <span class="reason">{{ exhibit.reason }}</span>
          </li>
        </ul>
      </template>

      <p v-if="register.signedAt" class="signed">
        <i class="pi pi-check-circle"></i> {{ t('exhibits.signedOn', { date: formatDate(register.signedAt) }) }}
      </p>
    </template>
  </Dialog>
</template>

<style scoped>
.intro,
.muted {
  margin: 0 0 1rem;
  font-size: 0.85rem;
  color: var(--text-muted, #64748b);
}
.exhibits {
  width: 100%;
  border-collapse: collapse;
}
.exhibits td {
  padding: 0.6rem 0.6rem 0.6rem 0;
  border-bottom: 1px solid var(--surface-border, #e2e8f0);
  font-size: 0.88rem;
  vertical-align: top;
}
.mark {
  width: 3.5rem;
  font-weight: 700;
}
.by {
  display: block;
  font-size: 0.74rem;
  color: var(--text-muted, #64748b);
}
.state {
  width: 12rem;
  text-align: right;
}
.section-title {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-muted, #64748b);
  margin: 1.2rem 0 0.4rem;
}
.refused {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.85rem;
}
.reason {
  color: var(--text-muted, #64748b);
}
.signed {
  margin: 1rem 0 0;
  font-size: 0.82rem;
  color: #047857;
}
</style>
