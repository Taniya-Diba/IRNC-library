// Single in-flight refresh promise — all concurrent 401s wait on the same call
let refreshPromise = null;

async function request(path, options = {}, skipRefresh = false) {
  const isFormData = options.body instanceof FormData;
  const headers = isFormData
    ? { ...options.headers }
    : { 'Content-Type': 'application/json', ...options.headers };
  const token = localStorage.getItem('irnc_access_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const BASE = import.meta.env.VITE_API_URL || '';
  const res = await fetch(`${BASE}/api${path}`, { ...options, headers });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Silent refresh: on TOKEN_EXPIRED, refresh once and retry the original request
    if (res.status === 401 && data.code === 'TOKEN_EXPIRED' && !skipRefresh) {
      const refreshToken = localStorage.getItem('irnc_refresh_token');
      if (refreshToken) {
        if (!refreshPromise) {
          refreshPromise = fetch(`${BASE}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          })
            .then(r => r.json())
            .then(d => {
              if (!d.access_token) throw new Error('refresh_failed');
              localStorage.setItem('irnc_access_token', d.access_token);
              if (d.refresh_token) localStorage.setItem('irnc_refresh_token', d.refresh_token);
            })
            .finally(() => { refreshPromise = null; });
        }

        try {
          await refreshPromise;
          return request(path, options, true); // retry with new token
        } catch {
          localStorage.removeItem('irnc_access_token');
          localStorage.removeItem('irnc_refresh_token');
          localStorage.removeItem('irnc_user');
          window.dispatchEvent(new Event('auth:expired'));
        }
      }
    }

    const err = new Error(data.error || `Request failed (${res.status})`);
    err.code   = data.code;
    err.status = res.status;
    throw err;
  }
  return data;
}

export const auth = {
  register:      (body)                     => request('/auth/register',       { method: 'POST', body: JSON.stringify(body) }),
  login:         (email, password)          => request('/auth/login',          { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout:        ()                         => request('/auth/logout',         { method: 'POST' }),
  refresh:       (refresh_token)            => request('/auth/refresh',        { method: 'POST', body: JSON.stringify({ refresh_token }) }),
  verify:        ()                         => request('/auth/verify',         { method: 'POST' }),
  me:            ()                         => request('/auth/me'),
  forgotPassword:(email)                    => request('/auth/forgot-password',{ method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (access_token, new_password) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ access_token, new_password }) }),
};

export const books = {
  list:      (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, v); });
    return request(`/books?${q}`);
  },
  getById:   (id)           => request(`/books/${id}`),
  getByNfc:  (nfcId)        => request(`/books/nfc/${encodeURIComponent(nfcId)}`),
  create:    (body)         => request('/books',       { method: 'POST',   body: JSON.stringify(body) }),
  update:    (id, body)     => request(`/books/${id}`, { method: 'PATCH',  body: JSON.stringify(body) }),
  remove:    (id)           => request(`/books/${id}`, { method: 'DELETE' }),
  lock:      (id)           => request(`/books/${id}/lock`,   { method: 'PATCH' }),
  unlock:    (id)           => request(`/books/${id}/unlock`, { method: 'PATCH' }),
  uploadCover:    (id, file) => {
    const fd = new FormData(); fd.append('file', file);
    return request(`/books/${id}/cover`,      { method: 'POST', body: fd, headers: {} });
  },
  uploadBackCover:(id, file) => {
    const fd = new FormData(); fd.append('file', file);
    return request(`/books/${id}/back-cover`, { method: 'POST', body: fd, headers: {} });
  },
  uploadPdf:      (id, file) => {
    const fd = new FormData(); fd.append('file', file);
    return request(`/books/${id}/pdf`,        { method: 'POST', body: fd, headers: {} });
  },
};

export const loans = {
  list:       (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, v); });
    return request(`/loans?${q}`);
  },
  checkout:   (body)        => request('/loans',              { method: 'POST',  body: JSON.stringify(body) }),
  returnBook: (id)          => request(`/loans/${id}/return`, { method: 'PATCH' }),
  forBook:    (bookId)      => request(`/loans/book/${bookId}`),
  overdue:    ()            => request('/loans?status=overdue'),
};

export const users = {
  list:       (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, v); });
    return request(`/users?${q}`);
  },
  getLoans:   (userId)      => request(`/users/${userId}/loans`),
  update:     (id, body)    => request(`/users/${id}`,            { method: 'PATCH', body: JSON.stringify(body) }),
  activate:   (id)          => request(`/users/${id}/activate`,   { method: 'PATCH' }),
  deactivate: (id)          => request(`/users/${id}/deactivate`, { method: 'PATCH' }),
};

export const stats = {
  get: () => request('/stats'),
};
