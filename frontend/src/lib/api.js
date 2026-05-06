async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = localStorage.getItem('irnc_access_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const BASE = import.meta.env.VITE_API_URL || '';
  const res = await fetch(`${BASE}/api${path}`, { ...options, headers });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.code   = data.code;
    err.status = res.status;
    throw err;
  }
  return data;
}

export const auth = {
  register: (body)            => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login:    (email, password) => request('/auth/login',    { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout:   ()                => request('/auth/logout',   { method: 'POST' }),
  refresh:  (refresh_token)   => request('/auth/refresh',  { method: 'POST', body: JSON.stringify({ refresh_token }) }),
  verify:   ()                => request('/auth/verify',   { method: 'POST' }),
  me:       ()                => request('/auth/me'),
};

export const books = {
  list:      (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, v); });
    return request(`/books?${q}`);
  },
  getById:   (id)           => request(`/books/${id}`),
  getByNfc:  (nfcId)        => request(`/books?nfc=${encodeURIComponent(nfcId)}`),
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
  forBook:    (bookId)      => request(`/loans?book_id=${bookId}`),
  overdue:    ()            => request('/loans?status=overdue'),
};

export const users = {
  list:       (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, v); });
    return request(`/users?${q}`);
  },
  getLoans:   (userId)      => request(`/users/${userId}/loans`),
  update:     (id, body)    => request(`/users/${id}`,        { method: 'PATCH', body: JSON.stringify(body) }),
};

export const stats = {
  get: () => request('/stats'),
};
