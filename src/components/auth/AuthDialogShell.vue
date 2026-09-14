<script setup>
import Dialog from 'primevue/dialog';

// Shared frame for the sign-in and registration dialogs.
defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  error: { type: String, default: '' },
  width: { type: String, default: '440px' },
});
defineEmits(['update:visible']);
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :show-header="false"
    :style="{ width }"
    :breakpoints="{ '520px': '94vw' }"
    :content-style="{ padding: '0', borderRadius: '20px', overflow: 'hidden' }"
    :pt="{ mask: { class: 'auth-mask' } }"
    dismissable-mask
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="auth-dialog">
      <div class="auth-accent"></div>
      <div class="auth-body">
        <div class="auth-header">
          <div class="auth-icon-wrap"><img src="/coat-of-arms.svg" alt="" class="auth-logo" /></div>
          <h2>{{ title }}</h2>
          <p v-if="subtitle">{{ subtitle }}</p>
        </div>
        <div v-if="error" class="auth-error" role="alert"><i class="pi pi-exclamation-triangle"></i> {{ error }}</div>
        <slot />
      </div>
    </div>
  </Dialog>
</template>

<style>
/* Unscoped: these classes are shared by the slot content of both auth dialogs */
.auth-mask {
  backdrop-filter: blur(6px);
  background: rgba(0, 0, 0, 0.3) !important;
}
.auth-dialog {
  font-family: 'Poppins', sans-serif;
}
.auth-accent {
  height: 4px;
  background: linear-gradient(90deg, #1b6b3d, #d4af37, #1b365d);
}
.auth-body {
  padding: 2rem 2.5rem 2.5rem;
}
.auth-header {
  text-align: center;
  margin-bottom: 1.5rem;
}
.auth-icon-wrap {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  box-shadow: 0 4px 12px rgba(27, 107, 61, 0.1);
}
.auth-logo {
  height: 42px;
}
.auth-header h2 {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--trab-heading);
  margin: 0 0 0.25rem;
}
.auth-header p {
  font-size: 0.82rem;
  color: var(--trab-subtle);
  margin: 0;
}
.auth-error {
  background: #fef2f2;
  color: var(--trab-error-text);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
  margin-bottom: 0.75rem;
}
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.auth-field label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--trab-label);
  margin-bottom: 0.4rem;
}
.auth-field label .pi {
  font-size: 0.85rem;
  color: var(--trab-primary);
}
.auth-field small {
  display: block;
  font-size: 0.72rem;
  color: var(--trab-subtle);
  margin-top: 0.35rem;
}
.auth-input {
  border-radius: 10px !important;
  padding: 0.7rem 0.85rem !important;
  font-size: 0.95rem !important;
}
.auth-btn {
  background: linear-gradient(135deg, #1b6b3d, #166534) !important;
  border: none !important;
  border-radius: 12px !important;
  font-weight: 600 !important;
  font-size: 0.9rem !important;
  padding: 0.8rem !important;
  box-shadow: 0 4px 14px rgba(27, 107, 61, 0.3) !important;
}
.auth-divider {
  text-align: center;
  position: relative;
  margin: 0.5rem 0;
}
.auth-divider::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: #e2e8f0;
}
.auth-divider span {
  position: relative;
  background: #fff;
  padding: 0 0.75rem;
  font-size: 0.75rem;
  color: var(--trab-subtle);
}
.auth-secondary {
  width: 100%;
  background: none;
  border: 1.5px solid #e2e8f0;
  color: var(--trab-label);
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.7rem;
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.auth-secondary:hover {
  border-color: var(--trab-primary);
  color: var(--trab-primary);
}
.auth-link {
  background: none;
  border: none;
  color: var(--trab-muted);
  font-size: 0.82rem;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  margin-top: 0.25rem;
}
.auth-link:hover {
  color: var(--trab-primary);
}
.otp-icon {
  text-align: center;
  margin-bottom: 0.5rem;
}
.otp-icon .pi {
  font-size: 2rem;
  color: var(--trab-primary);
  background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.otp-input {
  text-align: center !important;
  font-size: 1.8rem !important;
  letter-spacing: 0.6em !important;
  font-weight: 700 !important;
  border-radius: 12px !important;
  padding: 0.8rem !important;
  border: 2px solid #e2e8f0 !important;
}
.otp-input:focus {
  border-color: var(--trab-primary) !important;
}
.otp-info {
  text-align: center;
  font-size: 0.85rem;
  color: var(--trab-muted);
  margin: 0 0 0.5rem;
  line-height: 1.5;
}
@media (max-width: 768px) {
  .auth-body {
    padding: 1.5rem 1.25rem 1.75rem;
  }
}
</style>
