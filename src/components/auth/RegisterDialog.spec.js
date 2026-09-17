import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import RegisterDialog from './RegisterDialog.vue';
import en from '@/i18n/en.js';
import AuthService from '@/service/AuthService.js';

// The dialog only tells the user a code was sent; the toast itself is PrimeVue's.
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

vi.mock('@/service/AuthService.js', () => ({
  default: {
    register: vi.fn(),
    completeLogin: vi.fn(),
    lookupTin: vi.fn(),
  },
}));

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });

/** The dialog with its own shell, so what the user reads is what is asserted. */
const open = () =>
  mount(RegisterDialog, {
    props: { visible: true },
    global: {
      plugins: [i18n, [PrimeVue, { unstyled: true }]],
      stubs: {
        AuthDialogShell: {
          props: ['visible', 'title', 'subtitle', 'error'],
          template: '<div><h2>{{ title }}</h2><p class="err">{{ error }}</p><slot /></div>',
        },
        Password: {
          props: ['modelValue'],
          template: '<input class="password" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          emits: ['update:modelValue'],
        },
        FilePicker: {
          props: ['modelValue'],
          template: '<div class="file-picker"></div>',
        },
        Select: {
          props: ['modelValue', 'options'],
          template:
            '<select class="kind" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)">' +
            '<option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
          emits: ['update:modelValue'],
        },
        Button: {
          props: ['label', 'type'],
          template: '<button :type="type" @click="$emit(\'click\')">{{ label }}</button>',
        },
      },
    },
  });

const fill = async (wrapper, over = {}) => {
  const values = {
    idNumber: '123-456-789',
    firstName: 'Neema',
    email: 'neema@example.co.tz',
    phone: '0766223344',
    password: 'Str0ngPass!',
    ...over,
  };
  await wrapper.find('#reg-number').setValue(values.idNumber);
  await wrapper.find('#reg-first').setValue(values.firstName);
  await wrapper.find('#reg-email').setValue(values.email);
  await wrapper.find('#reg-phone').setValue(values.phone);
  await wrapper.find('.password').setValue(values.password);
};

describe('RegisterDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthService.register.mockResolvedValue({ challenge: 'ch', phoneHint: '0766***344' });
  });

  it('opens on the four kinds of filer the Board accepts', () => {
    const options = open().findAll('.kind option').map((o) => o.text());
    expect(options).toEqual([
      'A company or organisation',
      'An individual taxpayer',
      'An advocate',
      'A tax consultant',
    ]);
  });

  it('asks a company for its TIN, and an advocate for a roll number and certificate', async () => {
    const wrapper = open();
    expect(wrapper.text()).toContain('TIN');
    expect(wrapper.find('.file-picker').exists()).toBe(false);

    await wrapper.find('.kind').setValue('ADVOCATE');
    expect(wrapper.text()).toContain('Roll number');
    // Somebody who files for other people shows the Board their standing.
    expect(wrapper.find('.file-picker').exists()).toBe(true);
  });

  it('will not send an advocate to the registry without the certificate', async () => {
    const wrapper = open();
    await wrapper.find('.kind').setValue('ADVOCATE');
    await fill(wrapper, { idNumber: 'ADV-9002' });
    await wrapper.find('form').trigger('submit');

    expect(AuthService.register).not.toHaveBeenCalled();
    expect(wrapper.find('.err').text()).toBe('Attach the certificate that proves this number');
  });

  it('holds the password to the length the API requires', async () => {
    const wrapper = open();
    await fill(wrapper, { password: 'short' });
    await wrapper.find('form').trigger('submit');

    expect(AuthService.register).not.toHaveBeenCalled();
    expect(wrapper.find('.err').text()).toBe('Use a password of at least 8 characters');
  });

  it('checks the email and the phone before anything is sent', async () => {
    const wrapper = open();
    await fill(wrapper, { email: 'not-an-email' });
    await wrapper.find('form').trigger('submit');
    expect(AuthService.register).not.toHaveBeenCalled();

    await fill(wrapper, { phone: '12345' });
    await wrapper.find('form').trigger('submit');
    expect(AuthService.register).not.toHaveBeenCalled();
  });

  it('registers a company and moves to the code sent to their phone', async () => {
    const wrapper = open();
    await fill(wrapper);
    await wrapper.find('form').trigger('submit');
    await new Promise((resolve) => setTimeout(resolve));

    expect(AuthService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'ORGANISATION',
        idNumber: '123-456-789',
        email: 'neema@example.co.tz',
        phone: '0766223344',
      }),
    );
    expect(wrapper.find('h2').text()).toBe('Check your phone');
    expect(wrapper.text()).toContain('0766***344');
  });

  it('finishes with the code, against the challenge the password step issued', async () => {
    const wrapper = open();
    await fill(wrapper);
    await wrapper.find('form').trigger('submit');
    await new Promise((resolve) => setTimeout(resolve));

    await wrapper.find('.otp-input').setValue('123456');
    await wrapper.find('form').trigger('submit');
    await new Promise((resolve) => setTimeout(resolve));

    expect(AuthService.completeLogin).toHaveBeenCalledWith('ch', '123456');
    expect(wrapper.emitted('registered')).toBeTruthy();
  });
});
