#!/usr/bin/env node
'use strict';
/*
 * scripts/simulate-attack.js
 * Appends failed-login lines to a log file for the live demo.
 * Usage: node scripts/simulate-attack.js <logfile> [--ip 203.0.113.99] [--count 6] [--delay 300]
 */

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = { ip: '203.0.113.99', count: 6, delay: 300, logfile: null };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--') && !args.logfile) { args.logfile = a; }
    else if (a === '--ip' && argv[i + 1]) { args.ip = argv[i + 1]; i += 1; }
    else if (a === '--count' && argv[i + 1]) { args.count = Number(argv[i + 1]); i += 1; }
    else if (a === '--delay' && argv[i + 1]) { args.delay = Number(argv[i + 1]); i += 1; }
  }
  return args;
}

function fmtDate(d) {
  return d.toISOString();
}

const args = parseArgs(process.argv);
if (!args.logfile) {
  console.error('Usage: node scripts/simulate-attack.js <logfile> [--ip 203.0.113.99] [--count 6] [--delay 300]');
  process.exit(1);
}

const logPath = path.resolve(process.cwd(), args.logfile);
let sent = 0;
const interval = setInterval(() => {
  sent += 1;
  const line = `${fmtDate(new Date())} WARN [sshd] Failed password for invalid user admin from ${args.ip} port 52134 ssh2\n`;
  fs.appendFileSync(logPath, line);
  process.stdout.write(`appended line ${sent}/${args.count}\r`);
  if (sent >= args.count) {
    clearInterval(interval);
    console.log(`\nAppended ${sent} failed-login lines from ${args.ip} to ${logPath}`);
  }
}, args.delay);
