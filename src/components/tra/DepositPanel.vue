<script setup>
import { computed } from 'vue';
import Tag from 'primevue/tag';
import { formatMoney } from '@/utils/format.js';

const props = defineProps({
  appeal: { type: Object, required: true },
});

const deposit = computed(() => props.appeal.deposit ?? null);
// Nothing to show unless the appeal carries disputed amounts or a filing-fee bill
const hasFigures = computed(() => !!deposit.value && (deposit.value.disputed.length > 0 || deposit.value.bill));

const money = (a) => `${a.currency} ${formatMoney(a.amount)}`;
</script>

<template>
  <section v-if="hasFigures" class="deposit" aria-labelledby="deposit-title">
    <h3 id="deposit-title" class="deposit-title">Deposit Check</h3>

    <template v-if="deposit?.disputed.length">
      <dl class="rows">
        <div>
          <dt>Tax in dispute</dt>
          <dd>
            <div v-for="a in deposit.disputed" :key="`d-${a.currency}`">{{ money(a) }}</div>
          </dd>
        </div>
        <div>
          <dt>One third</dt>
          <dd>
            <div v-for="a in deposit.oneThird" :key="`t-${a.currency}`">{{ money(a) }}</div>
          </dd>
        </div>
      </dl>
    </template>
    <p v-else class="note">No disputed amounts recorded on this appeal.</p>

    <template v-if="deposit?.bill">
      <dl class="rows">
        <div>
          <dt>Filing fee</dt>
          <dd>
            {{ deposit.bill.currency }} {{ formatMoney(deposit.bill.paidAmount) }} of
            {{ formatMoney(deposit.bill.billedAmount) }}
            <Tag :value="deposit.bill.billPaid ? 'Paid' : 'Unpaid'" :severity="deposit.bill.billPaid ? 'success' : 'warn'" class="ml-1" />
          </dd>
        </div>
        <div v-if="deposit.bill.controlNumber">
          <dt>Control no.</dt>
          <dd>{{ deposit.bill.controlNumber }}</dd>
        </div>
      </dl>
    </template>

    <p class="note">
      The Act requires the tax not in dispute, or one third of the assessed tax, whichever is greater. The Board records the filing fee, not
      that deposit, so confirm the payment in TRA's own system.
    </p>
  </section>
</template>

<style scoped>
.deposit {
  margin: 0 0 1rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--trab-border);
  border-radius: 9px;
}
.deposit-title {
  margin: 0 0 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #6b7280;
}
.rows {
  margin: 0 0 0.5rem;
  display: grid;
  gap: 0.5rem;
}
.rows dt {
  font-size: 0.7rem;
  color: #6b7280;
}
.rows dd {
  margin: 0.15rem 0 0;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--trab-heading);
  font-variant-numeric: tabular-nums;
}
.note {
  margin: 0.5rem 0 0;
  font-size: 0.7rem;
  line-height: 1.5;
  color: #6b7280;
}
</style>
