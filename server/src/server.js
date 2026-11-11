'use strict';

// SYLLABUS: Backend Development – Node.js/Express: HTTP server entrypoint
// Starts the Express app listening on the configured port.

const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');

const server = app.listen(config.port, () => {
  logger.info(`LogSentinel API listening on http://localhost:${config.port}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down (SIGINT)');
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  logger.info('Shutting down (SIGTERM)');
  server.close(() => process.exit(0));
});
