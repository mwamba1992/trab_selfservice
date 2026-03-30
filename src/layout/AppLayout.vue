<script setup>
import AppTopbar from './AppTopbar.vue';
import AppFooter from './AppFooter.vue';
import Toast from 'primevue/toast';
</script>

<template>
  <div class="layout-wrapper">
    <AppTopbar />
    <div class="layout-content">
      <Toast />
      <router-view />
    </div>
    <AppFooter />
  </div>
</template>
