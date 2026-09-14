import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import { mountPage, findButton } from '@/test/mountPage.js';
import { i18n } from '@/i18n/index.js';

vi.mock('@/service/SelfServiceApi.js', () => ({
  SelfServiceNotifications: { getAll: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn(), unreadCount: vi.fn() },
  SelfServiceProfile: { get: vi.fn() },
}));

const { SelfServiceNotifications } = await import('@/service/SelfServiceApi.js');
const { profileStore } = await import('@/stores/profile.js');
const Notifications = (await import('./Notifications.vue')).default;

const payment = () => ({
  id: 'n1',
  type: 'PAYMENT_RECEIVED',
  params: { amount: '50,000', controlNumber: '995350001', caseNo: '12/2026' },
  title: 'Payment received',
  message: 'stored English text',
  link: '/bills',
  readAt: null,
  createdAt: '2026-09-14T08:00:00Z',
});

describe('Notifications page', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en';
    vi.clearAllMocks();
    profileStore.reset();
    SelfServiceNotifications.getAll.mockResolvedValue({ items: [payment()], total: 1 });
    SelfServiceNotifications.unreadCount.mockResolvedValue(1);
    SelfServiceNotifications.markRead.mockResolvedValue({});
    SelfServiceNotifications.markAllRead.mockResolvedValue({ updated: 1 });
  });

  it('renders the message in the chosen language from type and params', async () => {
    const { wrapper } = await mountPage(Notifications);

    expect(wrapper.text()).toContain('Payment of TZS 50,000 for control number 995350001 was received. Your case number is 12/2026.');

    i18n.global.locale.value = 'sw';
    await nextTick();
    expect(wrapper.text()).toContain('Namba ya shauri lako ni 12/2026.');
    wrapper.unmount();
  });

  it('falls back to the stored text for an unknown type', async () => {
    SelfServiceNotifications.getAll.mockResolvedValue({
      items: [{ ...payment(), type: 'SOMETHING_NEW', title: 'Stored title', message: 'Stored message' }],
      total: 1,
    });
    const { wrapper } = await mountPage(Notifications);
    expect(wrapper.text()).toContain('Stored message');
    wrapper.unmount();
  });

  it('marks a notification read and opens its page', async () => {
    const { wrapper, router } = await mountPage(Notifications);

    await wrapper.find('.notification').trigger('click');
    await flushPromises();

    expect(SelfServiceNotifications.markRead).toHaveBeenCalledWith('n1');
    expect(profileStore.state.unreadCount).toBe(0);
    expect(router.currentRoute.value.path).toBe('/bills');
    wrapper.unmount();
  });

  it('marks everything read and requests only unread items when filtered', async () => {
    const { wrapper } = await mountPage(Notifications);

    await findButton(wrapper, 'Mark all as read').trigger('click');
    await flushPromises();
    expect(SelfServiceNotifications.markAllRead).toHaveBeenCalled();
    expect(profileStore.state.unreadCount).toBe(0);

    await findButton(wrapper, 'Unread').trigger('click');
    await flushPromises();
    expect(SelfServiceNotifications.getAll).toHaveBeenLastCalledWith(1, 10, true);
    wrapper.unmount();
  });
});
