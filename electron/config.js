'use strict';

// SYLLABUS: Interactive System Development (Electron) – App configuration
// Central place for Electron runtime flags and URLs.

const path = require('path');

const PORT = Number(process.env.PORT || 4000);
const VITE_PORT = Number(process.env.VITE_PORT || 5173);

const config = {
  isDev: !process.env.npm_package_version ? true : !require('electron').app?.isPackaged,
  port: PORT,
  serverUrl: process.env.LS_SERVER_URL || `http://localhost:${PORT}`,
  clientDevUrl: process.env.LS_CLIENT_URL || `http://localhost:${VITE_PORT}`,
  spawnServer: process.env.LS_SPAWN_SERVER === '1',
  showPlaceholder: process.env.LS_PLACEHOLDER === '1',
  placeholderPath: path.join(__dirname, 'placeholder', 'index.html'),
};

module.exports = config;
