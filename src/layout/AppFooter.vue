<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const year = new Date().getFullYear();
</script>

<template>
  <footer class="layout-footer">
    <span>{{ t('footer.rights', { year }) }}</span>
    <span class="sep" aria-hidden="true">|</span>
    <a href="#">{{ t('footer.help') }}</a>
    <span class="sep" aria-hidden="true">|</span>
    <a href="#">{{ t('footer.privacy') }}</a>
  </footer>
</template>

<style scoped>
.layout-footer { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.35rem 0.6rem; }
.sep { color: #e2e8f0; }
a { color: var(--trab-muted); text-decoration: none; font-size: 0.78rem; }
a:hover { color: var(--trab-primary); }
</style>
