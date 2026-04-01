import api from './Api.js';

export const RegionService = {
  async getAll() {
    const res = await api.get('/self-service/regions');
    return res.data.data || [];
  },
};

export const TaxTypeService = {
  async getAll() {
    const res = await api.get('/self-service/tax-types');
    return res.data.data || [];
  },
};

export const CurrencyService = {
  async getAll() {
    const res = await api.get('/self-service/currencies');
    return res.data.data || [];
  },
};
