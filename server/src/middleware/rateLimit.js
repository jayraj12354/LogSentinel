'use strict';

const attempts = {};
const MAX = 5;
const WINDOW_MS = 60000;

function loginThrottle(req, res, next) {
  const key = (req.ip || req.connection.remoteAddress || 'unknown') + ':' + (req.body && req.body.username || '');
  const now = Date.now();
  const entry = attempts[key] || { count: 0, reset: now + WINDOW_MS };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + WINDOW_MS;
  }
  entry.count += 1;
  attempts[key] = entry;
  if (entry.count > MAX) {
    return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'too many login attempts' } });
  }
  next();
}

module.exports = { loginThrottle };
