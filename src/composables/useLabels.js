import { useI18n } from 'vue-i18n';

// Backend value ↔ translation key for application types (the backend stores the English label).
export const APPLICATION_TYPES = [
  { value: 'Normal Application', key: 'NORMAL' },
  { value: 'Bill of Cost', key: 'BILL_OF_COST' },
  { value: 'Execution', key: 'EXECUTION' },
];

/** Translates codes that come from the backend, falling back to the raw value. */
export function useLabels() {
  const { t, te } = useI18n();

  const lookup = (namespace, value) => {
    if (value === null || value === undefined || value === '') return t('common.dash');
    const key = `${namespace}.${String(value).replace(/[\s-]/g, '_')}`;
    return te(key) ? t(key) : String(value);
  };

  return {
    statusLabel: (value) => lookup('status', value),
    docTypeLabel: (value) => lookup('docTypes', value),
    applicationTypeLabel: (value) => {
      const type = APPLICATION_TYPES.find((a) => a.value === value);
      return type ? t(`applications.types.${type.key}`) : lookup('status', value);
    },
  };
}
