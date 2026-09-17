import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import LoginDialog from './LoginDialog.vue';
import en from '@/i18n/en.js';
import AuthService from '@/service/AuthService.js';

vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));
vi.mock('@/service/AuthService.js', () => ({
  default: { startLogin: vi.fn(), completeLogin: vi.fn() },
}));

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });

const open = () =>
  mount(LoginDialog, {
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
        Button: {
          props: ['label', 'type'],
          template: '<button :type="type">{{ label }}</button>',
        },
      },
    },
  });

const credentials = async (wrapper, password = 'Str0ngPass!') => {
  await wrapper.find('#login-email').setValue('neema@example.co.tz');
  await wrapper.find('.password').setValue(password);
  await wrapper.find('form').trigger('submit');
  await new Promise((resolve) => setTimeout(resolve));
};

describe('LoginDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks for an email and a password, not a phone number', () => {
    const wrapper = open();
    expect(wrapper.find('#login-email').exists()).toBe(true);
    expect(wrapper.find('.password').exists()).toBe(true);
    expect(wrapper.find('#login-phone').exists()).toBe(false);
  });

  it('will not send anything until both are filled in', async () => {
    const wrapper = open();
    await wrapper.find('form').trigger('submit');
    expect(AuthService.startLogin).not.toHaveBeenCalled();
    expect(wrapper.find('.err').text()).toBeTruthy();
  });

  it('sends a code to the phone on the account, and says which number', async () => {
    AuthService.startLogin.mockResolvedValue({
      desk: 'portal',
      challenge: 'ch',
      phoneHint: '0766***344',
    });
    const wrapper = open();
    await credentials(wrapper);

    expect(AuthService.startLogin).toHaveBeenCalledWith('neema@example.co.tz', 'Str0ngPass!');
    expect(wrapper.find('h2').text()).toBe('Check your phone');
    expect(wrapper.text()).toContain('0766***344');
    // Nobody is signed in on the password alone.
    expect(wrapper.emitted('signed-in')).toBeFalsy();
  });

  it('signs in only once the code answers the challenge', async () => {
    AuthService.startLogin.mockResolvedValue({
      desk: 'portal',
      challenge: 'ch',
      phoneHint: '0766***344',
    });
    const wrapper = open();
    await credentials(wrapper);

    await wrapper.find('.otp-input').setValue('123456');
    await wrapper.find('form').trigger('submit');
    await new Promise((resolve) => setTimeout(resolve));

    expect(AuthService.completeLogin).toHaveBeenCalledWith('ch', '123456');
    expect(wrapper.emitted('signed-in')).toBeTruthy();
  });

  it('refuses a code that is not six digits, without calling the API', async () => {
    AuthService.startLogin.mockResolvedValue({ desk: 'portal', challenge: 'ch', phoneHint: '0766***344' });
    const wrapper = open();
    await credentials(wrapper);

    await wrapper.find('.otp-input').setValue('12');
    await wrapper.find('form').trigger('submit');
    expect(AuthService.completeLogin).not.toHaveBeenCalled();
  });

  it('lets the TRA desk straight in, since it has no code step', async () => {
    AuthService.startLogin.mockResolvedValue({ desk: 'tra', user: { userType: 'tra' } });
    const wrapper = open();
    await credentials(wrapper);

    expect(wrapper.emitted('signed-in')).toBeTruthy();
    expect(AuthService.completeLogin).not.toHaveBeenCalled();
  });

  it('shows what the API said when the password is wrong', async () => {
    AuthService.startLogin.mockRejectedValue({
      response: { data: { message: 'Invalid credentials' } },
    });
    const wrapper = open();
    await credentials(wrapper, 'wrong');

    expect(wrapper.find('.err').text()).toBe('Invalid credentials');
    expect(wrapper.emitted('signed-in')).toBeFalsy();
  });
});
