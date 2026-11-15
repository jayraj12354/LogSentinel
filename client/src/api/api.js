const BASE = 'http://localhost:4000/api/v1';

function request(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  const token = localStorage.getItem('ls_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${BASE}${path}`, { ...opts, headers })
    .catch(() => {
      throw new Error('Can’t reach the LogSentinel server on port 4000. Check that it’s running and that Postgres is up.');
    })
    .then(async (r) => {
      const body = r.headers.get('content-type')?.includes('application/json') ? await r.json() : await r.text();
      if (r.status === 401 && token) window.dispatchEvent(new Event('ls:unauthorized')); // expired session
      if (!r.ok) throw new Error(body && body.error ? body.error.message : `Request failed (HTTP ${r.status})`);
      return body;
    });
}

const send = (method) => (p, b) => request(p, { method, body: b === undefined ? undefined : JSON.stringify(b) });

export default {
  get: (p) => request(p),
  post: send('POST'),
  put: send('PUT'),
  patch: send('PATCH'),
  del: send('DELETE'),
};
