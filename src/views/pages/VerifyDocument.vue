<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import FilePicker from '@/components/FilePicker.vue';
import api from '@/service/Api.js';
import { apiErrorMessage, formatDateTime } from '@/utils/format.js';

/**
 * Anyone holding a document of the Board — a party, a bank, the Tribunal —
 * checks here that it is one, and that it has not been changed since it was
 * filed. No account is needed: the code on the document is the key.
 */
const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();

const code = ref(String(route.params.code ?? ''));
const found = ref(null);
const error = ref('');
const looking = ref(false);
const file = ref(null);
const checking = ref(false);
const match = ref(null);

const lookup = async () => {
  if (!code.value.trim()) return;
  looking.value = true;
  error.value = '';
  found.value = null;
  match.value = null;
  try {
    const res = await api.get(`/verify/${encodeURIComponent(code.value.trim())}`);
    found.value = res.data.data;
    code.value = found.value.code;
    if (route.params.code !== found.value.code) router.replace({ name: 'Verify', params: { code: found.value.code } });
  } catch (err) {
    error.value = err?.response?.status === 404 ? t('verify.unknown') : apiErrorMessage(err, t('verify.failed'));
  } finally {
    looking.value = false;
  }
};

const compare = async () => {
  if (!file.value || !found.value) return;
  checking.value = true;
  match.value = null;
  try {
    const form = new FormData();
    form.append('file', file.value);
    const res = await api.post(`/verify/${encodeURIComponent(found.value.code)}/file`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    match.value = res.data.data.matches;
  } catch (err) {
    error.value = apiErrorMessage(err, t('verify.failed'));
  } finally {
    checking.value = false;
  }
};

onMounted(() => {
  if (code.value) lookup();
});
</script>

<template>
  <div class="verify-page">
    <header class="verify-head">
      <div class="brand">
        <img src="/coat-of-arms.svg" alt="" class="arms" />
        <div>
          <strong>{{ t('verify.board') }}</strong>
          <span>{{ t('verify.title') }}</span>
        </div>
      </div>
      <LanguageSwitcher />
    </header>

    <main class="verify-card">
      <h1>{{ t('verify.title') }}</h1>
      <p class="lede">{{ t('verify.lede') }}</p>

      <form class="code-row" @submit.prevent="lookup">
        <label for="verify-code" class="sr-only">{{ t('verify.code') }}</label>
        <InputText id="verify-code" v-model="code" :placeholder="t('verify.placeholder')" class="code-input" autocomplete="off" />
        <Button type="submit" :label="t('verify.check')" icon="pi pi-search" class="trab-btn" :loading="looking" />
      </form>

      <p v-if="error" class="result bad" role="alert"><i class="pi pi-times-circle"></i> {{ error }}</p>

      <section v-if="found" class="found" aria-live="polite">
        <p class="result good"><i class="pi pi-verified"></i> {{ t('verify.genuine') }}</p>
        <dl>
          <dt>{{ t('verify.document') }}</dt>
          <dd>{{ t(`verify.types.${found.documentType}`) }}</dd>
          <template v-if="found.caseLabel">
            <dt>{{ t('verify.case') }}</dt>
            <dd>{{ found.caseLabel }}</dd>
          </template>
          <template v-if="found.signedByName">
            <dt>{{ t('verify.signedBy') }}</dt>
            <dd>{{ found.signedByName }}</dd>
          </template>
          <dt>{{ t('verify.issued') }}</dt>
          <dd>{{ formatDateTime(found.sealedAt, locale) }}</dd>
          <dt>{{ t('verify.seal') }}</dt>
          <dd>
            <template v-if="found.digitallySigned">{{ t('verify.digitallySigned') }}<br /><small>{{ found.certificateSubject }}</small></template>
            <template v-else>{{ t('verify.notDigitallySigned') }}</template>
          </dd>
          <dt>{{ t('verify.code') }}</dt>
          <dd class="mono">{{ found.code }}</dd>
        </dl>

        <div class="compare">
          <h2>{{ t('verify.compareTitle') }}</h2>
          <p class="lede">{{ t('verify.compareLede') }}</p>
          <FilePicker v-model="file" accept="application/pdf" />
          <Button :label="t('verify.compare')" icon="pi pi-shield" outlined :disabled="!file" :loading="checking" class="mt-2" @click="compare" />
          <p v-if="match === true" class="result good"><i class="pi pi-check-circle"></i> {{ t('verify.matches') }}</p>
          <p v-if="match === false" class="result bad"><i class="pi pi-exclamation-triangle"></i> {{ t('verify.differs') }}</p>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.verify-page {
  min-height: 100vh;
  background: var(--trab-bg);
  padding: 1rem;
}
.verify-head {
  max-width: 720px;
  margin: 0 auto 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.brand div {
  display: flex;
  flex-direction: column;
  font-size: 0.8rem;
  color: #475569;
}
.brand strong {
  color: var(--trab-primary);
  font-size: 0.95rem;
}
.arms {
  width: 40px;
}
.verify-card {
  max-width: 720px;
  margin: 0 auto;
  background: #fff;
  border: 1px solid var(--trab-border);
  border-radius: 12px;
  padding: 1.5rem;
}
h1 {
  font-size: 1.3rem;
  color: var(--trab-primary);
  margin: 0 0 0.3rem;
}
h2 {
  font-size: 1rem;
  margin: 0 0 0.3rem;
}
.lede {
  color: #6b7280;
  font-size: 0.88rem;
  margin: 0 0 1rem;
}
.code-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.code-input {
  flex: 1 1 16rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  text-transform: uppercase;
}
.result {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  padding: 0.7rem 0.9rem;
  border-radius: 8px;
  font-size: 0.9rem;
  margin: 1rem 0 0;
}
.result.good {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
}
.result.bad {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}
dl {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.5rem 1.25rem;
  margin: 1rem 0;
  font-size: 0.88rem;
}
dt {
  color: #6b7280;
}
dd {
  margin: 0;
  font-weight: 600;
  overflow-wrap: anywhere;
}
dd small {
  font-weight: 400;
  color: #6b7280;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.compare {
  border-top: 1px solid var(--trab-border);
  padding-top: 1rem;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
