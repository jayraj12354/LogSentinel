'use strict';

const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const config = require('./env');

// One pool and one Prisma client for the whole process: each extra client holds its own connections,
// and hosted Postgres poolers (e.g. Supabase free tier) only allow a handful.
const pool = new Pool({ connectionString: config.databaseUrl });
const prisma = new PrismaClient();

async function checkDb() {
  let client;
  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    return true;
  } catch (e) {
    return false;
  } finally {
    if (client) client.release();
  }
}

module.exports = { pool, prisma, checkDb };
