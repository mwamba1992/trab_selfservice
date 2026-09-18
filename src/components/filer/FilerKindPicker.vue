<script setup>
import { useI18n } from 'vue-i18n';
import { FILER_KINDS, KIND_ICONS } from '@/utils/filerKinds.js';

/**
 * What you are, as four things to pick rather than a list to open. The choice
 * decides which number is asked for next, so it is shown rather than hidden
 * behind a dropdown.
 */
defineProps({ modelValue: { type: String, required: true } });
const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();
</script>

<template>
  <div class="kinds" role="radiogroup" :aria-label="t('filer.kind')">
    <button
      v-for="kind in FILER_KINDS"
      :key="kind"
      type="button"
      role="radio"
      class="kind-tile"
      :class="{ chosen: modelValue === kind }"
      :aria-checked="modelValue === kind"
      @click="emit('update:modelValue', kind)"
    >
      <i class="pi" :class="KIND_ICONS[kind]"></i>
      <span>{{ t(`filer.kinds.${kind}`) }}</span>
    </button>
  </div>
</template>

<style scoped>
.kinds {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
.kind-tile {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.6rem 0.65rem;
  border: 1px solid var(--trab-border, #e2e8f0);
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.78rem;
  color: var(--trab-text, #0f172a);
  text-align: left;
  line-height: 1.3;
}
.kind-tile i {
  font-size: 0.95rem;
  color: var(--trab-muted, #64748b);
  flex: none;
}
.kind-tile:hover {
  border-color: var(--trab-primary, #047857);
}
.kind-tile.chosen {
  border-color: var(--trab-primary, #047857);
  background: #f0fdf4;
  font-weight: 600;
}
.kind-tile.chosen i {
  color: var(--trab-primary, #047857);
}
@media (max-width: 420px) {
  .kinds {
    grid-template-columns: 1fr;
  }
}
</style>
