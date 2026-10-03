const TOKEN_KEY = 'jbp_token'

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
export const setToken = (t) => {
  try {
    t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable */
  }
}

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message)
    this.status = status
    this.errors = errors || {}
  }
}

async function request(method, url, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let res
  try {
    res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  } catch {
    throw new ApiError('Cannot reach the server. Please try again.', 0)
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.errors)
  return data
}

const qs = (params) => {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v !== '' && v != null && p.set(k, v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const api = {
  meta: () => request('GET', '/api/meta'),
  listJobs: (params) => request('GET', `/api/jobs${qs(params)}`),
  getJob: (id) => request('GET', `/api/jobs/${id}`),
  apply: (id, data) => request('POST', `/api/jobs/${id}/apply`, data),
  login: (data) => request('POST', '/api/admin/login', data),
  createJob: (data) => request('POST', '/api/jobs', data),
  applications: (id) => request('GET', `/api/jobs/${id}/applications`),
  setStatus: (id, status) => request('PATCH', `/api/jobs/${id}/status`, { status }),
}
