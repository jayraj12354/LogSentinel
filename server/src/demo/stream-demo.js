'use strict';

// SYLLABUS: Backend Development – Node.js fundamentals: streams
// Reads a file as a stream, counts lines without loading the whole file.

const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function countLines(filePath) {
  const input = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  let lines = 0;
  let bytes = 0;
  for await (const line of rl) {
    lines += 1;
    bytes += Buffer.byteLength(line) + 1;
  }
  return { filePath, lines, bytesApprox: bytes };
}

async function main() {
  const target = process.argv[2] || path.resolve(__dirname, '..', '..', 'package.json');
  console.log('stream-demo: counting lines in', target);
  const result = await countLines(target);
  console.log(result);
}

main().catch((err) => {
  console.error('stream-demo failed:', err);
  process.exit(1);
});
