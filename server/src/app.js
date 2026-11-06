'use strict';

// SYLLABUS: Backend Development – Express: app setup, middleware, routing
// Creates and configures the Express application (no listen here).

const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const logger = require('./utils/logger');

const app = express();

// Basic middleware
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '1mb' }));

// Simple request log for visibility during development
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// Health check (contract: GET /api/v1/health is public; minimal in Part 1)
app.get('/api/v1/health', (req, res) => {
  res.json({
    data: {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      db: 'unknown', // DB connectivity added in later parts
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
});

// Central error handler (never throws to client with stack in production)
app.use((err, req, res, next) => {
  logger.error('Unhandled error', err);
  const status = err.status || 500;
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL',
      message: err.message || 'Internal server error',
    },
  });
});

module.exports = app;
