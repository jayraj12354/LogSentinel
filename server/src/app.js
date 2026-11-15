'use strict';

const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const logger = require('./utils/logger');
const { checkDb } = require('./config/db');
const catchErrors = require('./middleware/catchErrors');

const app = express();
// On Render (which sets RENDER=true) requests pass two proxies, Cloudflare's edge then Render's load balancer, so the
// client IP is the second-to-last X-Forwarded-For entry. With 1, req.ip was the edge IP, which changes per request and
// made the login throttle never trip. Elsewhere there is no proxy: trusting the header would let anyone fake their IP.
if (process.env.RENDER) app.set('trust proxy', 2);

// 'null' is the Origin Electron sends for pages loaded from file://
app.use(cors({ origin: [config.clientOrigin, 'null'] }));
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

app.get('/api/v1/health', catchErrors(async (req, res) => {
  const db = await checkDb();
  res.json({ data: { status: 'ok', uptime: Math.round(process.uptime()), db: db ? 'connected' : 'disconnected' } });
}));

app.get('/api/v2/health', (req, res) => {
  res.json({ data: { version: 2 } });
});

app.use('/api/v1/auth', require('./routes/v1/auth'));
app.use('/api/v1/users', require('./routes/v1/users'));
app.use('/api/v1/sources', require('./routes/v1/sources'));
app.use('/api/v1/sources', require('./routes/v1/import'));
app.use('/api/v1/sources', require('./routes/v1/watch'));
app.use('/api/v1/rules', require('./routes/v1/rules'));
app.use('/api/v1/policies', require('./routes/v1/policies'));
app.use('/api/v1/logs', require('./routes/v1/logs'));
app.use('/api/v1/analytics', require('./routes/v1/analytics'));
app.use('/api/v1/alerts', require('./routes/v1/alertsStream'));
app.use('/api/v1/alerts', require('./routes/v1/alerts'));

app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.originalUrl}` } });
});

app.use((err, _req, _res, _next) => {
  // Prisma: unique violation, missing record, foreign-key violation -> client errors with readable messages.
  const PRISMA = { P2002: [409, 'CONFLICT', `a record with that ${(err.meta && err.meta.target) || 'value'} already exists`], P2025: [404, 'NOT_FOUND', 'record not found'], P2003: [409, 'CONFLICT', 'record is still in use'] };
  if (PRISMA[err.code]) {
    const [status, code, message] = PRISMA[err.code];
    return _res.status(status).json({ error: { code, message } });
  }
  logger.error('Unhandled error', err);
  const status = err.status || 500;
  _res.status(status).json({ error: { code: err.code || 'INTERNAL', message: err.message || 'Internal server error' } });
});

module.exports = app;
