'use strict';

// SYLLABUS: Backend Development – Node.js fundamentals: async patterns
// Shows callbacks, Promises, and async/await solving the same task.

const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, '..', '..', 'package.json');

function readCallback(file, cb) {
  fs.readFile(file, 'utf8', (err, data) => {
    if (err) return cb(err);
    cb(null, data.length);
  });
}

function readPromise(file) {
  return fs.promises.readFile(file, 'utf8').then((data) => data.length);
}

async function readAsync(file) {
  const data = await fs.promises.readFile(file, 'utf8');
  return data.length;
}

async function main() {
  console.log('async-demo: reading', target);

  await new Promise((resolve, reject) => {
    readCallback(target, (err, len) => {
      if (err) return reject(err);
      console.log('callback  -> bytes:', len);
      resolve();
    });
  });

  const pLen = await readPromise(target);
  console.log('promise   -> bytes:', pLen);

  const aLen = await readAsync(target);
  console.log('async/await -> bytes:', aLen);

  console.log('All three styles produced the same result.');
}

main().catch((err) => {
  console.error('async-demo failed:', err);
  process.exit(1);
});
