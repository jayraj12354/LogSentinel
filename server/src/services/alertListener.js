'use strict';

// SYLLABUS: Data Engineering – LISTEN / NOTIFY
// Holds one connection on LISTEN new_alert (the trg_notify_new_alert trigger fires it on every alert insert)
// and re-emits each payload { id, severity, title } as an 'alert' event for the SSE stream.

const { EventEmitter } = require('events');
const { pool } = require('../config/db');
const logger = require('../utils/logger');

const alertEvents = new EventEmitter().setMaxListeners(0); // one listener per open SSE stream

async function attach() {
  const client = await pool.connect();
  client.on('notification', (msg) => {
    try {
      alertEvents.emit('alert', JSON.parse(msg.payload));
    } catch (e) { /* ignore malformed alert payload */ }
  });
  // A dropped connection (DB restart, pooler hiccup) would silently stop all alerts, so reconnect.
  client.on('error', (e) => {
    logger.warn('[alertListener] connection lost, reconnecting:', e.message);
    client.release(true);
    setTimeout(start, 5000).unref();
  });
  try {
    await client.query('LISTEN new_alert');
  } catch (e) {
    client.release(true);
    throw e;
  }
}

function start() {
  attach().catch((e) => {
    logger.warn('[alertListener] LISTEN unavailable, retrying in 5s:', e.message);
    setTimeout(start, 5000).unref();
  });
}

module.exports = { start, alertEvents };
