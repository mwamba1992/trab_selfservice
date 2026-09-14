import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ToastService from 'primevue/toastservice';
import PrimeVue from 'primevue/config';
import { i18n } from '@/i18n/index.js';

vi.mock('@/service/SelfServiceApi.js', () => ({ SelfServiceStats: { get: vi.fn() } }));
const { SelfServiceStats } = await import('@/service/SelfServiceApi.js');
const { usePagedList } = await import('./usePagedList.js');

function mountList(fetchPage, options) {
  let list;
  const wrapper = mount(
    {
      setup() {
        list = usePagedList(fetchPage, options);
        return () => null;
      },
    },
    { global: { plugins: [[PrimeVue, { unstyled: true }], ToastService, i18n] } },
  );
  return { wrapper, list: () => list };
}

describe('usePagedList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    SelfServiceStats.get.mockResolvedValue({ notices: { total: 7 } });
  });
  afterEach(() => vi.useRealTimers());

  it('loads the first page and the stat bar on mount', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ items: [{ id: 1 }], total: 31 });
    const { list } = mountList(fetchPage, { errorKey: 'notices.loadFailed', statsKey: 'notices' });
    await flushPromises();

    expect(fetchPage).toHaveBeenCalledWith(1, 10, '');
    expect(list().rows.value).toEqual([{ id: 1 }]);
    expect(list().total.value).toBe(31);
    expect(list().stats.value).toEqual({ total: 7 });
  });

  it('pages and debounces search back to page one', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const fetchPage = vi.fn().mockResolvedValue({ items: [], total: 0 });
    const { list } = mountList(fetchPage, { errorKey: 'notices.loadFailed' });
    await flushPromises();

    list().onPage({ first: 25, rows: 25, page: 1 });
    expect(fetchPage).toHaveBeenLastCalledWith(2, 25, '');

    list().search.value = '  ACME ';
    list().onSearch();
    list().onSearch();
    vi.advanceTimersByTime(349);
    expect(fetchPage).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1);
    expect(fetchPage).toHaveBeenLastCalledWith(1, 25, 'ACME');
    expect(list().first.value).toBe(0);
  });

  it('keeps the stat bar default when stats fail and clears loading after a page error', async () => {
    SelfServiceStats.get.mockRejectedValue(new Error('offline'));
    const fetchPage = vi.fn().mockRejectedValue(new Error('offline'));
    const { list } = mountList(fetchPage, { errorKey: 'notices.loadFailed', statsKey: 'notices', statsDefault: { total: 0 } });
    await flushPromises();

    expect(list().stats.value).toEqual({ total: 0 });
    expect(list().loading.value).toBe(false);
    expect(list().rows.value).toEqual([]);
  });
});
