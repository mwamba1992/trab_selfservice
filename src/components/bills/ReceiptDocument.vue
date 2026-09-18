<script setup>
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLabels } from '@/composables/useLabels.js';
import { formatMoney } from '@/utils/format.js';
import { numberToWords } from '@/utils/numberToWords.js';
import { ensureDocumentStyles } from '@/utils/print.js';

const props = defineProps({
  bill: { type: Object, required: true },
});

const { t, locale } = useI18n();
const { statusLabel } = useLabels();

onMounted(() => ensureDocumentStyles());

const fmt = (value) => formatMoney(value, locale.value);
const received = computed(() => Number(props.bill.paidAmount || props.bill.billedAmount || 0));
const outstanding = computed(() => Math.max(0, Number(props.bill.billedAmount || 0) - received.value));
const today = new Date().toISOString().split('T')[0];
</script>

<template>
  <div class="trab-doc">
    <div class="doc-header split">
      <img src="/coat-of-arms.svg" alt="" class="doc-logo" />
      <div class="doc-heading">
        <h2 class="doc-republic">{{ t('common.republic') }}</h2>
        <h3 class="doc-board">{{ t('common.board') }} (TRAB)</h3>
        <span class="doc-badge success">{{ t('bills.exchequerReceipt') }}</span>
      </div>
      <img src="/coat-of-arms.svg" alt="" class="doc-logo" />
    </div>

    <div class="section-title">{{ t('bills.receiptInfo') }}</div>
    <table>
      <tbody>
        <tr>
          <td class="label">{{ t('bills.receiptNumber') }}</td>
          <td>
            <strong>{{ bill.billReference }}</strong>
          </td>
        </tr>
        <tr>
          <td class="label">{{ t('bills.receivedFrom') }}</td>
          <td>{{ bill.payerName || t('common.dash') }}</td>
        </tr>
        <tr>
          <td class="label">{{ t('fields.amount') }}</td>
          <td class="paid-amount">TZS {{ fmt(received) }}</td>
        </tr>
        <tr>
          <td class="label">{{ t('bills.amountWords') }}</td>
          <td>
            <em>{{ numberToWords(received) }}.</em>
          </td>
        </tr>
        <tr>
          <td class="label">{{ t('bills.outstanding') }}</td>
          <td>TZS {{ fmt(outstanding) }}</td>
        </tr>
      </tbody>
    </table>

    <div class="section-title">{{ t('bills.inRespectOf') }}</div>
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
          <td colspan="2">{{ t('bills.totalBilled') }}</td>
          <td class="num">TZS {{ fmt(bill.billedAmount) }}</td>
        </tr>
      </tfoot>
    </table>

    <div class="section-title">{{ t('bills.additional') }}</div>
    <table>
      <tbody>
        <tr>
          <td class="label">{{ t('bills.billReference') }}</td>
          <td>{{ bill.billReference }}</td>
        </tr>
        <tr>
          <td class="label">{{ t('fields.controlNumber') }}</td>
          <td>
            <strong>{{ bill.billControlNumber || t('common.dash') }}</strong>
          </td>
        </tr>
        <tr>
          <td class="label">{{ t('bills.paymentDate') }}</td>
          <td>{{ bill.generatedDate || t('common.dash') }}</td>
        </tr>
        <tr>
          <td class="label">{{ t('bills.printedOn') }}</td>
          <td>{{ today }}</td>
        </tr>
      </tbody>
    </table>
    <div class="signature">
      <span>{{ t('bills.signature') }}</span>
    </div>
  </div>
</template>
