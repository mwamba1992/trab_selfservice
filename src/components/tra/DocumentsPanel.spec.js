import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import Tooltip from 'primevue/tooltip';
import Select from 'primevue/select';

vi.mock('@/service/TraApi.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, TraApi: { ...actual.TraApi, uploadDocument: vi.fn(), fileBlob: vi.fn() } };
});

import { TraApi } from '@/service/TraApi.js';
import DocumentsPanel from './DocumentsPanel.vue';

// The picker hides the input behind its own control; the input is still what
// the browser fires, so the test drives it the same way a user's choice does.
const pick = async (wrapper, file) => {
  const input = wrapper.find('#tra-doc-file');
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true });
  await input.trigger('change');
};

const panel = async (props = {}) => {
  const wrapper = mount(DocumentsPanel, {
    props: { appealId: 'a1', documents: [], canUpload: true, error: '', currentUserId: 'officer-1', ...props },
    attachTo: document.body,
    global: {
      plugins: [[PrimeVue, { unstyled: true }], ToastService],
      directives: { tooltip: Tooltip },
      stubs: { teleport: true },
    },
  });
  await flushPromises();
  return { wrapper };
};

describe('DocumentsPanel', () => {
  beforeEach(() => vi.mocked(TraApi.uploadDocument).mockReset().mockResolvedValue({}));

  it('rejects files the backend would refuse before uploading', async () => {
    const { wrapper } = await panel();
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();

    await pick(wrapper, new File(['x'], 'payload.exe'));
    expect(wrapper.text()).toContain('File type not allowed');

    const big = new File(['x'], 'scan.pdf', { type: 'application/pdf' });
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });
    await pick(wrapper, big);
    expect(wrapper.text()).toContain('The maximum size is 10.0 MB');

    await wrapper.find('form').trigger('submit');
    expect(TraApi.uploadDocument).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('uploads with the chosen type and remarks', async () => {
    const { wrapper } = await panel();
    const file = new File(['%PDF'], 'defence-bundle.pdf', { type: 'application/pdf' });

    await pick(wrapper, file);
    await wrapper.findComponent(Select).setValue('SUPPORTING');
    await wrapper.find('#doc-remarks').setValue('Signed copy');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(TraApi.uploadDocument).toHaveBeenCalledWith('a1', file, 'SUPPORTING', 'Signed copy');
    expect(wrapper.emitted('uploaded')).toHaveLength(1);
    wrapper.unmount();
  });

  it('lists documents and hides the upload form without permission', async () => {
    const { wrapper } = await panel({
      canUpload: false,
      documents: [
        {
          id: 'd1',
          fileName: 'uuid.pdf',
          originalName: 'Judgement.pdf',
          documentType: 'JUDGEMENT',
          remarks: 'Decision filed by Judge',
          uploadedBy: 'officer-1',
          createdAt: '2026-04-01T10:00:00Z',
          fileSize: 487000,
        },
      ],
    });

    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.text()).toContain('Judgement.pdf');
    expect(wrapper.text()).toContain('Decision filed by Judge');
    expect(wrapper.text()).toContain('You');
    expect(wrapper.find('[aria-label="Download Judgement.pdf"]').exists()).toBe(true);
    wrapper.unmount();
  });
});
