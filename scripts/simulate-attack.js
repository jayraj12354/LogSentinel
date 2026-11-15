#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const logfile = process.argv[2];
if (!logfile) {
  console.error('Usage: node scripts/simulate-attack.js <logfile> [--ip 203.0.113.99] [--count 6] [--delay 300]');
  process.exit(1);
}

const ip = process.argv[process.argv.indexOf('--ip') + 1] || '203.0.113.99';
const count = parseInt(process.argv[process.argv.indexOf('--count') + 1] || '6', 10);
const delay = parseInt(process.argv[process.argv.indexOf('--delay') + 1] || '300', 10);

function fmtTime() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  const ms = String(d.getUTCMilliseconds()).padStart(3, '0');
  return `${y}-${mo}-${day}T${h}:${m}:${s}.${ms}Z`;
}

let sent = 0;
function sendNext() {
  if (sent >= count) {
    console.log(`Appended ${count} failed-login lines from ${ip} to ${logfile}`);
    process.exit(0);
  }
  const line = `${fmtTime()} WARN [sshd] Failed password for invalid user admin from ${ip} port ${Math.floor(Math.random() * 60000) + 1024} ssh2`;
  fs.appendFileSync(logfile, line + '\n');
  sent++;
  setTimeout(sendNext, delay);
}

sendNext();
