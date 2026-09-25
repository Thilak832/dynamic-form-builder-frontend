import api from './client'

// Respondents identify with the session secret; logged-in customers are also recognised by their login token.
const session = (sessionId) => (sessionId ? { headers: { 'X-Session-Id': sessionId } } : {})

export const customerApi = {
  catalog: () => api.get('/catalog').then((r) => r.data),
  bookings: () => api.get('/me/bookings').then((r) => r.data),
  booking: (formId, rid) => api.get(`/forms/${formId}/responses/${rid}`).then((r) => r.data),
}

export const authApi = {
  login: (data) => api.post('/auth/login', data).then((r) => r.data),
  register: (data) => api.post('/auth/register', data).then((r) => r.data),
  logout: () => api.post('/auth/logout').catch(() => null),
  me: () => api.get('/auth/me').then((r) => r.data),
  updateMe: (data) => api.put('/auth/me', data).then((r) => r.data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then((r) => r.data),
  resetPassword: (token, new_password) => api.post('/auth/reset-password', { token, new_password }).then((r) => r.data),
}

export const formsApi = {
  list: (params) => api.get('/forms', { params }).then((r) => r.data),
  get: (id) => api.get(`/forms/${id}`).then((r) => r.data),
  create: (data) => api.post('/forms/create', data).then((r) => r.data),
  update: (id, data) => api.put(`/forms/${id}/update`, data).then((r) => r.data),
  remove: (id) => api.delete(`/forms/${id}`).then((r) => r.data),
  publish: (id, note) => api.post(`/forms/${id}/publish`, { note }).then((r) => r.data),
  archive: (id) => api.post(`/forms/${id}/archive`).then((r) => r.data),
  unarchive: (id) => api.post(`/forms/${id}/unarchive`).then((r) => r.data),
  duplicate: (id) => api.post(`/forms/${id}/duplicate`).then((r) => r.data),
  versions: (id) => api.get(`/forms/${id}/versions`).then((r) => r.data),
  version: (id, v) => api.get(`/forms/${id}/versions/${v}`).then((r) => r.data),
  restoreVersion: (id, v) => api.post(`/forms/${id}/versions/${v}/restore`).then((r) => r.data),
  fromTemplate: (template_id, name) => api.post('/forms/create-from-template', { template_id, name }).then((r) => r.data),
  publicForm: (shareId) => api.get(`/public/forms/${shareId}`).then((r) => r.data),
}

export const responsesApi = {
  start: (formId, shareId) => api.post(`/forms/${formId}/responses/start`, { share_id: shareId }).then((r) => r.data),
  progress: (formId, rid, sid) => api.get(`/forms/${formId}/responses/${rid}`, session(sid)).then((r) => r.data),
  save: (formId, rid, sid, body) => api.post(`/forms/${formId}/responses/${rid}/answers`, body, session(sid)).then((r) => r.data),
  submit: (formId, rid, sid, answers) => api.post(`/forms/${formId}/responses/${rid}/submit`, { answers }, session(sid)).then((r) => r.data),
  upload: (formId, rid, sid, fieldKey, file, onProgress) => {
    const body = new FormData()
    body.append('field_key', fieldKey)
    body.append('file', file)
    return api.post(`/forms/${formId}/responses/${rid}/files`, body, {
      ...session(sid),
      onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
    }).then((r) => r.data)
  },
  removeFile: (formId, rid, sid, fileId) => api.delete(`/forms/${formId}/responses/${rid}/files/${fileId}`, session(sid)),
  // owner side
  list: (formId, params) => api.get(`/forms/${formId}/responses`, { params }).then((r) => r.data),
  get: (formId, rid) => api.get(`/forms/${formId}/responses/${rid}`).then((r) => r.data),
  remove: (formId, rid) => api.delete(`/forms/${formId}/responses/${rid}`).then((r) => r.data),
  stats: (formId) => api.get(`/forms/${formId}/responses/stats`).then((r) => r.data),
}

export const paymentsApi = {
  createOrder: (sid, body) => api.post('/payments/create-order', body, session(sid)).then((r) => r.data),
  verify: (sid, body) => api.post('/payments/verify', body, session(sid)).then((r) => r.data),
}

export const templatesApi = {
  list: () => api.get('/templates').then((r) => r.data),
  get: (id) => api.get(`/templates/${id}`).then((r) => r.data),
}

export const adminApi = {
  users: (params) => api.get('/admin/users', { params }).then((r) => r.data),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data).then((r) => r.data),
  forms: (params) => api.get('/admin/forms', { params }).then((r) => r.data),
  analytics: () => api.get('/admin/analytics').then((r) => r.data),
  activity: (limit = 100) => api.get('/admin/activity', { params: { limit } }).then((r) => r.data),
}
