'use strict';

const { Pool } = require('pg');
const config = require('../config/env');

const pool = new Pool({ connectionString: config.databaseUrl });

async function attach(mainWindow) {
  const client = await pool.connect();
  await client.query('LISTEN new_alert');
  client.on('notification', (msg) => {
    try {
      const alert = JSON.parse(msg.payload);
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('alert:new', alert);
    } catch (e) { /* ignore malformed alert payload */ }
  });
}

module.exports = { attach };
