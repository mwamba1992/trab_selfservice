<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { TraApi } from '@/service/TraApi.js';
import AuthService from '@/service/AuthService.js';
import { apiErrorMessage, formatDate } from '@/utils/format.js';
import { DEADLINE_ICONS, DEADLINE_LABELS, deadlineChip, replyBadge } from '@/utils/tra/lists.js';

// The TRA desk is English by policy, so this view carries no translation keys.
const router = useRouter();

const stats = ref({});
const recent = ref([]);
const deadlines = ref([]);
const loading = ref(true);
const error = ref('');
const deadlinesLoading = ref(true);
const deadlinesError = ref('');
const DEADLINE_LIMIT = 8;

const isSupervisor = computed(() => (stats.value.role ? stats.value.role === 'supervisor' : AuthService.can('TRA Assign Cases')));

const tiles = computed(() => {
  const s = stats.value;
  if (!isSupervisor.value) {
    return [
      { key: 'mine', label: 'My cases', value: s.myCases, icon: 'pi pi-briefcase', color: '#1B6B3D', to: '/tra/appeals?scope=mine' },
      {
        key: 'replies',
        label: 'Pending replies',
        value: s.myPendingReplies,
        icon: 'pi pi-pencil',
        color: '#3B82F6',
        to: '/tra/appeals?scope=mine&reply=pending',
      },
      {
        key: 'overdue',
        label: 'Overdue',
        value: s.myOverdue,
        icon: 'pi pi-exclamation-triangle',
        color: '#DC2626',
        to: '/tra/appeals?scope=mine&overdue=1',
      },
      {
        key: 'hearings',
        label: 'Upcoming hearings',
        value: s.myUpcomingHearings,
        icon: 'pi pi-calendar',
        color: '#F59E0B',
        to: '/tra/summons',
      },
    ];
  }
  return [
    { key: 'all', label: 'Appeals against TRA', value: s.totalAppeals, icon: 'pi pi-briefcase', color: '#1B6B3D', to: '/tra/appeals' },
    {
      key: 'unassigned',
      label: 'Unassigned',
      value: s.unassigned,
      icon: 'pi pi-user-plus',
      color: '#7C3AED',
      to: '/tra/appeals?officer=unassigned',
    },
    {
      key: 'replies',
      label: 'Pending replies',
      value: s.pendingReplies,
      icon: 'pi pi-pencil',
      color: '#3B82F6',
      to: '/tra/appeals?reply=pending',
    },
    {
      key: 'overdue',
      label: 'Overdue',
      value: s.overdue,
      icon: 'pi pi-exclamation-triangle',
      color: '#DC2626',
      to: '/tra/appeals?overdue=1',
    },
  ];
});

const load = async () => {
  loading.value = true;
  error.value = '';
  try {
    const [summary, page] = await Promise.all([
      TraApi.dashboard(),
      TraApi.appeals({ page: 1, size: 6, scope: AuthService.can('TRA Assign Cases') ? 'all' : 'mine' }),
    ]);
    stats.value = summary;
    recent.value = page.items;
  } catch (err) {
    error.value = apiErrorMessage(err, 'The dashboard could not be loaded.');
  } finally {
    loading.value = false;
  }
};

// Loaded on its own so a failure here never blanks the rest of the page.
const loadDeadlines = async () => {
  deadlinesLoading.value = true;
  deadlinesError.value = '';
  try {
    deadlines.value = await TraApi.deadlines();
  } catch (err) {
    deadlinesError.value = apiErrorMessage(err, 'Deadlines could not be loaded.');
  } finally {
    deadlinesLoading.value = false;
  }
};

const openCase = (id) => router.push(`/tra/appeals/${id}`);

onMounted(() => {
  load();
  loadDeadlines();
});
</script>

