'use strict';

// SYLLABUS: Backend Development – Node.js/Express: HTTP server entrypoint
// Starts the Express app listening on the configured port.
// Schedules the alert engine evaluation loop and attaches the DB alert listener.

const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');
const { evaluatePolicies } = require('./services/alertEngine');
const { attach: attachAlertListener } = require('./services/alertListener');

let mainWindow = null;

const server = app.listen(config.port, () => {
  logger.info(`LogSentinel API listening on http://localhost:${config.port}`);
});

// Schedule alert engine evaluation loop
const alertInterval = setInterval(() => {
  evaluatePolicies().catch((e) => logger.error('Alert engine evaluation failed', e));
}, config.alertEvalIntervalMs);

// Attach DB LISTEN/NOTIFY listener for real-time alert push
attachAlertListener(mainWindow).catch((e) => logger.error('Alert listener attach failed', e));

// Expose main window setter for Electron integration
function setMainWindow(win) {
  mainWindow = win;
}

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down (SIGINT)');
  clearInterval(alertInterval);
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  logger.info('Shutting down (SIGTERM)');
  clearInterval(alertInterval);
  server.close(() => process.exit(0));
});

module.exports = { setMainWindow };
