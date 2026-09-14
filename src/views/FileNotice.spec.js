import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountPage, findButton, isoDaysAgo } from '@/test/mountPage.js';
import { i18n } from '@/i18n/index.js';

vi.mock('@/service/SelfServiceApi.js', () => ({
  SelfServiceAppellants: { getAll: vi.fn(), create: vi.fn() },
  SelfServiceNotices: { create: vi.fn() },
}));
vi.mock('@/service/SettingsService.js', () => ({
  RegionService: { getAll: vi.fn() },
}));

const { SelfServiceAppellants, SelfServiceNotices } = await import('@/service/SelfServiceApi.js');
const { RegionService } = await import('@/service/SettingsService.js');
const FileNotice = (await import('./FileNotice.vue')).default;

const APPELLANT = { id: 'a1', firstName: 'ACME Ltd', tinNumber: '123-456-789', phone: '0712345678' };
const DRAFT_KEY = 'draft:u1:notice';

const seedDraft = (form) =>
  localStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({
      savedAt: Date.now(),
      data: {
        form: { appellantId: 'a1', loggedAt: isoDaysAgo(0), description: '', regionId: null, additionalRespondent: '', ...form },
        selectedAppellant: { ...APPELLANT, displayName: 'ACME Ltd (123-456-789)' },
      },
    }),
  );

describe('FileNotice page', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('userId', 'u1');
    i18n.global.locale.value = 'en';
    vi.clearAllMocks();
    SelfServiceAppellants.getAll.mockResolvedValue([APPELLANT]);
    RegionService.getAll.mockResolvedValue([{ id: 'r1', name: 'Dar es Salaam' }]);
  });

  it('restores an unfinished notice and blocks a filing more than 30 days after service', async () => {
    seedDraft({ dateOfTaxationDecision: isoDaysAgo(45), dateOfServiceDecision: isoDaysAgo(40) });
    const { wrapper } = await mountPage(FileNotice);

    expect(wrapper.text()).toContain('We restored the form you had not finished.');

    await findButton(wrapper, 'Next').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('40 days have passed since the date of service');
    expect(findButton(wrapper, 'Review').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('files a valid notice, clears the draft and goes to My Notices', async () => {
    seedDraft({ dateOfTaxationDecision: isoDaysAgo(6), dateOfServiceDecision: isoDaysAgo(5) });
    SelfServiceNotices.create.mockResolvedValue({ id: 'n1' });
    const { wrapper, router } = await mountPage(FileNotice, { route: '/notices/new' });

    await findButton(wrapper, 'Next').trigger('click');
    await flushPromises();
    await findButton(wrapper, 'Review').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Review Your Notice');

    await findButton(wrapper, 'Submit Notice').trigger('click');
    await flushPromises();

    expect(SelfServiceNotices.create).toHaveBeenCalledWith(
      expect.objectContaining({
        appellantId: 'a1',
        dateOfServiceDecision: isoDaysAgo(5),
        dateOfTaxationDecision: isoDaysAgo(6),
      }),
    );
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(router.currentRoute.value.path).toBe('/notices');
    wrapper.unmount();
  });

  it('keeps the draft and stays on the page when filing fails', async () => {
    seedDraft({ dateOfTaxationDecision: isoDaysAgo(6), dateOfServiceDecision: isoDaysAgo(5) });
    SelfServiceNotices.create.mockRejectedValue({ response: { data: { description: 'Region is required' } } });
    const { wrapper, router } = await mountPage(FileNotice, { route: '/notices/new' });

    await findButton(wrapper, 'Next').trigger('click');
    await flushPromises();
    await findButton(wrapper, 'Review').trigger('click');
    await flushPromises();
    await findButton(wrapper, 'Submit Notice').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/notices/new');
    wrapper.unmount();
    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();
  });
});
