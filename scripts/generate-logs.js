#!/usr/bin/env node
'use strict';
/*
 * scripts/generate-logs.js
 * Deterministic sample-log generator for LogSentinel.
 * Usage: node scripts/generate-logs.js [--seed 42] [--out sample-logs]
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DOC_IPS = ['203.0.113.45', '198.51.100.23', '192.0.2.77'];

function parseArgs(argv) {
  const args = { seed: 42, out: 'sample-logs' };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--seed' && argv[i + 1]) { args.seed = Number(argv[i + 1]); i += 1; }
    else if (a === '--out' && argv[i + 1]) { args.out = argv[i + 1]; i += 1; }
  }
  return args;
}

class RNG {
  constructor(seed) {
    this.s = seed >>> 0;
  }
  next() {
    this.s = (this.s * 1103515245 + 12345) >>> 0;
    return (this.s >>> 16) / 65536;
  }
  int(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  pick(arr) {
    return arr[this.int(0, arr.length - 1)];
  }
}

function fmtDate(d) {
  return d.toISOString();
}

function genAuthLog(rng, now, lines) {
  const out = [];
  const base = new Date(now.getTime() - 48 * 3600 * 1000);
  const normal = [
    'Accepted password for admin from 198.51.100.23 port 52134 ssh2',
    'Accepted publickey for deploy from 203.0.113.10 port 44122 ssh2',
    'Session opened for user root by (uid=0)',
    'pam_unix(sshd:session): session opened for user admin by (uid=0)',
    'sudo: admin : TTY=pts/0 ; PWD=/home/admin ; USER=root ; COMMAND=/usr/bin/apt update',
    'CRON: root command (run-parts /etc/cron.daily)',
  ];
  const failTmpl = 'Failed password for invalid user admin from {IP} port {PORT} ssh2';
  const sudoFail = 'sudo: admin : 3 incorrect password attempts ; TTY=pts/0 ; PWD=/home/admin ; USER=root ; COMMAND=/bin/su';
  const portScan = '[firewall] port scan detected from 203.0.113.45';

  // Two bursts of >=40 failures from 203.0.113.45 within 3 minutes each
  let t = new Date(base.getTime() + rng.int(0, 40 * 3600 * 1000));
  for (let b = 0; b < 2; b += 1) {
    for (let k = 0; k < 40; k += 1) {
      t = new Date(t.getTime() + rng.int(1000, 5000));
      out.push(`${fmtDate(t)} WARN [sshd] ${failTmpl.replace('{IP}', '203.0.113.45').replace('{PORT}', rng.int(49000, 60000))}`);
    }
    t = new Date(t.getTime() + rng.int(180000, 300000));
  }

  // 8 failures from 198.51.100.23
  for (let k = 0; k < 8; k += 1) {
    t = new Date(t.getTime() + rng.int(5000, 15000));
    out.push(`${fmtDate(t)} WARN [sshd] ${failTmpl.replace('{IP}', '198.51.100.23').replace('{PORT}', rng.int(49000, 60000))}`);
  }

  // One successful login from 203.0.113.45 within 10 minutes after failures
  t = new Date(t.getTime() + rng.int(60000, 600000));
  out.push(`${fmtDate(t)} INFO [sshd] Accepted password for admin from 203.0.113.45 port 52134 ssh2`);

  // 2 sudo failures
  for (let k = 0; k < 2; k += 1) {
    t = new Date(t.getTime() + rng.int(10000, 30000));
    out.push(`${fmtDate(t)} WARN [sudo] ${sudoFail}`);
  }

  // Port-scan burst >=4 lines from 203.0.113.45 within 60s
  for (let k = 0; k < 4; k += 1) {
    t = new Date(t.getTime() + rng.int(5000, 12000));
    out.push(`${fmtDate(t)} WARN [firewall] ${portScan}`);
  }

  // Normal noise to reach target line count
  while (out.length < lines) {
    t = new Date(t.getTime() + rng.int(1000, 30000));
    const line = rng.pick(normal).replace('{IP}', rng.pick(DOC_IPS));
    out.push(`${fmtDate(t)} INFO [sshd] ${line}`);
  }

  // Shuffle roughly by time (already roughly ordered); trim to target
  return out.slice(0, lines);
}

function genAccessLog(rng, now, lines) {
  const out = [];
  const base = new Date(now.getTime() - 48 * 3600 * 1000);
  const paths = ['/products', '/products?id=1', '/login', '/api/users', '/static/css/style.css', '/api/search?q=shoes'];
  const uas = ['Mozilla/5.0 (compatible; bot)', 'curl/8.0', 'Mozilla/5.0 (X11; Linux x86_64)', 'nmap/7.90'];
  let t = new Date(base.getTime());
  const statuses = [200, 200, 200, 200, 301, 404, 500];
  let ip = '203.0.113.45';

  // SQL injection requests from 192.0.2.77
  for (let k = 0; k < 3; k += 1) {
    t = new Date(t.getTime() + rng.int(5000, 20000));
    out.push(`${ip} - - [${fmtAccessDate(t)}] "GET /products?id=1%20UNION%20SELECT%20x HTTP/1.1" 404 512 "-" "curl/8.0"`);
  }
  ip = '192.0.2.77';

  // Path traversal from 198.51.100.23
  ip = '198.51.100.23';
  for (let k = 0; k < 4; k += 1) {
    t = new Date(t.getTime() + rng.int(5000, 20000));
    out.push(`${ip} - - [${fmtAccessDate(t)}] "GET /..%2f..%2fetc/passwd HTTP/1.1" 403 128 "-" "curl/8.0"`);
  }

  // Cluster of 15 HTTP 500 within one minute from 203.0.113.45
  ip = '203.0.113.45';
  for (let k = 0; k < 15; k += 1) {
    t = new Date(t.getTime() + rng.int(1000, 3000));
    out.push(`${ip} - - [${fmtAccessDate(t)}] "GET /api/report HTTP/1.1" 500 256 "-" "Mozilla/5.0"`);
  }

  // nmap user-agent
  t = new Date(t.getTime() + rng.int(10000, 30000));
  out.push(`203.0.113.99 - - [${fmtAccessDate(t)}] "GET / HTTP/1.1" 200 1234 "-" "nmap/7.90"`);

  while (out.length < lines) {
    t = new Date(t.getTime() + rng.int(500, 10000));
    const p = rng.pick(paths);
    const s = rng.pick(statuses);
    const ua = rng.pick(uas);
    const ipx = rng.pick(DOC_IPS);
    out.push(`${ipx} - - [${fmtAccessDate(t)}] "GET ${p} HTTP/1.1" ${s} ${rng.int(100, 5000)} "-" "${ua}"`);
  }
  return out.slice(0, lines);
}

function fmtAccessDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  const off = -d.getTimezoneOffset();
  const oh = Math.floor(Math.abs(off) / 60);
  const om = Math.abs(off) % 60;
  const sign = off >= 0 ? '+' : '-';
  return `${pad(d.getDate())}/${mon}/${d.getFullYear()}:${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${sign}${pad(oh)}${pad(om)}`;
}

function genAppLog(rng, now, lines) {
  const out = [];
  const base = new Date(now.getTime() - 48 * 3600 * 1000);
  const noise = [
    'INFO [app] Request processed in 120ms',
    'DEBUG [app] Cache hit for key user:42',
    'INFO [app] Health check passed',
    'DEBUG [app] DB connection pool size 10',
  ];
  let t = new Date(base.getTime());

  // Burst of 12 exceptions within 60s
  for (let k = 0; k < 12; k += 1) {
    t = new Date(t.getTime() + rng.int(1000, 5000));
    out.push(`${fmtDate(t)} ERROR [app] Exception: NullPointerException at com.app.Controller.handle(Request.java:45)`);
  }

  // One service restarted
  t = new Date(t.getTime() + rng.int(30000, 60000));
  out.push(`${fmtDate(t)} INFO [app] Service restarted`);

  // One FATAL out of memory
  t = new Date(t.getTime() + rng.int(30000, 60000));
  out.push(`${fmtDate(t)} CRITICAL [app] FATAL out of memory`);

  while (out.length < lines) {
    t = new Date(t.getTime() + rng.int(1000, 20000));
    out.push(`${fmtDate(t)} ${rng.pick(['INFO', 'DEBUG'])} [app] ${rng.pick(noise)}`);
  }
  return out.slice(0, lines);
}

const args = parseArgs(process.argv);
const rng = new RNG(args.seed);
const outDir = path.resolve(process.cwd(), args.out);
fs.mkdirSync(outDir, { recursive: true });

const now = new Date(Date.now() - 5 * 60 * 1000);

fs.writeFileSync(path.join(outDir, 'auth.log'), genAuthLog(rng, now, 5000).join('\n') + '\n');
fs.writeFileSync(path.join(outDir, 'access.log'), genAccessLog(rng, now, 6000).join('\n') + '\n');
fs.writeFileSync(path.join(outDir, 'app.log'), genAppLog(rng, now, 3000).join('\n') + '\n');

console.log('Generated sample logs in', outDir);
