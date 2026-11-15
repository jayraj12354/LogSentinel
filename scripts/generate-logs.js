#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const SEED = parseInt(process.argv[process.argv.indexOf('--seed') + 1] || '42', 10);
const OUT_DIR = process.argv[process.argv.indexOf('--out') + 1] || path.join(__dirname, '..', 'sample-logs');

function rng() {
  SEED;
  let x = SEED;
  return () => {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    return x / 0x7fffffff;
  };
}

const random = rng();
const now = new Date();
const end = new Date(now.getTime() - 5 * 60 * 1000);
const start = new Date(end.getTime() - 48 * 60 * 60 * 1000);

function randomTime() {
  return new Date(start.getTime() + random() * (end.getTime() - start.getTime())).toISOString();
}

function pick(arr) {
  return arr[Math.floor(random() * arr.length)];
}

function pad(n, w) {
  return String(n).padStart(w, '0');
}

function fmtTime(d) {
  const y = d.getUTCFullYear();
  const mo = pad(d.getUTCMonth() + 1, 2);
  const day = pad(d.getUTCDate(), 2);
  const h = pad(d.getUTCHours(), 2);
  const m = pad(d.getUTCMinutes(), 2);
  const s = pad(d.getUTCSeconds(), 2);
  const ms = pad(d.getUTCMilliseconds(), 3);
  return `${y}-${mo}-${day}T${h}:${m}:${s}.${ms}Z`;
}

function fmtApacheTime(d) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = days[d.getUTCDay()];
  const dd = pad(d.getUTCDate(), 2);
  const mon = months[d.getUTCMonth()];
  const y = d.getUTCFullYear();
  const h = pad(d.getUTCHours(), 2);
  const mi = pad(d.getUTCMinutes(), 2);
  const s = pad(d.getUTCSeconds(), 2);
  return `${dd}/${mon}/${y}:${h}:${mi}:${s} +0000`;
}

const ips = ['203.0.113.45', '198.51.100.23', '192.0.2.77', '198.51.100.45', '203.0.113.99', '192.0.2.10', '198.51.100.67'];
const users = ['admin', 'root', 'ubuntu', 'deploy', 'testuser', 'guest'];
const components = ['sshd', 'sudo', 'firewall', 'systemd', 'kernel'];
const methods = ['GET', 'POST', 'PUT', 'DELETE'];
const paths = ['/index.html', '/api/users', '/api/logs', '/login', '/api/auth', '/products', '/admin', '/api/alerts'];
const userAgents = ['Mozilla/5.0', 'curl/8.0', 'python-requests/2.28', 'nmap', 'wget/1.21'];
const statuses = [200, 200, 200, 200, 200, 201, 301, 302, 400, 401, 403, 404, 500];

fs.mkdirSync(OUT_DIR, { recursive: true });

// ---------- auth.log ----------
const authLines = [];
const baseTime = new Date(start);

// Normal auth sessions
for (let i = 0; i < 4500; i++) {
  const t = new Date(baseTime.getTime() + Math.floor(random() * 48 * 60 * 60 * 1000));
  const level = pick(['INFO', 'INFO', 'INFO', 'WARN']);
  const comp = pick(components);
  const ip = pick(ips);
  const user = pick(users);
  const msg = pick([
    `Accepted password for ${user} from ${ip} port ${Math.floor(random() * 60000) + 1024} ssh2`,
    `Accepted publickey for ${user} from ${ip} port ${Math.floor(random() * 60000) + 1024} ssh2`,
    `session opened for user ${user} by (uid=0)`,
    `pam_unix(sshd:session): session opened for user ${user} by (uid=0)`,
    `Connection closed by ${ip} port ${Math.floor(random() * 60000) + 1024} [preauth]`,
  ]);
  authLines.push(`${fmtTime(t)} ${level} [${comp}] ${msg}`);
}

// Burst 1: 40 failed logins from 203.0.113.45 within 3 minutes
let burstTime = new Date(baseTime.getTime() + Math.floor(random() * 24 * 60 * 60 * 1000));
for (let i = 0; i < 40; i++) {
  burstTime = new Date(burstTime.getTime() + Math.floor(random() * 3000) + 1000);
  authLines.push(`${fmtTime(burstTime)} WARN [sshd] Failed password for invalid user admin from 203.0.113.45 port ${Math.floor(random() * 60000) + 1024} ssh2`);
}

// Burst 2: another 40 failed logins from 203.0.113.45 within 3 minutes
burstTime = new Date(burstTime.getTime() + 10 * 60 * 1000);
for (let i = 0; i < 40; i++) {
  burstTime = new Date(burstTime.getTime() + Math.floor(random() * 3000) + 1000);
  authLines.push(`${fmtTime(burstTime)} WARN [sshd] Failed password for invalid user admin from 203.0.113.45 port ${Math.floor(random() * 60000) + 1024} ssh2`);
}

// 8 failures from 198.51.100.23
for (let i = 0; i < 8; i++) {
  const t = new Date(baseTime.getTime() + Math.floor(random() * 48 * 60 * 60 * 1000));
  authLines.push(`${fmtTime(t)} WARN [sshd] Failed password for invalid user root from 198.51.100.23 port ${Math.floor(random() * 60000) + 1024} ssh2`);
}

