import { ref, watch, onBeforeUnmount } from 'vue';
import { session } from '@/service/session.js';

const PREFIX = 'draft:';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const keyFor = (name) => `${PREFIX}${session.getUserId() || 'anonymous'}:${name}`;

/** Removes every saved draft of the given user (used on explicit sign-out). */
export function clearDrafts(userId = session.getUserId()) {
  try {
    const prefix = `${PREFIX}${userId || 'anonymous'}:`;
    Object.keys(localStorage).filter((k) => k.startsWith(prefix)).forEach((k) => localStorage.removeItem(k));
  } catch { /* storage unavailable */ }
}

/**
 * Keeps an unfinished form in localStorage so it survives a reload or an
 * expired session. `sources` maps names to refs; they are restored
 * immediately (before first render) and saved on every change.
 */
export function useDraft(name, sources, { debounceMs = 400 } = {}) {
  const key = keyFor(name);
  const restored = ref(false);
  let timer = null;
  let cleared = false;

  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved?.data && Date.now() - saved.savedAt < MAX_AGE_MS) {
      for (const [field, source] of Object.entries(sources)) {
        if (field in saved.data) source.value = saved.data[field];
      }
      restored.value = true;
    } else if (saved) {
      localStorage.removeItem(key);
    }
  } catch { /* unreadable draft — start fresh */ }

  const persist = () => {
    if (cleared) return;
    const data = Object.fromEntries(Object.entries(sources).map(([field, source]) => [field, source.value]));
    try { localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data })); } catch { /* not persisted */ }
  };

  const stop = watch(Object.values(sources), () => {
    clearTimeout(timer);
    timer = setTimeout(persist, debounceMs);
  }, { deep: true });

  const flush = () => {
    clearTimeout(timer);
    persist();
  };

  /** Call after a successful submit (or when the user starts over). */
  const clear = () => {
    cleared = true;
    clearTimeout(timer);
    stop();
    restored.value = false;
    try { localStorage.removeItem(key); } catch { /* nothing to remove */ }
  };

  onBeforeUnmount(flush);

  return { restored, flush, clear };
}
