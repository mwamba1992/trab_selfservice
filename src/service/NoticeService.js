import api from './Api.js';

export default {
  async getAll(page = 1, size = 10) {
    const res = await api.get('/notices', { params: { page, size } });
    return res.data.data;
  },

  async getById(id) {
    const res = await api.get(`/notices/${id}`);
    return res.data.data;
  },

  async create(data) {
    const res = await api.post('/notices', data);
    return res.data.data;
  },
};
