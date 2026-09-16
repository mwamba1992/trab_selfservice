<script setup>
import { computed, ref } from 'vue';
import Button from 'primevue/button';

/**
 * A file chooser that looks like the rest of the form. The browser's own file
 * input is invisible against a styled dialog — the control is kept for the
 * keyboard and for assistive technology, and hidden behind this button.
 */
const props = defineProps({
  modelValue: { type: Object, default: null },
  accept: { type: String, default: '.pdf,application/pdf' },
  label: { type: String, required: true },
  hint: { type: String, required: true },
  invalid: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  inputId: { type: String, required: true },
  removeLabel: { type: String, default: 'Remove' },
});
const emit = defineEmits(['update:modelValue', 'change']);

const input = ref(null);
const dragging = ref(false);

const sizeLabel = computed(() => {
  const size = props.modelValue?.size ?? 0;
  if (!size) return '';
  return size < 1024 * 1024 ? `${Math.round(size / 1024)} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
});

const take = (file) => {
  emit('update:modelValue', file ?? null);
  emit('change', file ?? null);
};

const onSelect = (event) => take(event.target.files?.[0] ?? null);

const onDrop = (event) => {
  dragging.value = false;
  if (props.disabled) return;
  take(event.dataTransfer?.files?.[0] ?? null);
};

const clear = () => {
  if (input.value) input.value.value = '';
  take(null);
};
</script>

<template>
  <div
    class="picker"
    :class="{ dragging, invalid, disabled, chosen: !!modelValue }"
    @dragover.prevent="dragging = !disabled"
    @dragleave="dragging = false"
    @drop.prevent="onDrop"
  >
    <input :id="inputId" ref="input" type="file" :accept="accept" :disabled="disabled" class="sr-only" @change="onSelect" />

    <template v-if="modelValue">
      <i class="pi pi-file-pdf chosen-icon"></i>
      <span class="name" :title="modelValue.name">{{ modelValue.name }}</span>
      <span v-if="sizeLabel" class="size">{{ sizeLabel }}</span>
      <Button icon="pi pi-times" text rounded size="small" :aria-label="removeLabel" :disabled="disabled" @click="clear" />
    </template>

    <template v-else>
      <label :for="inputId" class="choose">
        <i class="pi pi-upload"></i>
        <span>{{ label }}</span>
      </label>
      <span class="hint">{{ hint }}</span>
    </template>
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.7rem;
  border: 1px dashed var(--trab-border);
  border-radius: 8px;
  background: #fbfdfe;
  min-height: 2.9rem;
}
.picker.dragging {
  border-color: var(--trab-primary);
  background: rgba(27, 107, 61, 0.05);
}
.picker.chosen {
  border-style: solid;
  background: #fff;
}
.picker.invalid {
  border-color: var(--trab-danger);
}
.picker.disabled {
  opacity: 0.6;
}
.choose {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border: 1px solid var(--trab-border);
  border-radius: 6px;
  background: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--trab-primary);
  cursor: pointer;
}
.choose:hover {
  border-color: var(--trab-primary);
  background: rgba(27, 107, 61, 0.05);
}
.picker.disabled .choose {
  cursor: not-allowed;
}
.hint {
  font-size: 0.75rem;
  color: var(--trab-muted);
}
.chosen-icon {
  color: #b42318;
}
.name {
  flex: 1;
  min-width: 0;
  font-size: 0.82rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.size {
  font-size: 0.75rem;
  color: var(--trab-muted);
  font-variant-numeric: tabular-nums;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
