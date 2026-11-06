'use strict';

// SYLLABUS: Backend Development – Node.js fundamentals: child processes & process info
// Prints process info and spawns a short child process.

const { spawn } = require('child_process');
const os = require('os');

function printProcessInfo() {
  console.log('process-demo: process information');
  console.log({
    pid: process.pid,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    uptimeSec: Math.round(process.uptime()),
    hostname: os.hostname(),
  });
}

function runChild() {
  return new Promise((resolve, reject) => {
    const cmd = process.platform === 'win32' ? 'cmd' : 'node';
    const args = process.platform === 'win32' ? ['/c', 'echo', 'hello-from-child'] : ['-e', "console.log('hello-from-child')"];

    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      console.log('child exited with code', code, 'output:', out.trim());
      resolve();
    });
  });
}

async function main() {
  printProcessInfo();
  await runChild();
}

main().catch((err) => {
  console.error('process-demo failed:', err);
  process.exit(1);
});
