<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import Skeleton from 'primevue/skeleton';
import Tag from 'primevue/tag';
import DocumentsDialog from '@/components/DocumentsDialog.vue';
import RepliesDialog from '@/components/RepliesDialog.vue';
import SubmissionsDialog from '@/components/SubmissionsDialog.vue';
import ExhibitsDialog from '@/components/ExhibitsDialog.vue';
import DecisionCopiesDialog from '@/components/DecisionCopiesDialog.vue';
import { SelfServiceAppeals, SelfServiceDocuments } from '@/service/SelfServiceApi.js';
import { useLabels } from '@/composables/useLabels.js';
import { apiErrorMessage, formatDate, formatDateTime, formatMoney } from '@/utils/format.js';
import { filingState } from '@/utils/filingStatus.js';
import { openPreview } from '@/utils/preview.js';
import { billTotals, fileSize, groupDocuments, timelineIcon } from '@/utils/caseFile.js';

/**
 * The digital case file: everything on one appeal — particulars, parties,
 * documents, hearings, bills and payments, the decision and the history of it
 * all — in one place, with the whole file downloadable as one bound PDF.
 */
const { t, te, locale } = useI18n();
const { statusLabel, docTypeLabel, applicationTypeLabel } = useLabels();
const route = useRoute();
const router = useRouter();
const id = String(route.params.id);

const file = ref(null);
const loading = ref(true);
const loadError = ref('');
const tab = ref('overview');

const load = async () => {
  loading.value = true;
  loadError.value = '';
  try {
    file.value = await SelfServiceAppeals.getCaseFile(id);
  } catch (err) {
    file.value = null;
    loadError.value = apiErrorMessage(err, t('caseFile.loadFailed'));
  } finally {
    loading.value = false;
  }
};
onMounted(load);

const appeal = computed(() => file.value?.appeal ?? null);
const decided = computed(() => !!appeal.value?.decidedDate && appeal.value?.outcomeOfDecision !== 'NO DECISION');
const groups = computed(() => groupDocuments(file.value?.documents));
const totals = computed(() => billTotals(file.value?.bills));
const owing = computed(() => totals.value.filter((row) => row.outstanding > 0));

const tabs = computed(() => {
  const f = file.value;
  if (!f) return [];
  return [
    { key: 'overview', icon: 'pi-info-circle', count: 0 },
    { key: 'documents', icon: 'pi-folder-open', count: f.documents.length },
    { key: 'hearings', icon: 'pi-calendar', count: f.hearings.length },
    { key: 'billing', icon: 'pi-wallet', count: f.bills.length },
    ...(decided.value || f.judgements.length ? [{ key: 'decision', icon: 'pi-verified', count: 0 }] : []),
    { key: 'timeline', icon: 'pi-history', count: 0 },
  ];
});

const onTabKey = (event, index) => {
  const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
  if (!step) return;
  event.preventDefault();
  const next = tabs.value[(index + step + tabs.value.length) % tabs.value.length];
  tab.value = next.key;
  document.getElementById(`case-tab-${next.key}`)?.focus();
};

const caseRef = computed(() => appeal.value?.appealNo || appeal.value?.caseRef || appeal.value?.appellantName || '');
const statusSeverity = (s) => ({ NEW: 'info', HEARING_SCHEDULED: 'warn', CONCLUDED: 'secondary', DECIDED: 'success' })[s] || 'info';
const partyName = (party) => (party === 'RESPONDENT' ? t('status.RESPONDENT') : t('status.APPELLANT'));

/** An event in the reader's language, from its code; the English title if the code is new. */
const eventTitle = (e) => {
  const key = `caseFile.event.${e.code}`;
  if (!e.code || !te(key)) return e.title;
  const p = e.params ?? {};
  const stageKey = `caseFile.stage.${p.stage}`;
  return t(key, {
    ...p,
    party: p.party ? partyName(p.party).toLowerCase() : '',
    stage: p.stage && te(stageKey) ? t(stageKey) : (p.stage ?? ''),
    wonBy: p.wonBy ? statusLabel(p.wonBy) : '',
  });
};
const disputed = computed(() => (file.value?.amounts ?? []).map((a) => `${a.currency} ${formatMoney(a.amount, locale.value)}`).join(' · '));

