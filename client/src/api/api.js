const BASE = 'http://localhost:4000/api/v1';

function request(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  const token = localStorage.getItem('ls_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${BASE}${path}`, { ...opts, headers }).then(async (r) => {
    const body = r.headers.get('content-type')?.includes('application/json') ? await r.json() : await r.text();
    if (!r.ok) throw new Error(body && body.error ? body.error.message : `HTTP ${r.status}`);
    return body;
  });
}

export default {
  get: (p) => request(p),
  post: (p, b) => request(p, { method: 'POST', body: JSON.stringify(b) }),
  patch: (p, b) => request(p, { method: 'PATCH', body: JSON.stringify(b) }),
};
