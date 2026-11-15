'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { LogWatcher, countLines } = require('../src/services/LogWatcher');

test('countLines counts a trailing partial line like readline does', () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lw-')), 'a.log');
  fs.writeFileSync(f, 'a\nb\n');
  expect(countLines(f).lineCount).toBe(2);
  fs.writeFileSync(f, 'a\nb');
  expect(countLines(f).lineCount).toBe(2);
  fs.writeFileSync(f, '');
  expect(countLines(f).lineCount).toBe(0);
});

test('LogWatcher emits only appended lines, numbered after existing ones, waiting for full lines', async () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lw-')), 'b.log');
  fs.writeFileSync(f, 'old1\nold2\n');
  const w = new LogWatcher(f, { interval: 50 });
  const got = [];
  w.on('line', (l) => got.push(l));
  await w.start();
  fs.appendFileSync(f, 'new1\nnew');
  await new Promise((r) => setTimeout(r, 300));
  fs.appendFileSync(f, '2\n');
  await new Promise((r) => setTimeout(r, 300));
  w.stop();
  expect(got).toEqual([{ lineNo: 3, text: 'new1' }, { lineNo: 4, text: 'new2' }]);
});
