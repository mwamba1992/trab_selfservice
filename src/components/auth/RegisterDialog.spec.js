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
        Button: {
          props: ['label', 'type'],
          template: '<button :type="type" @click="$emit(\'click\')">{{ label }}</button>',
        },
      },
    },
  });

const pickKind = async (wrapper, label) => {
  await wrapper.findAll('.kind-tile').find((tile) => tile.text() === label).trigger('click');
};

/** Step one: what you are, and the number that proves it. */
const identity = async (wrapper, idNumber = '123-456-789') => {
  await wrapper.find('#reg-number').setValue(idNumber);
  await wrapper.find('form').trigger('submit');
};

/** Step two: how you sign in, and how the Board reaches you. */
const details = async (wrapper, over = {}) => {
  const values = { firstName: 'Neema', email: 'neema@example.co.tz', phone: '0766223344', password: 'Str0ngPass!', ...over };
  await wrapper.find('#reg-first').setValue(values.firstName);
  await wrapper.find('#reg-email').setValue(values.email);
  await wrapper.find('#reg-phone').setValue(values.phone);
  await wrapper.find('.password').setValue(values.password);
  await wrapper.find('form').trigger('submit');
  await new Promise((resolve) => setTimeout(resolve));
};

describe('RegisterDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthService.register.mockResolvedValue({ challenge: 'ch', phoneHint: '0766***344' });
  });

  it('opens on the four kinds of filer the Board accepts', () => {
    const options = open().findAll('.kind-tile').map((o) => o.text());
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

    await pickKind(wrapper, 'An advocate');
    expect(wrapper.text()).toContain('Roll number');
    // Somebody who files for other people shows the Board their standing.
    expect(wrapper.find('.file-picker').exists()).toBe(true);
  });

  it('asks one thing at a time, so the card never has to scroll', async () => {
    const wrapper = open();
    // Step one asks who you are; nothing else is on screen yet.
    expect(wrapper.find('#reg-email').exists()).toBe(false);

    await identity(wrapper);
    expect(wrapper.find('#reg-email').exists()).toBe(true);
    expect(wrapper.find('.kind-tile').exists()).toBe(false);
    expect(wrapper.find('.steps li.now').text()).toContain('Your details');
  });

  it('lets someone go back and change who they said they are', async () => {
    const wrapper = open();
    await identity(wrapper);
    await wrapper.findAll('button').find((b) => b.text() === 'Back').trigger('click');
    expect(wrapper.findAll('.kind-tile')).toHaveLength(4);
  });

  it('holds each kind of number to its own shape', async () => {
    const wrapper = open();
    const field = () => wrapper.find('#reg-number');

    // A TIN is nine digits, written in threes.
    expect(field().attributes('maxlength')).toBe('11');
    await field().setValue('123456789');
    expect(field().element.value).toBe('123-456-789');

    await pickKind(wrapper, 'An individual taxpayer');
    expect(field().attributes('maxlength')).toBe('23');
    expect(field().attributes('inputmode')).toBe('numeric');
    // Letters are simply not taken, and the groups are written in as you type.
    await field().setValue('1990abc0101 12345 00001 12');
    expect(field().element.value).toBe('19900101-12345-00001-12');

    // A roll number is whatever the roll says it is.
    await pickKind(wrapper, 'An advocate');
    await field().setValue('ADV-9002');
    expect(field().element.value).toBe('ADV-9002');
  });

  it('will not send a National Identification Number that is not twenty digits', async () => {
    const wrapper = open();
    await pickKind(wrapper, 'An individual taxpayer');
    await identity(wrapper, '1990010112345');

    expect(wrapper.find('#reg-email').exists()).toBe(false);
    expect(wrapper.find('.err').text()).toBe('A National Identification Number is 20 digits');
  });

  it('will not send a TIN that is not nine digits', async () => {
    const wrapper = open();
    await identity(wrapper, '12345');
    expect(wrapper.find('#reg-email').exists()).toBe(false);
  });

  it('will not take an advocate past step one without the certificate', async () => {
    const wrapper = open();
    await pickKind(wrapper, 'An advocate');
    await identity(wrapper, 'ADV-9002');

    expect(wrapper.find('#reg-email').exists()).toBe(false);
    expect(wrapper.find('.err').text()).toBe('Attach the certificate that proves this number');
  });

  it('holds the password to the length the API requires', async () => {
    const wrapper = open();
    await identity(wrapper);
    await details(wrapper, { password: 'short' });

    expect(AuthService.register).not.toHaveBeenCalled();
    expect(wrapper.find('.err').text()).toBe('Use a password of at least 8 characters');
  });

  it('checks the email and the phone before anything is sent', async () => {
    const wrapper = open();
    await identity(wrapper);

    await details(wrapper, { email: 'not-an-email' });
    expect(AuthService.register).not.toHaveBeenCalled();

    await details(wrapper, { phone: '12345' });
    expect(AuthService.register).not.toHaveBeenCalled();
  });

  it('registers a company and moves to the code sent to their phone', async () => {
    const wrapper = open();
    await identity(wrapper);
    await details(wrapper);

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
    await identity(wrapper);
    await details(wrapper);

    await wrapper.find('.otp-input').setValue('123456');
    await wrapper.find('form').trigger('submit');
    await new Promise((resolve) => setTimeout(resolve));

    expect(AuthService.completeLogin).toHaveBeenCalledWith('ch', '123456');
    expect(wrapper.emitted('registered')).toBeTruthy();
  });
});
