import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { SelfServiceStats } from '@/service/SelfServiceApi.js';
import { apiErrorMessage } from '@/utils/format.js';

/**
 * State and handlers for a server-paginated list page: lazy DataTable paging,
 * debounced search and the stat bar (from the server-side aggregate, so it
 * counts every record rather than just the loaded page).
 *
 * @param {(page: number, size: number, search: string) => Promise<{items: any[], total: number}>} fetchPage
 * @param {object} options
 * @param {string} options.errorKey    i18n key shown when a page fails to load
 * @param {string} [options.statsKey]  key of /self-service/stats to show in the stat bar
 * @param {object} [options.statsDefault]
 */
export function usePagedList(fetchPage, { errorKey, statsKey = null, statsDefault = {}, pageSize = 10, searchDelayMs = 350 } = {}) {
  const { t } = useI18n();
  const toast = useToast();

  const rows = ref([]);
  const total = ref(0);
  const loading = ref(false);
  const search = ref('');
  const rowsPerPage = ref(pageSize);
  const first = ref(0);
  const stats = ref({ ...statsDefault });

  const currentPage = () => Math.floor(first.value / rowsPerPage.value) + 1;

  const load = async (page = currentPage()) => {
    loading.value = true;
    try {
      const result = await fetchPage(page, rowsPerPage.value, search.value.trim());
      rows.value = result?.items || [];
      total.value = result?.total ?? rows.value.length;
    } catch (err) {
      toast.add({ severity: 'error', summary: t('common.error'), detail: apiErrorMessage(err, t(errorKey)), life: 4000 });
    } finally {
      loading.value = false;
    }
  };

  const loadStats = async () => {
    if (!statsKey) return;
    try {
      const all = await SelfServiceStats.get();
      if (all?.[statsKey]) stats.value = all[statsKey];
    } catch {
      /* the stat bar is non-critical */
    }
  };

  const onPage = (event) => {
    first.value = event.first;
    rowsPerPage.value = event.rows;
    load(event.page + 1);
  };

  let searchTimer = null;
  const onSearch = () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      first.value = 0;
      load(1);
    }, searchDelayMs);
  };

  const refresh = () => Promise.all([load(), loadStats()]);

  onMounted(() => {
    load(1);
    loadStats();
  });
  onBeforeUnmount(() => clearTimeout(searchTimer));

  return { rows, total, loading, search, rowsPerPage, first, stats, load, loadStats, onPage, onSearch, refresh };
}
