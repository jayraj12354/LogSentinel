'use strict';

const fs = require('fs');
const { EventEmitter } = require('events');

// Tails a file: emits { lineNo, text } for each complete line appended after start().
// Line numbers continue from the existing line count, so they match what a full import would assign.
class LogWatcher extends EventEmitter {
  constructor(filePath, { interval = 500 } = {}) {
    super();
    this.filePath = filePath;
    this.interval = interval;
    this._running = false;
    this._lineNo = 0;
    this._offset = 0;
    this._partial = '';
  }

  async start() {
    if (this._running) return;
    const { lineCount, size } = countLines(this.filePath);
    this._lineNo = lineCount;
    this._offset = size;
    this._running = true;
    fs.watchFile(this.filePath, { interval: this.interval }, (cur) => this._read(cur.size));
  }

  _read(size) {
    if (!this._running) return;
    if (size < this._offset) { this._offset = 0; this._partial = ''; } // truncated/rotated: read from the top again
    if (size === this._offset) return;
    const buf = Buffer.alloc(size - this._offset);
    const fd = fs.openSync(this.filePath, 'r');
    try { fs.readSync(fd, buf, 0, buf.length, this._offset); } finally { fs.closeSync(fd); }
    this._offset = size;
    const lines = (this._partial + buf.toString('utf8')).split('\n');
    this._partial = lines.pop(); // incomplete last line waits for its newline
    for (const text of lines) {
      this._lineNo += 1;
      this.emit('line', { lineNo: this._lineNo, text: text.replace(/\r$/, '') });
    }
  }

  stop() {
    if (!this._running) return;
    this._running = false;
    fs.unwatchFile(this.filePath);
    this.emit('stopped');
  }
}

// Same line numbering as readline in importService: a trailing partial line still counts.
function countLines(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(1 << 16);
  let size = 0;
  let newlines = 0;
  let last = 0x0a;
  try {
    let n;
    while ((n = fs.readSync(fd, buf, 0, buf.length, size)) > 0) {
      for (let i = 0; i < n; i += 1) if (buf[i] === 0x0a) newlines += 1;
      last = buf[n - 1];
      size += n;
    }
  } finally {
    fs.closeSync(fd);
  }
  return { lineCount: newlines + (last === 0x0a ? 0 : 1), size };
}

module.exports = { LogWatcher, countLines };