// Successful login from 203.0.113.45 within 10 minutes after burst failures
const successTime = new Date(burstTime.getTime() + Math.floor(random() * 10 * 60 * 1000));
authLines.push(`${fmtTime(successTime)} INFO [sshd] Accepted password for admin from 203.0.113.45 port ${Math.floor(random() * 60000) + 1024} ssh2`);

// 2 sudo failures
for (let i = 0; i < 2; i++) {
  const t = new Date(baseTime.getTime() + Math.floor(random() * 48 * 60 * 60 * 1000));
  authLines.push(`${fmtTime(t)} WARN [sudo] ${pick(users)} : not in the sudoers file ; TTY=pts/0 ; PWD=/home/${pick(users)} ; USER=root ; COMMAND=/bin/su`);
}

// Port scan burst from 203.0.113.45 (4+ lines in 60s)
let scanTime = new Date(baseTime.getTime() + Math.floor(random() * 48 * 60 * 60 * 1000));
for (let i = 0; i < 5; i++) {
  scanTime = new Date(scanTime.getTime() + Math.floor(random() * 10000) + 1000);
  authLines.push(`${fmtTime(scanTime)} WARN [firewall] port scan detected from 203.0.113.45`);
}

authLines.sort((a, b) => a.localeCompare(b));
fs.writeFileSync(path.join(OUT_DIR, 'auth.log'), authLines.join('\n') + '\n');

// ---------- access.log ----------
const accessLines = [];

// Normal traffic
for (let i = 0; i < 5800; i++) {
  const t = new Date(start.getTime() + Math.floor(random() * 48 * 60 * 60 * 1000));
  const ip = pick(ips);
  const method = pick(methods);
  const p = pick(paths);
  const status = pick(statuses);
  const bytes = Math.floor(random() * 5000) + 100;
  const ua = pick(userAgents);
  accessLines.push(`${ip} - - [${fmtApacheTime(t)}] "${method} ${p} HTTP/1.1" ${status} ${bytes} "-" "${ua}"`);
}

// SQL injection from 192.0.2.77
for (let i = 0; i < 3; i++) {
  const t = new Date(start.getTime() + Math.floor(random() * 48 * 60 * 60 * 1000));
  accessLines.push(`192.0.2.77 - - [${fmtApacheTime(t)}] "GET /products?id=1%20UNION%20SELECT%20x HTTP/1.1" 200 512 "-" "curl/8.0"`);
}

// Path traversal from 198.51.100.23
for (let i = 0; i < 4; i++) {
  const t = new Date(start.getTime() + Math.floor(random() * 48 * 60 * 60 * 1000));
  accessLines.push(`198.51.100.23 - - [${fmtApacheTime(t)}] "GET /..%2f..%2fetc/passwd HTTP/1.1" 403 128 "-" "curl/8.0"`);
}

// Cluster of 15 HTTP 500 responses within one minute
let errTime = new Date(start.getTime() + Math.floor(random() * 48 * 60 * 60 * 1000));
for (let i = 0; i < 15; i++) {
  errTime = new Date(errTime.getTime() + Math.floor(random() * 4000) + 1000);
  accessLines.push(`192.0.2.10 - - [${fmtApacheTime(errTime)}] "GET /api/users HTTP/1.1" 500 256 "-" "curl/8.0"`);
}

// nmap user-agent requests
for (let i = 0; i < 6; i++) {
  const t = new Date(start.getTime() + Math.floor(random() * 48 * 60 * 60 * 1000));
  accessLines.push(`${pick(ips)} - - [${fmtApacheTime(t)}] "GET /api/alerts HTTP/1.1" 200 256 "-" "nmap"`);
}

accessLines.sort((a, b) => a.localeCompare(b));
fs.writeFileSync(path.join(OUT_DIR, 'access.log'), accessLines.join('\n') + '\n');

// ---------- app.log ----------
const appLines = [];

// INFO/DEBUG noise
for (let i = 0; i < 2850; i++) {
  const t = new Date(start.getTime() + Math.floor(random() * 48 * 60 * 60 * 1000));
  const level = pick(['INFO', 'INFO', 'DEBUG', 'INFO', 'DEBUG']);
  appLines.push(`${fmtTime(t)} ${level} [app] Request processed successfully in ${Math.floor(random() * 200) + 10}ms`);
}

// Burst of 12 exceptions within 60s
let excTime = new Date(start.getTime() + Math.floor(random() * 48 * 60 * 60 * 1000));
for (let i = 0; i < 12; i++) {
  excTime = new Date(excTime.getTime() + Math.floor(random() * 5000) + 1000);
  appLines.push(`${fmtTime(excTime)} ERROR [app] Exception: NullPointerException at com.logsentinel.App.process(App.java:42)`);
}

// Service restarted
const restartTime = new Date(start.getTime() + Math.floor(random() * 48 * 60 * 60 * 1000));
appLines.push(`${fmtTime(restartTime)} INFO [app] Service restarted`);

// FATAL out of memory
const fatalTime = new Date(start.getTime() + Math.floor(random() * 48 * 60 * 60 * 1000));
appLines.push(`${fmtTime(fatalTime)} CRITICAL [app] FATAL out of memory`);

appLines.sort((a, b) => a.localeCompare(b));
fs.writeFileSync(path.join(OUT_DIR, 'app.log'), appLines.join('\n') + '\n');

console.log('Sample logs generated in', OUT_DIR);
console.log(`auth.log: ${authLines.length} lines`);
console.log(`access.log: ${accessLines.length} lines`);
console.log(`app.log: ${appLines.length} lines`);
