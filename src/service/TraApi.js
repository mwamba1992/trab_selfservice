import api from './Api.js';

// The TRA desk of the portal. Same axios instance as the appellant side, so
// token refresh and session expiry are handled in one place.
const data = (res) => res.data.data;
const trimmed = (value) => (value?.trim() ? { search: value.trim() } : {});

/**
 * @typedef {object} TraAppeal
 * @property {string} id
 * @property {string|null} appealNo
 * @property {string} appellantName
 * @property {string} dateOfFiling
 * @property {string} statusTrend
 * @property {string|null} [assignedOfficerName]
 * @property {string|null} [replyDueDate]
 * @property {number|null} [daysRemaining]
 * @property {boolean} [overdue]
 * @property {boolean} [caseClosed]
 * @property {'REPLIED'|'NOT_REQUIRED'|'OVERDUE'|'PENDING'} [replyStatus]
 * @property {string|null} [disputeNo]
 */

/**
 * @typedef {object} SubmissionWindow
 * @property {string|null} hearingDate
 * @property {string|null} venue
 * @property {string|null} deadline
 * @property {boolean} open
 * @property {Array<object>} submissions
 */

export const TRA_DOCUMENT_TYPES = ['EVIDENCE', 'SUPPORTING', 'ANNEXTURE', 'OTHER'];
export const FILING_TYPES = ['PRELIMINARY_OBJECTION', 'SETTLEMENT_CONSENT', 'WITHDRAWAL_CONSENT', 'TRIBUNAL_APPEAL_INTENT'];
export const DECISION_ACTIONS = ['REFUND_ISSUED', 'ASSESSMENT_REVISED', 'TAX_ENFORCED', 'APPEAL_TO_TRIBUNAL', 'NO_ACTION_REQUIRED'];
/** Mirrors backend common/upload.config.ts. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_UPLOAD_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];

export const TraApi = {
  async dashboard() {
    return data(await api.get('/tra/dashboard'));
  },
  async deadlines() {
    return data(await api.get('/tra/deadlines'));
  },

  // ─── Cases ───
  async appeals(query = {}) {
    return data(
      await api.get('/tra/appeals', {
        params: {
          page: query.page ?? 1,
          size: query.size ?? 10,
          scope: query.scope ?? 'all',
          ...(query.status ? { status: query.status } : {}),
          ...(query.officerId ? { officerId: query.officerId } : {}),
          ...(query.overdue ? { overdue: 'true' } : {}),
          ...(query.reply ? { reply: query.reply } : {}),
          ...(query.dateFrom ? { dateFrom: query.dateFrom } : {}),
          ...(query.dateTo ? { dateTo: query.dateTo } : {}),
          ...trimmed(query.search),
        },
      }),
    );
  },
  async appeal(id) {
    return data(await api.get(`/tra/appeals/${id}`));
  },
  async parties(id) {
    return data(await api.get(`/tra/appeals/${id}/parties`));
  },
  async setDisputeNo(id, disputeNo) {
    return data(await api.put(`/tra/appeals/${id}/dispute-no`, { disputeNo }));
  },

  // ─── Defence, filings and written submissions ───
  async replies(id) {
    return data(await api.get(`/tra/appeals/${id}/reply`));
  },
  async fileReply(id, body) {
    return data(await api.post(`/tra/appeals/${id}/reply`, { body }));
  },
  async filings(id) {
    return data(await api.get(`/tra/appeals/${id}/filings`));
  },
  async lodgeFiling(id, type, grounds) {
    return data(await api.post(`/tra/appeals/${id}/filings`, { type, grounds }));
  },
  /** Both sides' written submissions for the next hearing, with the closing day. */
  async submissions(id) {
    return data(await api.get(`/tra/appeals/${id}/submissions`));
  },
  async fileSubmission(id, { stage, body, file }) {
    const formData = new FormData();
    formData.append('stage', stage);
    if (body?.trim()) formData.append('body', body.trim());
    if (file) formData.append('file', file);
    return data(
      await api.post(`/tra/appeals/${id}/submissions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      }),
    );
  },

  // ─── Documents and notes ───
  async documents(id) {
    return data(await api.get(`/tra/appeals/${id}/documents`));
  },
  async uploadDocument(id, file, documentType = 'EVIDENCE', remarks = '') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    if (remarks.trim()) formData.append('remarks', remarks.trim());
    return data(
      await api.post(`/tra/appeals/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      }),
    );
  },
  async notes(id) {
    return data(await api.get(`/tra/appeals/${id}/notes`));
  },
  async addNote(id, body) {
    return data(await api.post(`/tra/appeals/${id}/notes`, { body }));
  },

  // ─── Assignment (supervisor) ───
  async assign(id, officerId) {
    return data(await api.post(`/tra/appeals/${id}/assign`, { officerId }));
  },
  async unassign(id) {
    return data(await api.delete(`/tra/appeals/${id}/assign`));
  },
  async assignments(id) {
    return data(await api.get(`/tra/appeals/${id}/assignments`));
  },

  // ─── Registry feeds ───
  async notices(page = 1, size = 10, search = '') {
    return data(await api.get('/tra/notices', { params: { page, size, ...trimmed(search) } }));
  },
  async applications(page = 1, size = 10, search = '') {
    return data(await api.get('/tra/applications', { params: { page, size, ...trimmed(search) } }));
  },
  async applicationResponses(id) {
    return data(await api.get(`/tra/applications/${id}/responses`));
  },
  async respondToApplication(id, body) {
    return data(await api.post(`/tra/applications/${id}/responses`, { body }));
  },
  async summons(page = 1, size = 10) {
    return data(await api.get('/tra/summons', { params: { page, size } }));
  },
  async respondToHearing(summonsAppealId, input) {
    return data(await api.put(`/tra/summons/${summonsAppealId}/response`, input));
  },
  async decisions(page = 1, size = 10) {
    return data(await api.get('/tra/decisions', { params: { page, size } }));
  },
  async setDecisionAction(appealId, input) {
    return data(await api.put(`/tra/appeals/${appealId}/decision-action`, input));
  },

  // ─── Officers and settings ───
  async officers(page = 1, size = 100) {
    return data(await api.get('/tra/users', { params: { page, size } }));
  },
  async createOfficer(payload) {
    return data(await api.post('/tra/users', payload));
  },
  async updateOfficer(id, payload) {
    return data(await api.patch(`/tra/users/${id}`, payload));
  },
  async deactivateOfficer(id) {
    return data(await api.delete(`/tra/users/${id}`));
  },
  async getReplyDeadlineDays() {
    return data(await api.get('/tra/settings/reply-deadline-days'));
  },
  async setReplyDeadlineDays(days) {
    return data(await api.put('/tra/settings/reply-deadline-days', { days }));
  },

  /** Stored upload as a Blob; the download route needs the JWT, so links cannot be used. */
  async fileBlob(fileName) {
    const res = await api.get(`/uploads/${encodeURIComponent(fileName)}`, { responseType: 'blob', timeout: 120000 });
    return res.data;
  },
};

export default TraApi;