const openDocument = (doc) =>
  openPreview({
    fileName: doc.originalName,
    title: doc.originalName,
    downloadName: doc.originalName,
    load: () => SelfServiceDocuments.download(doc.id),
  });

const openBundle = () =>
  openPreview({
    fileName: `Case_file_${caseRef.value}.pdf`,
    title: t('caseFile.bundleTitle', { ref: caseRef.value }),
    downloadName: `Case_file_${String(caseRef.value).replace(/[^\w.-]/g, '_')}.pdf`,
    load: () => SelfServiceAppeals.downloadCaseFile(id),
  });

// The existing windows for adding to the file; the file reloads when they close.
const dialog = ref('');
const dialogAppeal = computed(() =>
  appeal.value ? { id, appealNo: appeal.value.appealNo, appellantName: appeal.value.appellantName } : null,
);
const openDialog = (name) => (dialog.value = name);
const closeDialog = (open) => {
  if (open) return;
  dialog.value = '';
  load();
};
</script>

<template>
  <div>
    <div class="page-header detail-header">
      <div>
        <p class="eyebrow">{{ t('caseFile.eyebrow') }}</p>
        <h2>{{ appeal?.appealNo || appeal?.caseRef || t('notices.awaitingPayment') }}</h2>
        <p>{{ appeal?.appellantName }}</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <Button v-if="file" :label="t('caseFile.download')" icon="pi pi-file-pdf" class="trab-btn" size="small" @click="openBundle" />
        <Button :label="t('common.back')" icon="pi pi-arrow-left" outlined size="small" @click="router.push('/appeals')" />
      </div>
    </div>

    <div v-if="loading && !file" class="detail-grid" aria-busy="true" aria-live="polite">
      <div class="ss-card h-fit">
        <Skeleton width="40%" height="0.8rem" class="mb-4" />
        <Skeleton v-for="n in 8" :key="n" height="1.1rem" class="mb-3" />
      </div>
      <div class="ss-card">
        <div class="flex gap-3 mb-5"><Skeleton v-for="n in 5" :key="n" width="6rem" height="2rem" /></div>
        <Skeleton height="6rem" class="mb-4" />
        <Skeleton width="70%" height="1rem" />
      </div>
    </div>

    <div v-else-if="!file" class="ss-card load-error" role="alert">
      <i class="pi pi-exclamation-triangle"></i>
      <h3>{{ t('caseFile.openFailed') }}</h3>
      <p>{{ loadError }}</p>
      <div class="flex gap-2 justify-center flex-wrap">
        <Button :label="t('common.retry')" icon="pi pi-refresh" class="trab-btn" @click="load" />
        <Button :label="t('caseFile.backToAppeals')" outlined @click="router.push('/appeals')" />
      </div>
    </div>

    <template v-else>
      <div v-if="appeal.filingStatus === 'RETURNED'" class="notice-banner danger" role="alert">
        <i class="pi pi-exclamation-circle"></i>
        <div>
          <strong>{{ t('caseFile.returned') }}</strong>
          <p v-if="appeal.returnReason">{{ t('filingStatus.reason') }}: {{ appeal.returnReason }}</p>
        </div>
      </div>
      <div v-if="owing.length" class="notice-banner warn" role="status">
        <i class="pi pi-wallet"></i>
        <div>
          <strong>{{ t('caseFile.owing') }}</strong>
          <p>
            <span v-for="row in owing" :key="row.currency" class="mr-3">{{ row.currency }} {{ formatMoney(row.outstanding, locale) }}</span>
            <a href="#" @click.prevent="tab = 'billing'">{{ t('caseFile.seeBills') }}</a>
          </p>
        </div>
      </div>

      <div class="detail-grid">
        <aside class="ss-card h-fit summary" :aria-label="t('caseFile.summary')">
          <p class="section-title">{{ t('caseFile.summary') }}</p>
          <div class="tags">
            <Tag :value="statusLabel(appeal.statusTrend)" :severity="statusSeverity(appeal.statusTrend)" />
            <Tag :value="t(filingState(appeal).key)" :severity="filingState(appeal).severity" />
          </div>
          <dl>
            <dt>{{ t('fields.caseRef') }}</dt>
            <dd class="case-ref">{{ appeal.caseRef || t('common.dash') }}</dd>
            <dt>{{ t('fields.appealNo') }}</dt>
            <dd>{{ appeal.appealNo || t('common.dash') }}</dd>
            <template v-if="file.notice">
              <dt>{{ t('caseFile.noticeNo') }}</dt>
              <dd>{{ file.notice.noticeNo || t('common.dash') }}</dd>
            </template>
            <dt>{{ t('appeals.dateFiled') }}</dt>
            <dd>{{ formatDate(appeal.dateOfFiling) }}</dd>
            <dt>{{ t('fields.taxType') }}</dt>
            <dd>{{ appeal.taxType || t('common.dash') }}</dd>
            <template v-if="appeal.region">
              <dt>{{ t('caseFile.registry') }}</dt>
              <dd>{{ appeal.region }}</dd>
            </template>
            <template v-if="disputed">
              <dt>{{ t('caseFile.disputed') }}</dt>
              <dd>{{ disputed }}</dd>
            </template>
            <template v-if="file.hearings.length">
              <dt>{{ t('caseFile.lastHearing') }}</dt>
              <dd>{{ formatDate(file.hearings[file.hearings.length - 1].startDate) }}</dd>
            </template>
            <template v-if="decided">
              <dt>{{ t('appeals.outcome') }}</dt>
              <dd>{{ appeal.outcomeOfDecision }}</dd>
            </template>
          </dl>
        </aside>

        <section class="ss-card min-w-0 tab-card">
          <div class="tab-bar" role="tablist" :aria-label="t('caseFile.sections')">
            <button
              v-for="(item, index) in tabs"
              :id="`case-tab-${item.key}`"
              :key="item.key"
              type="button"
              role="tab"
              class="detail-tab"
              :class="{ active: tab === item.key }"
              :aria-selected="tab === item.key"
              :aria-controls="`case-panel-${item.key}`"
              :tabindex="tab === item.key ? 0 : -1"
              @click="tab = item.key"
              @keydown="onTabKey($event, index)"
            >
              <i class="pi" :class="item.icon"></i> {{ t(`caseFile.tabs.${item.key}`) }}
              <Tag v-if="item.count" :value="String(item.count)" severity="secondary" class="ml-1" />
            </button>
          </div>

          <div :id="`case-panel-${tab}`" role="tabpanel" :aria-labelledby="`case-tab-${tab}`" class="tab-panel">
            <!-- Overview -->
            <template v-if="tab === 'overview'">
              <p class="section-title">{{ t('caseFile.particulars') }}</p>
              <dl class="grid-dl">
                <dt>{{ t('fileAppeal.natureOfAppeal') }}</dt>
                <dd>{{ appeal.natureOfAppeal || t('common.dash') }}</dd>
                <dt>{{ t('fileAppeal.assessmentNo') }}</dt>
                <dd>{{ appeal.assessmentNo || t('common.dash') }}</dd>
                <dt>{{ t('fileAppeal.taxedOffice') }}</dt>
                <dd>{{ appeal.taxedOffice || t('common.dash') }}</dd>
                <dt>{{ t('fileAppeal.bankNo') }}</dt>
                <dd>{{ appeal.bankNo || t('common.dash') }}</dd>
                <dt>{{ t('fileAppeal.billEntryNo') }}</dt>
                <dd>{{ appeal.billEntryNo || t('common.dash') }}</dd>
                <template v-if="file.notice">
                  <dt>{{ t('caseFile.dateOfDecision') }}</dt>
                  <dd>{{ formatDate(file.notice.dateOfTaxationDecision) }}</dd>
                </template>
              </dl>

              <div class="two-col">
                <div>
                  <p class="section-title">{{ t('fields.appellants') }}</p>
                  <div v-for="(p, i) in file.parties.appellants" :key="`a${i}`" class="line-row">
                    <span
                      >{{ p.name }}<small v-if="p.tin" class="muted"> · {{ t('caseFile.tin') }} {{ p.tin }}</small></span
                    >
                    <Tag :value="statusLabel(p.role)" severity="info" />
                  </div>
                  <p v-if="!file.parties.appellants.length" class="muted">{{ appeal.appellantName }}</p>
                </div>
                <div>
                  <p class="section-title">{{ t('fields.respondents') }}</p>
                  <div v-for="(p, i) in file.parties.respondents" :key="`r${i}`" class="line-row">
                    <span>{{ p.name }}</span>
                    <Tag :value="statusLabel(p.role)" severity="secondary" />
                  </div>
                </div>
              </div>

              <p class="section-title">{{ t('fileAppeal.witnesses') }}</p>
              <div v-for="(w, i) in file.witnesses" :key="`w${i}`" class="line-row">
                <span>{{ w.fullName }}</span
                ><span class="muted">{{ w.phoneNumber }}</span>
              </div>
              <p v-if="!file.witnesses.length" class="muted">{{ t('caseFile.noWitnesses') }}</p>

              <template v-if="file.applications.length">
                <p class="section-title">{{ t('caseFile.applications') }}</p>
                <div v-for="a in file.applications" :key="a.id" class="line-row">
                  <span
                    ><strong>{{ a.applicationNo || t('common.dash') }}</strong> · {{ applicationTypeLabel(a.applicationType) }} ·
                    {{ formatDate(a.dateOfFiling) }}</span
                  >
                  <Tag :value="statusLabel(a.status)" severity="secondary" />
                </div>
              </template>
            </template>

            <!-- Documents -->
            <template v-else-if="tab === 'documents'">
              <div class="panel-actions">
                <Button
                  :label="t('caseFile.addDocument')"
                  icon="pi pi-upload"
                  size="small"
                  class="trab-btn"
                  @click="openDialog('documents')"
                />
                <Button :label="t('replies.title')" icon="pi pi-comments" size="small" outlined @click="openDialog('replies')" />
                <Button :label="t('submissions.title')" icon="pi pi-file-edit" size="small" outlined @click="openDialog('submissions')" />
                <Button :label="t('exhibits.title')" icon="pi pi-bookmark" size="small" outlined @click="openDialog('exhibits')" />
              </div>
              <div v-for="group in groups" :key="group.section" class="doc-group">
                <p class="section-title">{{ t(`caseFile.section.${group.section}`) }}</p>
                <div v-for="doc in group.items" :key="doc.id" class="doc-row">
                  <i class="pi doc-icon" :class="doc.locked ? 'pi-lock' : 'pi-file'"></i>
                  <div class="doc-main">
                    <span class="doc-name">{{ doc.originalName }}</span>
                    <span class="muted"
                      >{{ docTypeLabel(doc.documentType) }} · {{ formatDate(doc.createdAt) }} · {{ fileSize(doc.fileSize) }}
                      <template v-if="doc.originType !== 'APPEAL'">
                        · {{ t(`caseFile.origin.${doc.originType}`, { ref: doc.originRef || '' }) }}</template
                      ></span
                    >
                    <span v-if="doc.locked" class="locked">{{ t('caseFile.lockedCopy') }}</span>
                  </div>
                  <Button
                    v-if="doc.locked"
                    :label="t('caseFile.requestCopy')"
                    icon="pi pi-shopping-cart"
                    size="small"
                    outlined
                    @click="openDialog('copies')"
                  />
                  <Button v-else :label="t('common.view')" icon="pi pi-eye" size="small" text @click="openDocument(doc)" />
                </div>
              </div>
              <div v-if="!groups.length" class="empty-state">
                <i class="pi pi-folder-open"></i>
                <p>{{ t('caseFile.noDocuments') }}</p>
              </div>
            </template>

            <!-- Hearings -->
            <template v-else-if="tab === 'hearings'">
              <p class="section-title">{{ t('caseFile.hearings') }}</p>
              <div v-for="h in file.hearings" :key="h.summonsId" class="hearing">
                <div class="hearing-date">
                  <strong>{{ formatDate(h.startDate) }}</strong>
                  <span class="muted">{{ h.time }}</span>
                </div>
                <div class="min-w-0">
                  <div>{{ h.venue || t('common.dash') }}</div>
                  <div class="muted">
                    <template v-if="h.chairperson">{{ h.chairperson }} — {{ t('caseFile.chairperson') }}</template>
                    <template v-for="m in h.members" :key="m"> · {{ m }}</template>
                  </div>
                </div>
                <Tag :value="statusLabel(h.status)" severity="secondary" />
              </div>
              <p v-if="!file.hearings.length" class="muted">{{ t('caseFile.noHearings') }}</p>

              <p class="section-title">{{ t('caseFile.proceedings') }}</p>
              <div v-for="p in file.proceedings" :key="p.id" class="line-row">
                <span
                  ><strong>{{ formatDate(p.hearingDate) }}</strong> · {{ p.coram }}</span
                >
                <span class="muted">{{ t('caseFile.signedOn', { date: formatDate(p.signedAt) }) }}</span>
              </div>
              <p v-if="!file.proceedings.length" class="muted">{{ t('caseFile.noProceedings') }}</p>

              <p class="section-title">{{ t('exhibits.title') }}</p>
              <div v-for="e in file.exhibits" :key="e.id" class="line-row">
                <span
                  ><strong>{{ e.mark || t('common.dash') }}</strong> · {{ e.description || t('common.dash') }} ·
                  {{ partyName(e.party) }}</span
                >
                <Tag :value="t(`caseFile.ruling.${e.ruling}`)" :severity="e.ruling === 'ADMITTED' ? 'success' : 'danger'" />
              </div>
              <p v-if="!file.exhibits.length" class="muted">{{ t('caseFile.noExhibits') }}</p>
            </template>

            <!-- Bills and payments -->
            <template v-else-if="tab === 'billing'">
              <div class="totals">
                <div v-for="row in totals" :key="row.currency" class="total-card">
                  <span class="muted">{{ row.currency }}</span>
                  <div>
                    <small>{{ t('caseFile.billed') }}</small
                    ><strong>{{ formatMoney(row.billed, locale) }}</strong>
                  </div>
                  <div>
                    <small>{{ t('caseFile.paid') }}</small
                    ><strong class="ok">{{ formatMoney(row.paid, locale) }}</strong>
                  </div>
                  <div>
                    <small>{{ t('caseFile.outstanding') }}</small
                    ><strong :class="{ due: row.outstanding > 0 }">{{ formatMoney(row.outstanding, locale) }}</strong>
                  </div>
                </div>
              </div>

              <p class="section-title">{{ t('caseFile.bills') }}</p>
              <div class="table-wrap">
                <table class="plain">
                  <thead>
                    <tr>
                      <th>{{ t('caseFile.billFor') }}</th>
                      <th>{{ t('caseFile.controlNo') }}</th>
                      <th class="num">{{ t('caseFile.amount') }}</th>
                      <th>{{ t('common.status') }}</th>
                      <th>{{ t('caseFile.expires') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="b in file.bills" :key="b.id">
                      <td>
                        {{ b.description || t(`caseFile.billKind.${b.kind}`) }}
                        <div class="muted">{{ t(`caseFile.billKind.${b.kind}`) }}</div>
                      </td>
                      <td class="mono">{{ b.controlNumber || t('common.dash') }}</td>
                      <td class="num">{{ b.currency }} {{ formatMoney(b.billedAmount, locale) }}</td>
                      <td>
                        <Tag :value="statusLabel(b.billPaid ? 'PAID' : 'UNPAID')" :severity="b.billPaid ? 'success' : 'warn'" />
                      </td>
                      <td>{{ b.billPaid ? t('common.dash') : formatDate(b.expiryDate) }}</td>
                    </tr>
                    <tr v-if="!file.bills.length">
                      <td colspan="5" class="muted">{{ t('caseFile.noBills') }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p class="section-title">{{ t('caseFile.payments') }}</p>
              <div class="table-wrap">
                <table class="plain">
                  <thead>
                    <tr>
                      <th>{{ t('caseFile.receipt') }}</th>
                      <th>{{ t('caseFile.paidOn') }}</th>
                      <th>{{ t('caseFile.channel') }}</th>
                      <th class="num">{{ t('caseFile.amount') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="p in file.payments" :key="p.id">
                      <td class="mono">{{ p.receiptNumber || t('common.dash') }}</td>
                      <td>{{ formatDate(p.paymentDate) }}</td>
                      <td>{{ p.pspName || p.channel || t('common.dash') }}</td>
                      <td class="num">{{ formatMoney(p.paidAmount, locale) }}</td>
                    </tr>
                    <tr v-if="!file.payments.length">
                      <td colspan="4" class="muted">{{ t('caseFile.noPayments') }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>

            <!-- Decision -->
            <template v-else-if="tab === 'decision'">
              <dl v-if="decided" class="grid-dl">
                <dt>{{ t('appeals.outcome') }}</dt>
                <dd>
                  <strong>{{ appeal.outcomeOfDecision }}</strong>
                </dd>
                <dt>{{ t('appeals.decisionDate') }}</dt>
                <dd>{{ formatDate(appeal.decidedDate) }}</dd>
                <dt>{{ t('appeals.wonBy') }}</dt>
                <dd>{{ appeal.wonBy || t('common.dash') }}</dd>
              </dl>
              <div v-if="appeal.summaryOfDecree" class="soft-panel">
                <strong class="text-label">{{ t('appeals.summary') }}:</strong>
                <p class="mt-1 mb-0">{{ appeal.summaryOfDecree }}</p>
              </div>
              <div v-for="j in file.judgements" :key="j.id" class="line-row">
                <span
                  ><strong>{{ t('docTypes.JUDGEMENT') }}</strong> · {{ formatDate(j.deliveredDate) }} · {{ j.outcome }}</span
                >
                <span class="muted">{{ t('caseFile.signedOn', { date: formatDate(j.signedAt) }) }}</span>
              </div>
              <div class="panel-actions mt-3">
                <Button :label="t('caseFile.requestCopy')" icon="pi pi-shopping-cart" size="small" outlined @click="openDialog('copies')" />
              </div>
              <template v-if="file.decisionHistory.length">
                <p class="section-title">{{ t('caseFile.retrials') }}</p>
                <div v-for="(h, i) in file.decisionHistory" :key="i" class="line-row">
                  <span>{{ h.previousDecision }} — {{ h.reason }}</span>
                  <span class="muted">{{ formatDate(h.createdAt) }}</span>
                </div>
              </template>
            </template>

            <!-- Timeline -->
            <template v-else-if="tab === 'timeline'">
              <ol class="timeline">
                <li v-for="(e, i) in [...file.timeline].reverse()" :key="i">
                  <span class="dot"><i class="pi" :class="timelineIcon(e.kind)"></i></span>
                  <div>
                    <div class="t-title">{{ eventTitle(e) }}</div>
                    <div v-if="e.detail" class="muted">{{ e.detail }}</div>
                    <div class="t-date">{{ e.at.length > 10 ? formatDateTime(e.at, locale) : formatDate(e.at) }}</div>
                  </div>
                </li>
              </ol>
              <p class="muted small">{{ t('caseFile.timelineNote') }}</p>
            </template>
          </div>
        </section>
      </div>
    </template>

    <DocumentsDialog
      :visible="dialog === 'documents'"
      :api="SelfServiceAppeals"
      :source-id="id"
      default-type="ANNEXTURE"
      charges-annextures
      :reference="caseRef"
      @update:visible="closeDialog"
    />
    <RepliesDialog :visible="dialog === 'replies'" :appeal="dialogAppeal" @update:visible="closeDialog" />
    <SubmissionsDialog :visible="dialog === 'submissions'" :appeal="dialogAppeal" @update:visible="closeDialog" />
    <ExhibitsDialog :visible="dialog === 'exhibits'" :appeal="dialogAppeal" @update:visible="closeDialog" />
    <DecisionCopiesDialog :visible="dialog === 'copies'" :decision="dialogAppeal" @update:visible="closeDialog" />
  </div>
</template>

<style scoped>
.case-ref {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.eyebrow {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--trab-label);
  margin: 0 0 0.15rem;
}
.detail-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1fr);
}
@media (min-width: 1024px) {
  .detail-grid {
    grid-template-columns: 290px minmax(0, 1fr);
  }
}
.summary dl,
.grid-dl {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.45rem 1rem;
  margin: 0;
  font-size: 0.82rem;
}
.summary dl {
  grid-template-columns: minmax(0, 1fr);
  gap: 0.1rem;
}
.summary dd {
  margin: 0 0 0.55rem;
  font-weight: 600;
}
.grid-dl dd {
  margin: 0;
}
dt {
  color: var(--trab-label);
  font-size: 0.75rem;
}
.tags {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-bottom: 0.9rem;
}
.section-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--trab-label);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 1.1rem 0 0.5rem;
}
.tab-panel > .section-title:first-child,
.summary > .section-title:first-child,
.doc-group:first-of-type .section-title {
  margin-top: 0;
}
.two-col {
  display: grid;
  gap: 0 1.5rem;
  grid-template-columns: minmax(0, 1fr);
}
@media (min-width: 768px) {
  .two-col {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.line-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid var(--trab-line);
  font-size: 0.82rem;
}
.muted {
  color: #6b7280;
  font-size: 0.78rem;
}
.small {
  font-size: 0.72rem;
}
.panel-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.doc-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid var(--trab-line);
}
.doc-icon {
  color: var(--trab-primary);
  font-size: 1.05rem;
}
.doc-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.doc-name {
  font-weight: 600;
  font-size: 0.84rem;
  overflow-wrap: anywhere;
}
.locked {
  color: #b45309;
  font-size: 0.74rem;
}
.hearing {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--trab-line);
  font-size: 0.82rem;
}
.hearing > .min-w-0 {
  flex: 1;
}
.hearing-date {
  display: flex;
  flex-direction: column;
  min-width: 6.5rem;
}
.totals {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.total-card {
  display: grid;
  grid-template-columns: auto repeat(3, minmax(0, 1fr));
  gap: 1rem;
  align-items: center;
  flex: 1 1 22rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--trab-border);
  border-radius: 10px;
}
.total-card small {
  display: block;
  color: var(--trab-label);
  font-size: 0.7rem;
}
.total-card strong {
  font-size: 0.95rem;
}
.ok {
  color: #047857;
}
.due {
  color: #b45309;
}
.table-wrap {
  overflow-x: auto;
}
table.plain {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}
table.plain th {
  text-align: left;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--trab-label);
  padding: 0.4rem 0.6rem 0.4rem 0;
  border-bottom: 1px solid var(--trab-border);
}
table.plain td {
  padding: 0.5rem 0.6rem 0.5rem 0;
  border-bottom: 1px solid var(--trab-line);
  vertical-align: top;
}
.num {
  text-align: right;
  white-space: nowrap;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.78rem;
}
.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
}
.timeline li {
  display: flex;
  gap: 0.8rem;
  position: relative;
  padding-bottom: 1rem;
}
.timeline li:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 0.95rem;
  top: 2rem;
  bottom: 0;
  width: 2px;
  background: var(--trab-line);
}
.dot {
  flex: none;
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ecfdf5;
  color: var(--trab-primary);
  font-size: 0.8rem;
}
.t-title {
  font-weight: 600;
  font-size: 0.84rem;
}
.t-date {
  font-size: 0.72rem;
  color: var(--trab-label);
  margin-top: 0.1rem;
}
.notice-banner {
  display: flex;
  gap: 0.7rem;
  align-items: flex-start;
  padding: 0.8rem 1rem;
  margin-bottom: 0.75rem;
  border-radius: 10px;
  font-size: 0.85rem;
}
.notice-banner p {
  margin: 0.2rem 0 0;
}
.notice-banner.danger {
  border: 1px solid #fecaca;
  border-left: 4px solid #dc2626;
  background: #fef2f2;
  color: #991b1b;
}
.notice-banner.warn {
  border: 1px solid #fde68a;
  border-left: 4px solid #d97706;
  background: #fffbeb;
  color: #92400e;
}
.notice-banner a {
  color: inherit;
  font-weight: 600;
}
.tab-card {
  padding: 0;
}
.tab-bar {
  display: flex;
  overflow-x: auto;
  border-bottom: 1px solid var(--trab-border);
}
.tab-panel {
  padding: 1.25rem;
}
.detail-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.9rem 1.1rem;
  font-weight: 600;
  font-size: 0.82rem;
  color: #6b7280;
  border: 0;
  border-bottom: 3px solid transparent;
  background: none;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
}
.detail-tab:hover,
.detail-tab.active {
  color: var(--trab-primary);
}
.detail-tab.active {
  border-bottom-color: var(--trab-primary);
}
.detail-tab:focus-visible {
  outline: 2px solid var(--trab-primary);
  outline-offset: -2px;
}
.load-error {
  text-align: center;
  padding: 2.5rem 1.25rem;
}
.load-error > i {
  font-size: 2rem;
  color: var(--trab-danger);
}
.load-error h3 {
  font-size: 1rem;
  font-weight: 700;
  margin: 0.75rem 0 0.35rem;
}
.load-error p {
  font-size: 0.82rem;
  color: #6b7280;
  margin: 0 0 1.1rem;
}
</style>
