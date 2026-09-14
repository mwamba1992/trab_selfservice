<script setup>
import { useI18n } from 'vue-i18n';
import { usePrimeVue } from 'primevue/config';
import { setLocale } from '@/i18n/index.js';

defineProps({
  // 'compact' shows EN/SW, 'full' shows the language names
  variant: { type: String, default: 'compact' },
});

const { locale, t } = useI18n();
const primevue = usePrimeVue();

const options = [
  { code: 'en', short: 'EN', label: 'English' },
  { code: 'sw', short: 'SW', label: 'Kiswahili' },
];
</script>

<template>
  <div class="lang-switch" :class="variant" role="group" :aria-label="t('common.language')">
    <button
      v-for="o in options"
      :key="o.code"
      type="button"
      :class="{ active: locale === o.code }"
      :aria-pressed="locale === o.code"
      :lang="o.code"
      @click="setLocale(o.code, primevue)"
    >
      {{ variant === 'full' ? o.label : o.short }}
    </button>
  </div>
</template>

<style scoped>
.lang-switch {
  display: inline-flex;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.lang-switch button {
  border: none;
  background: none;
  padding: 0.3rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  font-family: inherit;
}
.lang-switch.full button {
  padding: 0.5rem 1rem;
  font-size: 0.82rem;
}
.lang-switch button + button { border-left: 1px solid #e2e8f0; }
.lang-switch button.active {
  background: var(--trab-primary);
  color: #fff;
}
.lang-switch button:focus-visible {
  outline: 2px solid var(--trab-accent);
  outline-offset: -2px;
}
</style>
