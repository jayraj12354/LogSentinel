'use strict';

// SYLLABUS: Backend Development – Node.js fundamentals: environment/config
// Loads dotenv, validates required variables, exits clearly if missing,
// and exports a frozen config object.

const path = require('path');
const dotenv = require('dotenv');

// Load .env from the repository root (two levels up from src/config).
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

const REQUIRED = ['DATABASE_URL', 'ANALYTICS_DATABASE_URL', 'JWT_SECRET'];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  // Clear, actionable message for students.
  console.error('[env] Missing required environment variables:');
  missing.forEach((key) => console.error(`  - ${key}`));
  console.error('[env] Copy .env.example to .env and fill in values.');
  process.exit(1);
}

const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL,
  analyticsDatabaseUrl: process.env.ANALYTICS_DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 10),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  importBatchSize: Number(process.env.IMPORT_BATCH_SIZE || 500),
  alertEvalIntervalMs: Number(process.env.ALERT_EVAL_INTERVAL_MS || 5000),
  watchOnStart: process.env.WATCH_ON_START === 'true',
});

module.exports = config;
