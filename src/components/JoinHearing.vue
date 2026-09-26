<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { isOnline, platformOf, safeMeetingLink } from '@/utils/hearingMode.js';

/**
 * The way into a hearing held online: a button that opens the meeting in a new
 * tab, and the meeting ID or passcode under it. Shows nothing for a hearing in
 * person, or for a link that is not a plain https address.
 */
const props = defineProps({
  mode: { type: String, default: 'IN_PERSON' },
  link: { type: String, default: null },
  details: { type: String, default: null },
  // The TRA desk is English by policy, whatever language the portal is in.
  english: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
});

const { t } = useI18n();
const href = computed(() => (isOnline(props.mode) ? safeMeetingLink(props.link) : null));
const platform = computed(() => platformOf(href.value));
const label = computed(() => {
  if (props.english) return platform.value ? `Join on ${platform.value}` : 'Join hearing';
  return platform.value ? t('summons.joinOn', { platform: platform.value }) : t('summons.join');
});
const modeLabel = computed(() => {
  const hybrid = props.mode === 'HYBRID';
  if (props.english) return hybrid ? 'Hybrid: in person or online' : 'Held online';
  return hybrid ? t('summons.hybrid') : t('summons.online');
});
</script>

<template>
  <div v-if="href" class="join" :class="{ compact }">
    <span v-if="!compact" class="mode"><i class="pi pi-video"></i> {{ modeLabel }}</span>
    <a :href="href" target="_blank" rel="noopener noreferrer" class="join-btn"> <i class="pi pi-external-link"></i> {{ label }} </a>
    <span v-if="details && !compact" class="details">{{ details }}</span>
  </div>
</template>

<style scoped>
.join {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.3rem;
}
.join.compact {
  flex-direction: row;
  align-items: center;
}
.mode {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #1d4ed8;
}
.join-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  background: var(--trab-primary);
  color: #fff;
  font-size: 0.78rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}
.join-btn:hover {
  filter: brightness(1.08);
}
.join-btn:focus-visible {
  outline: 2px solid var(--trab-primary);
  outline-offset: 2px;
}
.details {
  font-size: 0.74rem;
  color: #6b7280;
  white-space: pre-wrap;
}
</style>
