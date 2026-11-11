'use strict';

const { Pool } = require('pg');
const config = require('./config/env');

const pool = new Pool({ connectionString: config.databaseUrl });

async function checkDb() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    return true;
  } catch (e) {
    return false;
  } finally {
    client.release();
  }
}

module.exports = { pool, checkDb };
