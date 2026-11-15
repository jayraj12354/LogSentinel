#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function run(cmd, cwd = ROOT) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function ensureEnv() {
  const envExample = path.join(ROOT, '.env.example');
  const envFile = path.join(ROOT, '.env');
  if (!fs.existsSync(envFile) && fs.existsSync(envExample)) {
    fs.copyFileSync(envExample, envFile);
    console.log('Created .env from .env.example');
  }
}

function installDeps() {
  run('npm install', ROOT);
  run('npm install', path.join(ROOT, 'server'));
  run('npm install', path.join(ROOT, 'client'));
  run('npm install', path.join(ROOT, 'electron'));
}

function setupDatabase() {
  try {
    run('psql -U postgres -f db/00_create_database.sql', ROOT);
  } catch (e) {
    console.log('Database/role may already exist, skipping bootstrap:', e.message);
  }
  try {
    run('psql -U postgres -d logsentinel -f db/roles.sql', ROOT);
  } catch (e) {
    console.log('Roles may already exist, skipping:', e.message);
  }
}

function runMigrations() {
  run('npx prisma migrate deploy', path.join(ROOT, 'server'));
}

function seedDatabase() {
  run('node db/seed.js', ROOT);
}

function generateLogs() {
  run('node scripts/generate-logs.js', ROOT);
}

function buildClient() {
  run('npm run build', path.join(ROOT, 'client'));
}

function main() {
  console.log('=== LogSentinel Setup ===');
  ensureEnv();
  installDeps();
  setupDatabase();
  runMigrations();
  seedDatabase();
  generateLogs();
  buildClient();
  console.log('=== Setup complete ===');
}

main();
