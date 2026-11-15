#!/usr/bin/env node
'use strict';
/*
 * scripts/setup.js
 * One-command project setup: creates the Postgres role/database, runs Prisma migrations, and seeds data.
 * Usage: node scripts/setup.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

const root = path.resolve(process.cwd());
const psql = (sql) => run(`psql -d postgres -v ON_ERROR_STOP=1 -c "${sql.replace(/"/g, '\\"')}"`);

try {
  console.log('== LogSentinel setup ==');
  if (!fs.existsSync(path.join(root, '.env'))) fs.copyFileSync(path.join(root, '.env.example'), path.join(root, '.env'));
  console.log('1. Ensuring .env exists');

  try { psql("CREATE ROLE logsentinel_app LOGIN PASSWORD 'app_pass' CREATEDB;"); } catch (e) { /* role may exist */ }
  try { psql("CREATE DATABASE logsentinel OWNER logsentinel_app;"); } catch (e) { /* db may exist */ }
  console.log('2. Database role and database ready');

  run('npx prisma migrate deploy', { cwd: path.join(root, 'server') });
  console.log('3. Prisma migrations applied');

  run('psql -d logsentinel -v ON_ERROR_STOP=1 -f db/roles.sql', { cwd: root });
  console.log('3b. Read-only analytics role ready');

  const dbUrl = 'postgresql://logsentinel_app:app_pass@localhost:5432/logsentinel';
  run(`DATABASE_URL="${dbUrl}" NODE_PATH=server/node_modules node db/seed.js`, { cwd: root });
  console.log('4. Seed data loaded');

  run('node scripts/generate-logs.js --seed 42 --out sample-logs', { cwd: root });
  console.log('5. Sample logs generated');

  console.log('\nSetup complete. Start the API with:  cd server && npm start');
  console.log('Start the client with:  cd client && npm install && npm run dev');
} catch (e) {
  console.error('Setup failed:', e.message);
  process.exit(1);
}
