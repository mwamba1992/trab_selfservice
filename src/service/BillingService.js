import api from './Api.js';

export default {
  async getAll(page = 1, size = 100) {
    const res = await api.get('/bills', { params: { page, size } });
    return res.data.data;
  },
  async getById(id) {
    const res = await api.get(`/bills/${id}`);
    return res.data.data;
  },
};
