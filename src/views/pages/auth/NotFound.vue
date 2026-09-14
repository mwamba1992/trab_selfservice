<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="flex items-center justify-center min-h-screen px-4" style="background: var(--trab-bg)">
    <div class="text-center">
      <h1 class="text-4xl font-bold mb-2" style="color: var(--trab-muted)">404</h1>
      <p class="text-lg mb-4" style="color: var(--trab-muted)">{{ t('notFound.title') }}</p>
      <router-link to="/dashboard" class="text-sm underline" style="color: var(--trab-primary)">{{ t('notFound.back') }}</router-link>
    </div>
  </div>
</template>
