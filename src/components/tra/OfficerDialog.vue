<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Select from 'primevue/select';
import { useToast } from 'primevue/usetoast';
import { TraApi } from '@/service/TraApi.js';
import { apiErrorMessage } from '@/utils/format.js';

// The TRA desk is English by policy, so this dialog carries no translation keys.
const props = defineProps({
  /** The officer being edited, or null to create a new one. */
  officer: { type: Object, default: null },
  /** Current user's id: an officer cannot change their own role. */
  currentUserId: { type: String, default: '' },
  visible: { type: Boolean, default: false },
});
const emit = defineEmits(['update:visible', 'saved']);

/** Mirrors backend tra/dto/officer.dto.ts: 0XXXXXXXXX, 255XXXXXXXXX or +255XXXXXXXXX. */
const PHONE_REGEX = /^(\+?255|0)[0-9]{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isAdminOfficer = (o) => o.role?.name === 'tra-admin';

const emptyForm = () => ({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'officer' });

const formFromOfficer = (o) => ({
  firstName: o.firstName,
  lastName: o.lastName,
  email: o.email,
  phone: o.phone ?? '',
  password: '',
  role: isAdminOfficer(o) ? 'admin' : 'officer',
});

/** Client-side checks matching the backend DTO. `original` is set when editing. */
function validateOfficer(v, original) {
  const errors = {};
  if (!v.firstName.trim()) errors.firstName = 'First name is required.';
  if (!v.lastName.trim()) errors.lastName = 'Last name is required.';

  const phone = v.phone.trim();
  if (phone && !PHONE_REGEX.test(phone)) {
    errors.phone = 'Enter a valid phone number, e.g. 0712345678 or 255712345678.';
  } else if (!phone && original?.phone) {
    errors.phone = 'A saved phone number cannot be removed; enter a valid number.';
  }

  if (!original) {
    const email = v.email.trim();
    if (!email) errors.email = 'Email is required.';
    else if (!EMAIL_REGEX.test(email)) errors.email = 'Enter a valid email address.';
    if (!v.password) errors.password = 'An initial password is required.';
  }
  return errors;
}

const toast = useToast();
const form = ref(emptyForm());
const errors = ref({});
const submitted = ref(false);
const saving = ref(false);
const serverError = ref('');

const isEdit = computed(() => props.officer !== null);
const isSelf = computed(() => !!props.officer && props.officer.id === props.currentUserId);
const idPrefix = 'officer-form';
const fieldId = (name) => `${idPrefix}-${name}`;
const errorId = (name) => `${idPrefix}-${name}-error`;

const close = () => emit('update:visible', false);

watch(
  () => props.visible,
  (open) => {
    if (!open) return;
    form.value = props.officer ? formFromOfficer(props.officer) : emptyForm();
    errors.value = {};
    submitted.value = false;
    serverError.value = '';
  },
);

// Re-validate as the user types once they have tried to submit.
watch(
  form,
  (v) => {
    if (submitted.value) errors.value = validateOfficer(v, props.officer);
  },
  { deep: true },
);

const focusFirstError = async () => {
  await nextTick();
  const first = Object.keys(errors.value)[0];
  if (first) document.getElementById(fieldId(first))?.focus();
};

function buildUpdate(v, o) {
  const patch = {};
  if (v.firstName.trim() !== o.firstName) patch.firstName = v.firstName.trim();
  if (v.lastName.trim() !== o.lastName) patch.lastName = v.lastName.trim();
  const phone = v.phone.trim();
  if (phone && phone !== (o.phone ?? '')) patch.phone = phone;
  const wantsAdmin = v.role === 'admin';
  if (!isSelf.value && wantsAdmin !== isAdminOfficer(o)) patch.isAdmin = wantsAdmin;
  return patch;
}

const save = async () => {
  submitted.value = true;
  serverError.value = '';
  errors.value = validateOfficer(form.value, props.officer);
  if (Object.keys(errors.value).length) {
    await focusFirstError();
    return;
  }

  const v = form.value;
  saving.value = true;
  try {
    let saved;
    if (props.officer) {
      const patch = buildUpdate(v, props.officer);
      if (!Object.keys(patch).length) {
        close();
        return;
      }
      saved = await TraApi.updateOfficer(props.officer.id, patch);
      toast.add({ severity: 'success', summary: 'Officer updated', detail: `${saved.firstName} ${saved.lastName}`, life: 3000 });
    } else {
      const phone = v.phone.trim();
      saved = await TraApi.createOfficer({
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        email: v.email.trim(),
        password: v.password,
        ...(phone ? { phone } : {}),
        isAdmin: v.role === 'admin',
      });
      toast.add({ severity: 'success', summary: 'Officer created', detail: `${saved.firstName} ${saved.lastName}`, life: 3000 });
    }
    close();
    emit('saved', saved);
  } catch (e) {
    serverError.value = apiErrorMessage(e, isEdit.value ? 'Could not update the officer.' : 'Could not create the officer.');
    toast.add({ severity: 'error', summary: 'Save failed', detail: serverError.value, life: 5000 });
  } finally {
    saving.value = false;
  }
};

const roleOptions = [
  { value: 'officer', label: 'TRA Officer' },
  { value: 'admin', label: 'TRA Administrator (can manage officers)' },
];

const describedBy = (name) => (errors.value[name] ? errorId(name) : undefined);
</script>

<template>
  <Dialog
    :visible="visible"
    :header="isEdit ? 'Edit TRA Officer' : 'New TRA Officer'"
    modal
    :closable="!saving"
    :style="{ width: 'min(32.5rem, calc(100vw - 2rem))' }"
    :breakpoints="{ '768px': '95vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <form id="officer-form" class="officer-form" novalidate @submit.prevent="save">
      <div v-if="serverError" class="note note-error" role="alert">
        <i class="pi pi-exclamation-triangle"></i>
        <span class="flex-1">{{ serverError }}</span>
      </div>

      <div class="officer-form-row">
        <div class="field">
          <label :for="fieldId('firstName')">First name<span class="req" aria-hidden="true">*</span></label>
          <InputText
            :id="fieldId('firstName')"
            v-model="form.firstName"
            class="w-full"
            autocomplete="given-name"
            required
            :invalid="!!errors.firstName"
            :aria-describedby="describedBy('firstName')"
          />
          <p v-if="errors.firstName" :id="errorId('firstName')" class="field-error">{{ errors.firstName }}</p>
        </div>
        <div class="field">
          <label :for="fieldId('lastName')">Last name<span class="req" aria-hidden="true">*</span></label>
          <InputText
            :id="fieldId('lastName')"
            v-model="form.lastName"
            class="w-full"
            autocomplete="family-name"
            required
            :invalid="!!errors.lastName"
            :aria-describedby="describedBy('lastName')"
          />
          <p v-if="errors.lastName" :id="errorId('lastName')" class="field-error">{{ errors.lastName }}</p>
        </div>
      </div>

      <div class="field">
        <label :for="fieldId('email')">Email<span v-if="!isEdit" class="req" aria-hidden="true">*</span></label>
        <InputText
          :id="fieldId('email')"
          v-model="form.email"
          class="w-full"
          type="email"
          autocomplete="off"
          :required="!isEdit"
          :readonly="isEdit"
          :invalid="!!errors.email"
          :aria-describedby="isEdit ? `${fieldId('email')}-hint` : describedBy('email')"
        />
        <p v-if="isEdit" :id="`${fieldId('email')}-hint`" class="field-hint">The sign-in email cannot be changed.</p>
        <p v-else-if="errors.email" :id="errorId('email')" class="field-error">{{ errors.email }}</p>
      </div>

      <div class="field">
        <label :for="fieldId('phone')">Phone</label>
        <InputText
          :id="fieldId('phone')"
          v-model="form.phone"
          class="w-full"
          type="tel"
          inputmode="tel"
          autocomplete="off"
          placeholder="0XXXXXXXXX"
          :invalid="!!errors.phone"
          :aria-describedby="describedBy('phone')"
        />
        <p v-if="errors.phone" :id="errorId('phone')" class="field-error">{{ errors.phone }}</p>
      </div>

      <div v-if="!isEdit" class="field">
        <label :for="fieldId('password')">Initial password<span class="req" aria-hidden="true">*</span></label>
        <Password
          v-model="form.password"
          :input-id="fieldId('password')"
          class="w-full"
          input-class="w-full"
          :feedback="false"
          toggle-mask
          :invalid="!!errors.password"
          :input-props="{ autocomplete: 'new-password', required: true, 'aria-describedby': describedBy('password') }"
        />
        <p v-if="errors.password" :id="errorId('password')" class="field-error">{{ errors.password }}</p>
      </div>

      <div class="field">
        <label :for="fieldId('role')">Role</label>
        <Select
          v-model="form.role"
          :input-id="fieldId('role')"
          :options="roleOptions"
          option-label="label"
          option-value="value"
          class="w-full"
          :disabled="isSelf"
          :pt="{ label: { 'aria-describedby': isSelf ? `${fieldId('role')}-hint` : undefined } }"
        />
        <p v-if="isSelf" :id="`${fieldId('role')}-hint`" class="field-hint">You cannot change your own role.</p>
      </div>
    </form>

    <template #footer>
      <Button label="Cancel" outlined size="small" :disabled="saving" @click="close" />
      <Button
        type="submit"
        form="officer-form"
        :label="isEdit ? 'Save changes' : 'Create officer'"
        :icon="saving ? 'pi pi-spin pi-spinner' : 'pi pi-check'"
        class="trab-btn"
        size="small"
        :disabled="saving"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.officer-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.25rem;
}
.officer-form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}
.field {
  display: grid;
  gap: 0.3rem;
  align-content: start;
}
.field label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--trab-label, #475569);
}
.field p {
  margin: 0;
}
.req {
  margin-left: 0.15rem;
  color: var(--trab-danger, #dc2626);
}
.note-error {
  margin-bottom: 0;
}
@media (max-width: 30rem) {
  .officer-form-row {
    grid-template-columns: 1fr;
  }
}
</style>
