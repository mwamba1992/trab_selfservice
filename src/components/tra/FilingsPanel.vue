<script setup>
import { computed, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import RadioButton from 'primevue/radiobutton';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import { TraApi } from '@/service/TraApi.js';
import { apiErrorMessage, formatDate, formatDateTime } from '@/utils/format.js';
import SectionError from './SectionError.vue';

const props = defineProps({
  appeal: { type: Object, required: true },
  filings: { type: Array, default: () => [] },
  canFile: { type: Boolean, default: false },
  error: { type: String, default: '' },
});
const emit = defineEmits(['filed', 'retry']);

const toast = useToast();
const grounds = ref('');
const filing = ref(false);

const TYPE_LABELS = {
  PRELIMINARY_OBJECTION: 'Preliminary objection',
  SETTLEMENT_CONSENT: 'Consent to settlement',
  WITHDRAWAL_CONSENT: 'Consent to withdrawal',
  TRIBUNAL_APPEAL_INTENT: 'Intention to appeal to the Tribunal',
};

// While the case is live TRA chooses what to lodge; after a decision only the Tribunal notice remains.
const OPEN_CASE_TYPES = [
  {
    value: 'PRELIMINARY_OBJECTION',
    label: 'Preliminary objection',
    hint: 'Points of law argued before the merits, such as time bar, jurisdiction, deposit not paid or defective pleadings.',
    placeholder: 'Grounds of the preliminary objection…',
  },
  {
    value: 'SETTLEMENT_CONSENT',
    label: 'Consent to settlement',
    hint: 'Terms TRA has agreed with the appellant, for the Board to record.',
    placeholder: 'Terms of the settlement…',
  },
  {
    value: 'WITHDRAWAL_CONSENT',
    label: 'Consent to withdrawal',
    hint: "TRA does not oppose the appellant's withdrawal of the appeal.",
    placeholder: 'Any condition attached, such as costs…',
  },
];

const REVIEW = {
  PENDING: { severity: 'warn', text: 'Awaiting Board review' },
  ACCEPTED: { severity: 'success', text: 'Accepted by the Board' },
  REJECTED: { severity: 'danger', text: 'Rejected by the Board' },
};
const review = (f) => REVIEW[f.reviewStatus ?? 'PENDING'];

const decided = computed(() => !!props.appeal.outcomeOfDecision && props.appeal.outcomeOfDecision !== 'NO DECISION');
const intentFiled = computed(() => !!props.appeal.tribunalIntentFiledAt);
// Before the decision TRA picks what to lodge; after it, only the Tribunal notice remains.
const openType = ref('PRELIMINARY_OBJECTION');
const formType = computed(() => (decided.value ? 'TRIBUNAL_APPEAL_INTENT' : openType.value));
const openChoice = computed(() => OPEN_CASE_TYPES.find((opt) => opt.value === openType.value) ?? OPEN_CASE_TYPES[0]);
const showForm = computed(() => props.canFile && !(decided.value && intentFiled.value));

// Tribunal window banner, decided appeals only.
const tribunal = computed(() => {
  const a = props.appeal;
  if (!decided.value) return null;
  if (a.tribunalIntentFiledAt)
    return {
      cls: 'ok',
      icon: 'pi-check-circle',
      text: `Intention to appeal to the Tribunal lodged on ${formatDate(a.tribunalIntentFiledAt)}.`,
    };
  if (a.wonBy === 'RESPONDENT')
    return {
      cls: 'info',
      icon: 'pi-verified',
      text: 'The Board decided in favour of TRA. An appeal to the Tribunal is not usually required.',
    };
  if (a.tribunalWindowLapsed)
    return {
      cls: 'bad',
      icon: 'pi-exclamation-triangle',
      text: `The 30-day window to appeal to the Tribunal closed on ${formatDate(a.tribunalDueDate)}. Lodging now needs an extension of time.`,
    };
  if (a.tribunalDueDate) {
    const d = a.tribunalDaysRemaining ?? 0;
    return {
      cls: d <= 7 ? 'warn' : 'info',
      icon: 'pi-clock',
      text: `Notice of intention to appeal to the Tribunal due ${formatDate(a.tribunalDueDate)}: ${d} day${d === 1 ? '' : 's'} remaining.`,
    };
  }
  return null;
});

const submit = async () => {
  if (!grounds.value.trim()) return;
  filing.value = true;
  try {
    await TraApi.lodgeFiling(props.appeal.id, formType.value, grounds.value);
    grounds.value = '';
    toast.add({ severity: 'success', summary: 'Lodged', detail: `${TYPE_LABELS[formType.value]} lodged`, life: 3000 });
    emit('filed');
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Lodging failed', detail: apiErrorMessage(e, 'The filing could not be lodged'), life: 4500 });
  } finally {
    filing.value = false;
  }
};
</script>

<template>
  <div>
    <div v-if="tribunal" class="banner" :class="tribunal.cls" role="status">
      <i class="pi" :class="tribunal.icon" aria-hidden="true"></i><span>{{ tribunal.text }}</span>
    </div>

    <div v-if="showForm" class="filing-form">
      <fieldset v-if="!decided" class="types">
        <legend class="fld-label">What is TRA lodging?</legend>
        <div v-for="opt in OPEN_CASE_TYPES" :key="opt.value" class="type-choice" :class="{ active: openType === opt.value }">
          <RadioButton v-model="openType" :input-id="`filing-type-${opt.value}`" name="filing-type" :value="opt.value" />
          <label :for="`filing-type-${opt.value}`">{{ opt.label }}</label>
        </div>
      </fieldset>
      <label for="filing-grounds" class="fld-label">
        {{ decided ? 'Lodge intention to appeal to the Tribunal' : 'Grounds' }}
      </label>
      <p class="hint">
        {{ decided ? 'State the grounds on which TRA intends to challenge the Board’s decision.' : openChoice.hint }}
      </p>
      <Textarea
        id="filing-grounds"
        v-model="grounds"
        rows="5"
        class="w-full"
        :placeholder="decided ? 'Grounds of the intended appeal…' : openChoice.placeholder"
        :disabled="filing"
      />
      <div class="actions">
        <Button
          :label="decided ? 'Lodge Intention to Appeal' : `Lodge ${openChoice.label}`"
          icon="pi pi-send"
          class="trab-btn"
          :loading="filing"
          :disabled="filing || !grounds.trim()"
          @click="submit"
        />
      </div>
    </div>

    <h2 class="sec-head">Lodged Filings</h2>
    <SectionError v-if="error" :message="error" @retry="emit('retry')" />
    <template v-else>
      <article v-for="f in filings" :key="f.id" class="filing-card">
        <div class="card-head">
          <div class="card-tags">
            <Tag :value="TYPE_LABELS[f.type]" :severity="f.type === 'TRIBUNAL_APPEAL_INTENT' ? 'secondary' : 'info'" />
            <strong class="who">{{ f.filedByName || 'TRA Officer' }}</strong>
            <Tag :value="review(f).text" :severity="review(f).severity" />
          </div>
          <span class="when">{{ formatDateTime(f.createdAt) }}</span>
        </div>
        <p class="body">{{ f.grounds }}</p>
        <p v-if="f.reviewStatus && f.reviewStatus !== 'PENDING'" class="review-note">
          {{ f.reviewedByName || 'Registry' }}<template v-if="f.reviewedAt"> · {{ formatDateTime(f.reviewedAt) }}</template
          ><template v-if="f.reviewRemarks">: {{ f.reviewRemarks }}</template>
        </p>
      </article>
      <div v-if="!filings.length" class="empty-state">
        <i class="pi pi-flag" aria-hidden="true"></i>
        <p>No objections or appeal notices lodged.</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.banner {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.7rem 1rem;
  border-radius: 9px;
  font-size: 0.82rem;
  font-weight: 600;
  margin-bottom: 1rem;
  border: 1px solid;
}
.banner.ok {
  background: #ecfdf3;
  color: #027a48;
  border-color: #a6f4c5;
}
.banner.info {
  background: #eff8ff;
  color: #175cd3;
  border-color: #b2ddff;
}
.banner.warn {
  background: #fffaeb;
  color: #b54708;
  border-color: #fedf89;
}
.banner.bad {
  background: #fef3f2;
  color: #b42318;
  border-color: #fecdca;
}
.filing-form {
  margin-bottom: 1.25rem;
}
.types {
  border: 0;
  margin: 0 0 0.75rem;
  padding: 0;
  display: grid;
  gap: 0.4rem;
}
.type-choice {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem 0.7rem;
  border: 1px solid var(--trab-line);
  border-radius: 8px;
  font-size: 0.82rem;
}
.type-choice label {
  cursor: pointer;
}
.type-choice.active {
  border-color: var(--trab-primary);
  background: #f2f9f5;
}
.fld-label {
  display: block;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--trab-heading);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 0.3rem;
  padding: 0;
}
.hint {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0 0 0.5rem;
}
.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}
.sec-head {
  font-size: 0.78rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 0 0 0.5rem;
}
.filing-card {
  border: 1px solid var(--trab-line);
  border-radius: 8px;
  padding: 0.75rem 0.9rem;
  margin-bottom: 0.65rem;
  background: #fcfcfd;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}
.card-tags {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.who {
  font-size: 0.85rem;
  color: var(--trab-heading);
}
.when {
  font-size: 0.75rem;
  color: #6b7280;
}
.body {
  margin: 0;
  font-size: 0.85rem;
  white-space: pre-wrap;
}
.review-note {
  margin: 0.6rem 0 0;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--trab-border);
  font-size: 0.75rem;
  color: #6b7280;
  white-space: pre-wrap;
}
</style>
