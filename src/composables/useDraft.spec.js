import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useDraft, clearDrafts } from './useDraft.js';

function mountDraft(name, initial) {
  const state = {};
  const wrapper = mount({
    setup() {
      state.form = ref(initial);
      state.draft = useDraft(name, { form: state.form }, { debounceMs: 100 });
      return () => null;
    },
  });
  return { wrapper, state };
}

const saved = (name) => JSON.parse(localStorage.getItem(`draft:u1:${name}`));

describe('useDraft', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('userId', 'u1');
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('saves changes after the debounce', async () => {
    const { state } = mountDraft('notice', { name: '' });
    state.form.value.name = 'ACME';
    await nextTick();
    expect(saved('notice')).toBeNull();
    vi.advanceTimersByTime(100);
    expect(saved('notice').data.form).toEqual({ name: 'ACME' });
  });

  it('restores a saved draft before first render and flags it', () => {
    localStorage.setItem('draft:u1:notice', JSON.stringify({ savedAt: Date.now(), data: { form: { name: 'Saved' } } }));
    const { state } = mountDraft('notice', { name: '' });
    expect(state.form.value).toEqual({ name: 'Saved' });
    expect(state.draft.restored.value).toBe(true);
  });

  it('discards drafts older than seven days', () => {
    const old = Date.now() - 8 * 24 * 60 * 60 * 1000;
    localStorage.setItem('draft:u1:notice', JSON.stringify({ savedAt: old, data: { form: { name: 'Old' } } }));
    const { state } = mountDraft('notice', { name: '' });
    expect(state.form.value).toEqual({ name: '' });
    expect(localStorage.getItem('draft:u1:notice')).toBeNull();
  });

  it('stops saving after clear, including on unmount', async () => {
    const { wrapper, state } = mountDraft('notice', { name: '' });
    state.draft.clear();
    state.form.value.name = 'After submit';
    await nextTick();
    vi.advanceTimersByTime(500);
    wrapper.unmount();
    expect(saved('notice')).toBeNull();
  });

  it('flushes pending changes when the page is left', async () => {
    const { wrapper, state } = mountDraft('notice', { name: '' });
    state.form.value.name = 'Typed quickly';
    await nextTick();
    wrapper.unmount();
    expect(saved('notice').data.form.name).toBe('Typed quickly');
  });

  it("clearDrafts removes only this user's drafts", () => {
    localStorage.setItem('draft:u1:a', '{}');
    localStorage.setItem('draft:u2:a', '{}');
    clearDrafts('u1');
    expect(localStorage.getItem('draft:u1:a')).toBeNull();
    expect(localStorage.getItem('draft:u2:a')).toBe('{}');
  });
});
