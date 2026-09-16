<script setup>
defineProps({
  message: { type: String, required: true },
  compact: { type: Boolean, default: false },
});
const emit = defineEmits(['retry']);
</script>

<template>
  <div class="section-error" :class="{ compact }" role="alert">
    <i class="pi pi-exclamation-circle"></i>
    <span class="msg">{{ message }}</span>
    <button type="button" class="retry" @click="emit('retry')"><i class="pi pi-refresh"></i> Retry</button>
  </div>
</template>

<style scoped>
.section-error {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  padding: 0.7rem 0.9rem;
  border-radius: 8px;
  background: #fef3f2;
  border: 1px solid #fecdca;
  color: #b42318;
  font-size: 0.82rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}
.section-error.compact {
  padding: 0.45rem 0.65rem;
  font-size: 0.76rem;
}
.msg {
  flex: 1;
  min-width: 0;
}
.retry {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 700;
  font-size: 0.76rem;
  color: #b42318;
  background: #fff;
  border: 1px solid #fecdca;
  border-radius: 6px;
  padding: 0.25rem 0.6rem;
  cursor: pointer;
  font-family: inherit;
}
.retry:hover {
  background: #fee4e2;
}
</style>
