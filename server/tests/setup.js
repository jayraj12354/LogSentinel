'use strict';

// Test environment setup for LogSentinel API tests.
// Sets required environment variables before any module is loaded.

process.env.NODE_ENV = 'test';
process.env.PORT = '4000';
process.env.DATABASE_URL = 'postgresql://logsentinel_app:app_pass@localhost:5432/logsentinel';
process.env.ANALYTICS_DATABASE_URL = 'postgresql://logsentinel_viewer:viewer_pass@localhost:5432/logsentinel';
process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
process.env.JWT_EXPIRES_IN = '8h';
process.env.BCRYPT_ROUNDS = '10';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.IMPORT_BATCH_SIZE = '500';
process.env.ALERT_EVAL_INTERVAL_MS = '5000';
process.env.WATCH_ON_START = 'false';
