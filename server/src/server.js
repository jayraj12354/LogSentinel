'use strict';

const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');
const { attach: attachListener } = require('./services/alertListener');
const { start: startAlertEngine } = require('./services/alertEngine');

const server = app.listen(config.port, () => {
  logger.info(`LogSentinel API listening on http://localhost:${config.port}`);
  attachListener().catch((e) => logger.warn('[alertListener] LISTEN unavailable:', e.message));
  startAlertEngine(config.alertEvalIntervalMs || 5000);
});

server.on('error', (e) => logger.error(`[server] cannot listen on port ${config.port}: ${e.message}`));

// Only own process signals when run standalone. Inside the desktop app, Electron handles quitting;
// closing the listener here left the window running with no API (long-lived SSE connections never drain).
if (require.main === module) {
  const shutdown = (sig) => {
    logger.info(`Shutting down (${sig})`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref(); // don't wait forever on open SSE streams
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = server;
