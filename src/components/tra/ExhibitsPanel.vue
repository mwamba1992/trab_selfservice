<script setup>
import { computed, onMounted, ref } from 'vue';
import Tag from 'primevue/tag';
import { TraApi } from '@/service/TraApi.js';
import { apiErrorMessage, formatDate } from '@/utils/format.js';
import SectionError from './SectionError.vue';

/**
 * What the Board admitted in evidence on this appeal. Read only: the marks are
 * the Board's to give, but the respondent has to know what each document is
 * called before it is referred to in submissions.
 */
const props = defineProps({
  appeal: { type: Object, required: true },
});

const loading = ref(true);
const error = ref('');
const exhibits = ref([]);
const register = ref({ admitted: 0, refused: 0, signedAt: null });

const admitted = computed(() => exhibits.value.filter((exhibit) => exhibit.ruling === 'ADMITTED'));
const refused = computed(() => exhibits.value.filter((exhibit) => exhibit.ruling === 'REFUSED'));
const partyLabel = (party) => (party === 'RESPONDENT' ? 'the respondent' : 'the appellant');

const load = async () => {
  loading.value = true;
  error.value = '';
  try {
    const found = await TraApi.getExhibits(props.appeal.id);
    exhibits.value = found.exhibits ?? [];
    register.value = found.register ?? register.value;
  } catch (err) {
    error.value = apiErrorMessage(err, 'The exhibits could not be loaded.');
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div class="panel">
    <SectionError v-if="error" :message="error" @retry="load" />

    <p v-else-if="loading" class="muted"><i class="pi pi-spin pi-spinner"></i> Loading…</p>

    <template v-else>
      <p class="intro">
        The documents already on this appeal that the Board admitted in evidence at the hearing. From here each one is referred to by its
        mark.
      </p>

      <p v-if="!exhibits.length" class="muted">The Board has not ruled on any document yet.</p>

      <table v-else class="exhibits">
        <tbody>
          <tr v-for="exhibit in admitted" :key="exhibit.id">
            <td class="mark">{{ exhibit.mark }}</td>
            <td>
              {{ exhibit.description }}
              <span class="by">tendered by {{ partyLabel(exhibit.party) }} · admitted {{ formatDate(exhibit.ruledDate) }}</span>
            </td>
            <td class="state">
              <Tag v-if="exhibit.signedAt" value="In the signed register" severity="success" />
              <Tag v-else value="Not yet in the register" severity="warn" />
            </td>
          </tr>
        </tbody>
      </table>

      <template v-if="refused.length">
        <h4 class="section-title">Documents the Board did not admit</h4>
        <ul class="refused">
          <li v-for="exhibit in refused" :key="exhibit.id">
            {{ exhibit.description }} — <span class="reason">{{ exhibit.reason }}</span>
          </li>
        </ul>
      </template>

      <p v-if="register.signedAt" class="signed">
        <i class="pi pi-check-circle"></i> The register of exhibits was signed on {{ formatDate(register.signedAt) }}.
      </p>
    </template>
  </div>
</template>

<style scoped>
.panel {
  display: grid;
  gap: 0.5rem;
}
.intro,
.muted {
  margin: 0;
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
  margin: 1rem 0 0.4rem;
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
  margin: 0.8rem 0 0;
  font-size: 0.82rem;
  color: #047857;
}
</style>
