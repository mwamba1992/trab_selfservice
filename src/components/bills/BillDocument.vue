<script setup>
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLabels } from '@/composables/useLabels.js';
import { formatMoney } from '@/utils/format.js';
import { numberToWords } from '@/utils/numberToWords.js';
import { ensureDocumentStyles } from '@/utils/print.js';

const props = defineProps({
  bill: { type: Object, required: true },
  qrDataUrl: { type: String, default: '' },
});

const { t, locale } = useI18n();
const { statusLabel } = useLabels();

onMounted(() => ensureDocumentStyles());

const fmt = (value) => formatMoney(value, locale.value);
const controlNumber = computed(() => props.bill.billControlNumber || t('bills.pendingControl'));
const today = new Date().toISOString().split('T')[0];
</script>

<template>
  <div class="trab-doc">
    <div class="doc-header">
      <img src="/coat-of-arms.svg" alt="" class="doc-logo" />
      <h2 class="doc-republic">{{ t('common.republic') }}</h2>
      <h3 class="doc-board">{{ t('common.board') }} (TRAB)</h3>
      <span class="doc-badge">{{ t('bills.governmentBill') }}</span>
    </div>

    <div class="section-title">{{ t('bills.billInfo') }}</div>
    <div class="bill-info">
      <table>
        <tbody>
          <tr>
            <td class="label">{{ t('fields.controlNumber') }}</td>
            <td>
              <strong>{{ controlNumber }}</strong>
            </td>
          </tr>
          <tr>
            <td class="label">{{ t('bills.paymentReference') }}</td>
            <td>{{ bill.billReference }}</td>
          </tr>
          <tr>
            <td class="label">{{ t('bills.payerName') }}</td>
            <td>{{ bill.payerName }}</td>
          </tr>
          <tr>
            <td class="label">{{ t('bills.payerPhone') }}</td>
            <td>{{ bill.payerPhone || t('common.dash') }}</td>
          </tr>
          <tr>
            <td class="label">{{ t('bills.description') }}</td>
            <td>{{ bill.billDescription || statusLabel(bill.appType) }}</td>
          </tr>
          <tr>
            <td class="label">{{ t('common.status') }}</td>
            <td>
              <strong :class="bill.billPaid ? 'status-paid' : 'status-unpaid'">{{ statusLabel(bill.billPaid ? 'PAID' : 'UNPAID') }}</strong>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="qrDataUrl" class="qr">
        <img :src="qrDataUrl" alt="QR" />
        {{ t('bills.scanToPay') }}
      </div>
    </div>

    <div class="section-title">{{ t('bills.items') }}</div>
    <table class="items">
      <thead>
        <tr>
          <th>#</th>
          <th>{{ t('bills.itemDescription') }}</th>
          <th class="num">{{ t('bills.amountTzs') }}</th>
        </tr>
      </thead>
      <tbody>
        <template v-if="bill.items?.length">
          <tr v-for="(item, i) in bill.items" :key="i">
            <td>{{ i + 1 }}</td>
            <td>{{ item.description }}</td>
            <td class="num">{{ fmt(item.amount) }}</td>
          </tr>
        </template>
        <tr v-else>
          <td>1</td>
          <td>{{ bill.billDescription || statusLabel(bill.appType) }}</td>
          <td class="num">{{ fmt(bill.billedAmount) }}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="2">{{ t('common.total') }}</td>
          <td class="num">TZS {{ fmt(bill.billedAmount) }}</td>
        </tr>
      </tfoot>
    </table>

    <div class="section-title">{{ t('bills.additional') }}</div>
    <table>
      <tbody>
        <tr>
          <td class="label">{{ t('bills.amountWords') }}</td>
          <td>
            <em>{{ numberToWords(bill.billedAmount) }}.</em>
          </td>
        </tr>
        <tr>
          <td class="label">{{ t('bills.expiresOn') }}</td>
          <td>{{ bill.expiryDate || t('common.dash') }}</td>
        </tr>
        <tr>
          <td class="label">{{ t('bills.dateIssued') }}</td>
          <td>{{ bill.generatedDate }}</td>
        </tr>
        <tr>
          <td class="label">{{ t('bills.printedOn') }}</td>
          <td>{{ today }}</td>
        </tr>
      </tbody>
    </table>

    <!-- Payment instructions are always printed in both languages -->
    <div class="section-title">{{ t('bills.instructions') }}</div>
    <div class="pay-grid">
      <div class="pay-box" lang="sw">
        <h4>Jinsi ya Kulipa</h4>
        <p>
          Kupitia Benki: Fika tawi lolote au wakala wa benki NMB, BOT. Namba ya kumbukumbu:
          <strong>{{ bill.billControlNumber || '-' }}</strong>
        </p>
        <p>
          Kupitia Mitandao ya Simu:<br />Chagua 4 (Lipa Bili) → Chagua 5 (Malipo ya Serikali) → Ingiza
          <strong>{{ bill.billControlNumber || '-' }}</strong>
        </p>
      </div>
      <div class="pay-box" lang="en">
        <h4>How to Pay</h4>
        <p>
          Via Bank: Visit any NMB or BOT branch. Reference: <strong>{{ bill.billControlNumber || '-' }}</strong>
        </p>
        <p>
          Via Mobile:<br />Select 4 (Bill Payment) → 5 (Government) → Enter <strong>{{ bill.billControlNumber || '-' }}</strong>
        </p>
      </div>
    </div>
  </div>
</template>
