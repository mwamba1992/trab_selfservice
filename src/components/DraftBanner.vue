<script setup>
import { useI18n } from 'vue-i18n';

defineProps({ show: { type: Boolean, default: false } });
defineEmits(['discard']);

const { t } = useI18n();
</script>

<template>
  <div v-if="show" class="draft-banner" role="status">
    <i class="pi pi-history"></i>
    <span class="flex-1">{{ t('common.draftRestored') }}</span>
    <button type="button" @click="$emit('discard')">{{ t('common.startOver') }}</button>
  </div>
</template>

<style scoped>
.draft-banner {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  border-radius: 10px;
  padding: 0.6rem 0.9rem;
  font-size: 0.82rem;
  margin-bottom: 1rem;
}
.draft-banner button {
  background: none;
  border: 1px solid #d97706;
  color: #92400e;
  border-radius: 6px;
  padding: 0.25rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
</style>
