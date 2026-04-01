import api from './Api.js';

export const SelfServiceDashboard = {
  async getStats() {
    const res = await api.get('/self-service/dashboard');
    return res.data.data;
  },
};

export const SelfServiceAppellants = {
  async getAll() {
    const res = await api.get('/self-service/appellants');
    return res.data.data;
  },
  async lookupTin(tin) {
    const res = await api.get(`/self-service/tin-lookup/${tin}`);
    return res.data;
  },
  async searchByTin(tin) {
    const res = await api.get('/self-service/appellants/search', { params: { tin } });
    return res.data.data;
  },
  async create(data) {
    const res = await api.post('/self-service/appellants', data);
    return res.data.data;
  },
  async link(appellantId) {
    const res = await api.post(`/self-service/appellants/${appellantId}/link`);
    return res.data.data;
  },
  async unlink(appellantId) {
    const res = await api.delete(`/self-service/appellants/${appellantId}/link`);
    return res.data.data;
  },
};

export const SelfServiceNotices = {
  async getAll(page = 1, size = 10) {
    const res = await api.get('/self-service/notices', { params: { page, size } });
    return res.data.data;
  },
  async getById(id) {
    const res = await api.get(`/self-service/notices/${id}`);
    return res.data.data;
  },
  async create(data) {
    const res = await api.post('/self-service/notices', data);
    return res.data.data;
  },
};

export const SelfServiceAppeals = {
  async getAll(page = 1, size = 10) {
    const res = await api.get('/self-service/appeals', { params: { page, size } });
    return res.data.data;
  },
  async getById(id) {
    const res = await api.get(`/self-service/appeals/${id}`);
    return res.data.data;
  },
  async create(data) {
    const res = await api.post('/self-service/appeals', data);
    return res.data.data;
  },
  async getParties(appealId) {
    const res = await api.get(`/self-service/appeals/${appealId}/parties`);
    return res.data.data;
  },
  async getDocuments(appealId) {
    const res = await api.get(`/self-service/appeals/${appealId}/documents`);
    return res.data.data;
  },
  async uploadDocument(appealId, file, documentType, remarks) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType || 'OTHER');
    if (remarks) formData.append('remarks', remarks);
    const res = await api.post(`/self-service/appeals/${appealId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },
};

export const SelfServiceBills = {
  async getAll(page = 1, size = 10) {
    const res = await api.get('/self-service/bills', { params: { page, size } });
    return res.data.data;
  },
  async getById(id) {
    const res = await api.get(`/self-service/bills/${id}`);
    return res.data.data;
  },
};
