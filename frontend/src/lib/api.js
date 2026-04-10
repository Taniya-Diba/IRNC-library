const BASE = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('library_admin_token');
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}/api${path}`, { ...options, headers });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ── Auth ────────────────────────────────────────────────
export const auth = {
  login:  (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  verify: ()                => request('/auth/verify'),
};

// ── Books ───────────────────────────────────────────────
export const books = {
  list:      (params = {}) => request('/books?' + new URLSearchParams(params)),
  getById:   (id)          => request(`/books/${id}`),
  getByNfc:  (nfcId)       => request(`/books/nfc/${nfcId}`),
  create:    (body)        => request('/books',      { method: 'POST',   body: JSON.stringify(body) }),
  update:    (id, body)    => request(`/books/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove:    (id)          => request(`/books/${id}`, { method: 'DELETE' }),
};

// ── Loans ───────────────────────────────────────────────
export const loans = {
  list:         (params = {}) => request('/loans?' + new URLSearchParams(params)),
  overdue:      ()            => request('/loans/overdue'),
  forBook:      (bookId)      => request(`/loans/book/${bookId}`),
  checkout:     (body)        => request('/loans',              { method: 'POST',  body: JSON.stringify(body) }),
  returnBook:   (id)          => request(`/loans/${id}/return`, { method: 'PATCH' }),
};

// ── Borrowers ───────────────────────────────────────────
export const borrowers = {
  list:      ()   => request('/borrowers'),
  getLoans:  (id) => request(`/borrowers/${id}/loans`),
  remove:    (id) => request(`/borrowers/${id}`, { method: 'DELETE' }),
};

// ── Stats ───────────────────────────────────────────────
export const stats = {
  get: () => request('/stats'),
};
