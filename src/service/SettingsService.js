import api from './Api.js';

export const RegionService = {
  async getAll() {
    const res = await api.get('/regions');
    return res.data.data.items || res.data.data;
  },
};
