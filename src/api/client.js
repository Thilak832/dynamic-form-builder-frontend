import axios from 'axios'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TOKEN_KEY = 'tf_tokens'

export const tokenStore = {
  get() {
    try { return JSON.parse(localStorage.getItem(TOKEN_KEY)) || null } catch { return null }
  },
  set(tokens) { localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens)) },
  clear() { localStorage.removeItem(TOKEN_KEY) },
}

const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((config) => {
  const tokens = tokenStore.get()
  if (tokens?.access_token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${tokens.access_token}`
  }
  return config
})

let refreshing = null

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const tokens = tokenStore.get()
    const isAuthCall = original?.url?.startsWith('/auth/')
    if (error.response?.status === 401 && tokens?.refresh_token && !original._retry && !isAuthCall) {
      original._retry = true
      try {
        refreshing = refreshing || axios.post(`${API_URL}/auth/refresh-token`, { refresh_token: tokens.refresh_token })
        const { data } = await refreshing
        tokenStore.set({ access_token: data.access_token, refresh_token: data.refresh_token })
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        tokenStore.clear()
        window.dispatchEvent(new Event('auth:logout'))
      } finally {
        refreshing = null
      }
    }
    return Promise.reject(error)
  },
)

/** Human readable message from an API error. */
export function errorMessage(err, fallback = 'Something went wrong') {
  const detail = err?.response?.data?.detail
  if (!err?.response) return 'Cannot reach the server. Is the backend running?'
  if (typeof detail === 'string') return detail
  if (detail?.message) return detail.errors && Array.isArray(detail.errors) ? `${detail.message}: ${detail.errors.join('; ')}` : detail.message
  if (Array.isArray(detail)) return detail.map((d) => `${d.loc?.slice(-1)[0]}: ${d.msg}`).join('; ')
  return fallback
}

/** Field level errors returned by answer validation ({field_key: message}). */
export function fieldErrors(err) {
  const errors = err?.response?.data?.detail?.errors
  return errors && !Array.isArray(errors) ? errors : null
}

/** Download a file from an authenticated endpoint. */
export async function downloadFile(url, fallbackName) {
  const res = await api.get(url, { responseType: 'blob' })
  const disposition = res.headers['content-disposition'] || ''
  const match = disposition.match(/filename="?([^"]+)"?/)
  const href = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = href
  a.download = match?.[1] || fallbackName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}

export default api
