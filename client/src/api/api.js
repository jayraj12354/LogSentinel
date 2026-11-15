// Set VITE_API_URL at build time for hosted deploys (e.g. https://logsentinel-api.onrender.com); the desktop app uses the local server.
const ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, ''); // a trailing slash would make every path '//api/v1/…' and 404
const BASE = `${ORIGIN}/api/v1`;

function request(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  const token = localStorage.getItem('ls_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${BASE}${path}`, { ...opts, headers })
    .catch(() => {
      throw new Error(`Can’t reach the LogSentinel server at ${ORIGIN}. Check that it’s running and that its database is up.`);
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