<template>
  <div>
    <div class="page-header">
      <h2>TRA Desk</h2>
      <p>Appeals against the Authority, replies due and hearings ahead.</p>
    </div>

    <div v-if="error" class="note note-error" role="alert">
      <i class="pi pi-exclamation-triangle"></i>
      <span class="flex-1">{{ error }}</span>
      <Button label="Try again" size="small" outlined @click="load" />
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <router-link v-for="tile in tiles" :key="tile.key" :to="tile.to" class="kpi-card">
        <div class="kpi-top">
          <div>
            <p class="kpi-value" :style="{ color: tile.color }">
              <i v-if="loading" class="pi pi-spin pi-spinner kpi-spinner"></i>
              <template v-else>{{ (tile.value ?? 0).toLocaleString() }}</template>
            </p>
            <p class="kpi-label">{{ tile.label }}</p>
          </div>
          <div class="kpi-icon" :style="{ background: `${tile.color}14`, color: tile.color }"><i :class="tile.icon"></i></div>
        </div>
      </router-link>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <section class="ss-card">
        <div class="card-head">
          <h3>What is due</h3>
          <router-link to="/tra/appeals" class="card-link">All cases <i class="pi pi-chevron-right"></i></router-link>
        </div>

        <p v-if="deadlinesError" class="muted">{{ deadlinesError }}</p>
        <p v-else-if="deadlinesLoading" class="muted"><i class="pi pi-spin pi-spinner"></i> Loading deadlines…</p>
        <ul v-else-if="deadlines.length" class="deadlines">
          <li v-for="item in deadlines.slice(0, DEADLINE_LIMIT)" :key="`${item.kind}-${item.appealId}`">
            <i class="pi" :class="DEADLINE_ICONS[item.kind]"></i>
            <button type="button" class="deadline-case" @click="openCase(item.appealId)">
              <span class="case-no">{{ item.appealNo || 'Awaiting number' }}</span>
              <span class="case-kind">{{ DEADLINE_LABELS[item.kind] }} · {{ formatDate(item.dueDate) }}</span>
            </button>
            <Tag :value="deadlineChip(item).text" :severity="deadlineChip(item).severity" />
          </li>
        </ul>
        <div v-else class="empty-state">
          <i class="pi pi-check-circle"></i>
          <p>Nothing falls due right now.</p>
        </div>
      </section>

      <section class="ss-card">
        <div class="card-head">
          <h3>Recent cases</h3>
          <router-link to="/tra/appeals" class="card-link">Open list <i class="pi pi-chevron-right"></i></router-link>
        </div>

        <p v-if="loading" class="muted"><i class="pi pi-spin pi-spinner"></i> Loading cases…</p>
        <ul v-else-if="recent.length" class="cases">
          <li v-for="appeal in recent" :key="appeal.id">
            <button type="button" class="case-row" @click="openCase(appeal.id)">
              <span class="min-w-0">
                <span class="case-no">{{ appeal.appealNo || 'Awaiting number' }}</span>
                <span class="case-kind">{{ appeal.appellantName }}</span>
              </span>
              <Tag :value="replyBadge(appeal).text" :severity="replyBadge(appeal).severity" />
            </button>
          </li>
        </ul>
        <div v-else class="empty-state">
          <i class="pi pi-briefcase"></i>
          <p>No cases yet.</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.kpi-card {
  display: block;
  text-decoration: none;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  padding: 1.1rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
  transition: border-color 0.2s;
}
.kpi-card:hover {
  border-color: var(--trab-primary);
}
.kpi-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}
.kpi-value {
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 1;
  margin: 0;
}
.kpi-spinner {
  font-size: 1.1rem;
  color: #cbd5e1;
}
.kpi-label {
  font-size: 0.75rem;
  color: #64748b;
  margin: 0.4rem 0 0;
}
.kpi-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.9rem;
}
.card-head h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
}
.card-link {
  font-size: 0.78rem;
  color: var(--trab-primary);
  text-decoration: none;
  white-space: nowrap;
}
.card-link:hover {
  text-decoration: underline;
}
.muted {
  margin: 0;
  font-size: 0.82rem;
  color: #6b7280;
}
.deadlines,
.cases {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.45rem;
}
.deadlines li {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.55rem 0.7rem;
  border: 1px solid #f1f5f9;
  border-radius: 9px;
}
.deadlines li > i {
  color: var(--trab-primary);
}
.deadline-case,
.case-row {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  background: none;
  border: 0;
  padding: 0;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}
.case-row {
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 1px solid #f1f5f9;
  border-radius: 9px;
}
.case-row:hover {
  border-color: var(--trab-primary);
}
.case-no {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #1e293b;
}
.case-kind {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
}
</style>
