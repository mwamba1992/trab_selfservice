import api from './Api.js';

const data = (res) => res.data.data;
const page =
  (url) =>
  async (page = 1, size = 10, search = '') =>
    data(await api.get(url, { params: { page, size, search } }));

function documentsApi(base) {
  return {
    async getDocuments(id) {
      return data(await api.get(`${base}/${id}/documents`));
    },
    async uploadDocument(id, file, documentType, remarks) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType || 'OTHER');
      if (remarks) formData.append('remarks', remarks);
      return data(
        await api.post(`${base}/${id}/documents`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000,
        }),
      );
    },
  };
}

export const SelfServiceDashboard = {
  async getStats() {
    return data(await api.get('/self-service/dashboard'));
  },
};

// Per-resource stat aggregates (server-side, correct under lazy pagination).
export const SelfServiceStats = {
  async get() {
    return data(await api.get('/self-service/stats'));
  },
};

export const SelfServiceProfile = {
  async get() {
    return data(await api.get('/self-service/profile'));
  },
  async update(payload) {
    return data(await api.put('/self-service/profile', payload));
  },
  async updateCompany(payload) {
    return data(await api.put('/company/profile', payload));
  },
};

export const SelfServiceNotifications = {
  async getAll(page = 1, size = 10, unread = false) {
    return data(await api.get('/self-service/notifications', { params: { page, size, unread } }));
  },
  async unreadCount() {
    return data(await api.get('/self-service/notifications/unread-count')).count;
  },
  async markRead(id) {
    return data(await api.put(`/self-service/notifications/${id}/read`));
  },
  async markAllRead() {
    return data(await api.put('/self-service/notifications/read-all'));
  },
};

export const SelfServiceAppellants = {
  async getAll() {
    return data(await api.get('/self-service/appellants'));
  },
  async lookupTin(tin) {
    const res = await api.get(`/self-service/tin-lookup/${encodeURIComponent(tin)}`);
    return res.data;
  },
  async searchByTin(tin) {
    return data(await api.get('/self-service/appellants/search', { params: { tin } }));
  },
  async create(payload) {
    return data(await api.post('/self-service/appellants', payload));
  },
  async link(appellantId) {
    return data(await api.post(`/self-service/appellants/${appellantId}/link`));
  },
  async unlink(appellantId) {
    return data(await api.delete(`/self-service/appellants/${appellantId}/link`));
  },
};

export const SelfServiceNotices = {
  getAll: page('/self-service/notices'),
  async getById(id) {
    return data(await api.get(`/self-service/notices/${id}`));
  },
  async create(payload) {
    return data(await api.post('/self-service/notices', payload));
  },
  /** Corrects a returned notice and sends it back to the registry. */
  async resubmit(id, corrections) {
    return data(await api.post(`/self-service/notices/${id}/resubmit`, corrections));
  },
  ...documentsApi('/self-service/notices'),
};

export const SelfServiceAppeals = {
  getAll: page('/self-service/appeals'),
  async getById(id) {
    return data(await api.get(`/self-service/appeals/${id}`));
  },
  async create(payload) {
    return data(await api.post('/self-service/appeals', payload));
  },
  async getParties(appealId) {
    return data(await api.get(`/self-service/appeals/${appealId}/parties`));
  },
  /** Corrects a returned statement of appeal and sends it back to the registry. */
  async resubmit(id, corrections) {
    return data(await api.post(`/self-service/appeals/${id}/resubmit`, corrections));
  },
  /** Copies of the decree, ruling and drawn order, with what each costs and whether it is paid. */
  async getCopies(appealId) {
    return data(await api.get(`/self-service/appeals/${appealId}/copies`));
  },
  async requestCopy(appealId, documentType) {
    return data(await api.post(`/self-service/appeals/${appealId}/copies`, { documentType }));
  },
  /** Both sides' written submissions for the next hearing, with the closing day. */
  async getSubmissions(appealId) {
    return data(await api.get(`/self-service/appeals/${appealId}/submissions`));
  },
  async fileSubmission(appealId, { stage, body, file }) {
    const formData = new FormData();
    formData.append('stage', stage);
    if (body) formData.append('body', body);
    if (file) formData.append('file', file);
    return data(
      await api.post(`/self-service/appeals/${appealId}/submissions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      }),
    );
  },
  /** Both sides' replies: TRA's statement of defence and the appellant's answer. */
  async getReplies(appealId) {
    return data(await api.get(`/self-service/appeals/${appealId}/replies`));
  },
  async fileReply(appealId, { body, file }) {
    const formData = new FormData();
    if (body) formData.append('body', body);
    if (file) formData.append('file', file);
    return data(
      await api.post(`/self-service/appeals/${appealId}/replies`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      }),
    );
  },
  ...documentsApi('/self-service/appeals'),
};

export const SelfServiceApplications = {
  getAll: page('/self-service/applications'),
  async getById(id) {
    return data(await api.get(`/self-service/applications/${id}`));
  },
  async create(payload) {
    return data(await api.post('/self-service/applications', payload));
  },
  ...documentsApi('/self-service/applications'),
};

/** Stored uploads are served behind the token, so attachments are fetched, not linked. */
export const SelfServiceFiles = {
  async blob(fileName) {
    const res = await api.get(`/uploads/${encodeURIComponent(fileName)}`, { responseType: 'blob', timeout: 120000 });
    return res.data;
  },
};

export const SelfServiceDocuments = {
  /** Ownership-checked download; resolves to a Blob. */
  async download(documentId) {
    const res = await api.get(`/self-service/documents/${documentId}/download`, { responseType: 'blob', timeout: 120000 });
    return res.data;
  },
};

export const SelfServiceBills = {
  getAll: page('/self-service/bills'),
  async getById(id) {
    return data(await api.get(`/self-service/bills/${id}`));
  },
  async getStatus(id) {
    return data(await api.get(`/self-service/bills/${id}/status`));
  },
};

export const SelfServiceSummons = {
  getAll: page('/self-service/summons'),
};

export const SelfServiceDecisions = {
  getAll: page('/self-service/decisions'),
  /** Ownership-checked judgement PDF for an appeal; resolves to a Blob. */
  async downloadJudgement(appealId) {
    const res = await api.get(`/self-service/decisions/${appealId}/judgement`, { responseType: 'blob', timeout: 120000 });
    return res.data;
  },
};

export const SelfServiceCompany = {
  async getStaff() {
    return data(await api.get('/company/staff'));
  },
  async addStaff(payload) {
    return data(await api.post('/company/staff', payload));
  },
  async deactivateStaff(id) {
    return data(await api.delete(`/company/staff/${id}`));
  },
  async reactivateStaff(id) {
    return data(await api.put(`/company/staff/${id}/reactivate`));
  },
};
