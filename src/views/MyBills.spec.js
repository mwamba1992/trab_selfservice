import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountPage, findButton } from '@/test/mountPage.js';
import { i18n } from '@/i18n/index.js';

vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,AAAA') } }));
vi.mock('@/service/SelfServiceApi.js', () => ({
  SelfServiceBills: { getAll: vi.fn(), getById: vi.fn(), getStatus: vi.fn() },
  SelfServiceStats: { get: vi.fn() },
  SelfServiceNotifications: { unreadCount: vi.fn() },
  SelfServiceProfile: { get: vi.fn() },
}));

const { SelfServiceBills, SelfServiceStats, SelfServiceNotifications } = await import('@/service/SelfServiceApi.js');
const MyBills = (await import('./MyBills.vue')).default;

const unpaidBill = () => ({
  id: 'b1',
  billReference: 'REF-1',
  appType: 'NOTICE',
  billedAmount: 50000,
  paidAmount: 0,
  generatedDate: '2026-09-01',
  billControlNumber: '995350001',
  billPaid: false,
  items: [],
});

describe('MyBills page', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en';
    vi.clearAllMocks();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    SelfServiceBills.getAll.mockResolvedValue({ items: [unpaidBill()], total: 1 });
    SelfServiceStats.get.mockResolvedValue({ bills: { total: 1, paid: 0, unpaid: 1, totalAmt: 50000 } });
    SelfServiceNotifications.unreadCount.mockResolvedValue(0);
  });
  afterEach(() => vi.useRealTimers());

  it('checks the payment status of a bill and updates the row', async () => {
    SelfServiceBills.getStatus.mockResolvedValue({ id: 'b1', billPaid: true, paidAmount: 50000, billControlNumber: '995350001' });
    const { wrapper } = await mountPage(MyBills);

    expect(wrapper.text()).toContain('REF-1');
    await findButton(wrapper, 'Check payment status').trigger('click');
    await flushPromises();

    expect(SelfServiceBills.getStatus).toHaveBeenCalledWith('b1');
    expect(findButton(wrapper, 'Check payment status')).toBeUndefined();
    expect(findButton(wrapper, 'Payment Receipt')).toBeDefined();
    expect(SelfServiceStats.get).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('keeps checking an open unpaid bill automatically and stops once it is paid', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    SelfServiceBills.getById.mockResolvedValue(unpaidBill());
    SelfServiceBills.getStatus
      .mockResolvedValueOnce({ id: 'b1', billPaid: false, billControlNumber: '995350001' })
      .mockResolvedValueOnce({ id: 'b1', billPaid: true, paidAmount: 50000, billControlNumber: '995350001' });
    const { wrapper } = await mountPage(MyBills);

    await findButton(wrapper, 'Invoice').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('GOVERNMENT BILL');

    vi.advanceTimersByTime(20000);
    await flushPromises();
    expect(SelfServiceBills.getStatus).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(20000);
    await flushPromises();
    expect(SelfServiceBills.getStatus).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(60000);
    await flushPromises();
    expect(SelfServiceBills.getStatus).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });
});
