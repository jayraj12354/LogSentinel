'use strict';

const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const logger = require('./utils/logger');

const app = express();

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

app.get('/api/v1/health', async (_req, res) => {
  let db = 'disconnected';
  try {
    const { checkDb } = require('./config/db');
    db = await checkDb().then(() => 'connected').catch(() => 'disconnected');
  } catch (e) { db = 'disconnected'; }
  res.json({ data: { status: 'ok', uptime: Math.round(process.uptime()), db } });
});

app.get('/api/v2/health', (_req, res) => {
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
app.use('/api/v1/alerts', require('./routes/v1/alerts'));
app.use('/api/v1/alerts', require('./routes/v1/alertsStream'));

app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.originalUrl}` } });
});

app.use((err, _req, _res, _next) => {
  logger.error('Unhandled error', err);
  const status = err.status || 500;
  _res.status(status).json({ error: { code: err.code || 'INTERNAL', message: err.message || 'Internal server error' } });
});

module.exports = app;
