import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import Register from './Register.vue';
import en from '@/i18n/en.js';
import AuthService from '@/service/AuthService.js';

vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));
const push = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  RouterLink: { template: '<a><slot /></a>' },
}));
vi.mock('@/service/AuthService.js', () => ({
  default: { register: vi.fn(), completeLogin: vi.fn(), lookupTin: vi.fn() },
}));

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });

const open = () =>
  mount(Register, {
    global: {
      plugins: [i18n, [PrimeVue, { unstyled: true }]],
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
        Password: {
          props: ['modelValue'],
          template: '<input class="password" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          emits: ['update:modelValue'],
        },
        FilePicker: { props: ['modelValue'], template: '<div class="file-picker"></div>' },
        Button: { props: ['label', 'type'], template: '<button :type="type" @click="$emit(\'click\')">{{ label }}</button>' },
      },
    },
  });

const pickKind = async (wrapper, label) => {
  const tile = wrapper.findAll('.kind-tile').find((t) => t.text() === label);
  await tile.trigger('click');
};

const identity = async (wrapper, number = '123-456-789') => {
  await wrapper.find('#reg-number').setValue(number);
  await wrapper.find('form').trigger('submit');
};

const details = async (wrapper, over = {}) => {
  const v = { firstName: 'Neema', email: 'neema@example.co.tz', phone: '0766223344', password: 'Str0ngPass!', ...over };
  await wrapper.find('#reg-first').setValue(v.firstName);
  await wrapper.find('#reg-email').setValue(v.email);
  await wrapper.find('#reg-phone').setValue(v.phone);
  await wrapper.find('.password').setValue(v.password);
  await wrapper.find('form').trigger('submit');
  await new Promise((r) => setTimeout(r));
};

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthService.register.mockResolvedValue({ challenge: 'ch', phoneHint: '0766***344' });
  });

  it('opens on who you are, with the four kinds to pick from', () => {
    const wrapper = open();
    expect(wrapper.findAll('.kind-tile').map((t) => t.text())).toEqual([
      'A company or organisation',
      'An individual taxpayer',
      'An advocate',
      'A tax consultant',
    ]);
    // Only the first question is asked; the rest wait their turn.
    expect(wrapper.find('#reg-email').exists()).toBe(false);
  });

  it('asks each kind for the number it is known by', async () => {
    const wrapper = open();
    expect(wrapper.text()).toContain('TIN');

    await pickKind(wrapper, 'An advocate');
    expect(wrapper.text()).toContain('Roll number');
    expect(wrapper.find('.file-picker').exists()).toBe(true);

    await pickKind(wrapper, 'An individual taxpayer');
    expect(wrapper.text()).toContain('National Identification Number');
    expect(wrapper.find('.file-picker').exists()).toBe(false);
  });

  it('holds each number to its own shape as it is typed', async () => {
    const wrapper = open();
    const field = () => wrapper.find('#reg-number');

    await field().setValue('123456789');
    expect(field().element.value).toBe('123-456-789');

    await pickKind(wrapper, 'An individual taxpayer');
    await field().setValue('1990abc0101 12345 00001 12');
    expect(field().element.value).toBe('19900101-12345-00001-12');
  });

  it('will not move on from a number that is the wrong shape', async () => {
    const wrapper = open();
    await identity(wrapper, '12345');
    expect(wrapper.find('.register-error').exists()).toBe(true);
    expect(wrapper.find('#reg-email').exists()).toBe(false);
  });

  it('will not move on from an advocate with no certificate', async () => {
    const wrapper = open();
    await pickKind(wrapper, 'An advocate');
    await identity(wrapper, 'ADV-9002');
    expect(wrapper.find('.register-error').text()).toContain('Attach the certificate');
  });

  it('moves to the details once the number is right', async () => {
    const wrapper = open();
    await identity(wrapper);
    expect(wrapper.find('#reg-email').exists()).toBe(true);
    expect(wrapper.find('.steps li.now').text()).toContain('Your details');
  });

  it('checks the details before anything is sent', async () => {
    const wrapper = open();
    await identity(wrapper);

    await details(wrapper, { email: 'not-an-email' });
    expect(AuthService.register).not.toHaveBeenCalled();

    await details(wrapper, { password: 'short' });
    expect(AuthService.register).not.toHaveBeenCalled();
    expect(wrapper.find('.register-error').text()).toContain('8 characters');
  });

  it('registers, then asks for the code sent to the phone', async () => {
    const wrapper = open();
    await identity(wrapper);
    await details(wrapper);

    expect(AuthService.register).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'ORGANISATION', idNumber: '123-456-789', email: 'neema@example.co.tz' }),
    );
    expect(wrapper.text()).toContain('0766***344');
  });

  it('finishes on the code and goes to the dashboard', async () => {
    const wrapper = open();
    await identity(wrapper);
    await details(wrapper);

    await wrapper.find('.otp-input').setValue('123456');
    await wrapper.find('form').trigger('submit');
    await new Promise((r) => setTimeout(r));

    expect(AuthService.completeLogin).toHaveBeenCalledWith('ch', '123456');
    expect(push).toHaveBeenCalledWith('/dashboard');
  });

  it('lets someone go back and change who they said they are', async () => {
    const wrapper = open();
    await identity(wrapper);
    const back = wrapper.findAll('button').find((b) => b.text() === 'Back');
    await back.trigger('click');
    expect(wrapper.findAll('.kind-tile').length).toBe(4);
  });
});
