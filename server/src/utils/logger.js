'use strict';

// SYLLABUS: Backend Development – Node.js fundamentals: modules, console
// Simple logger wrapping console with levels. No external logging libraries.

const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function currentLevel() {
  const raw = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return LEVELS[raw] !== undefined ? LEVELS[raw] : LEVELS.info;
}

function shouldLog(level) {
  return LEVELS[level] >= currentLevel();
}

function format(level, args) {
  const ts = new Date().toISOString();
  return [`[${ts}] [${level.toUpperCase()}]`, ...args];
}

const logger = {
  debug: (...args) => {
    if (shouldLog('debug')) console.debug(...format('debug', args));
  },
  info: (...args) => {
    if (shouldLog('info')) console.info(...format('info', args));
  },
  warn: (...args) => {
    if (shouldLog('warn')) console.warn(...format('warn', args));
  },
  error: (...args) => {
    if (shouldLog('error')) console.error(...format('error', args));
  },
};

module.exports = logger;
