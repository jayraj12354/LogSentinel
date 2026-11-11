'use strict';

const fs = require('fs');
const readline = require('readline');
const { EventEmitter } = require('events');

class LogWatcher extends EventEmitter {
  constructor(filePath) {
    super();
    this.filePath = filePath;
    this._stream = null;
    this._running = false;
    this._lineNo = 0;
  }

  async start() {
    if (this._running) return;
    this._running = true;
    const stat = fs.statSync(this.filePath);
    this._lineNo = 0;
    const stream = fs.createReadStream(this.filePath, { encoding: 'utf8', start: stat.size });
    this._stream = stream;
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    rl.on('line', (line) => {
      this._lineNo += 1;
      this.emit('line', { lineNo: this._lineNo, text: line });
    });
    rl.on('close', () => {
      this._running = false;
      this.emit('stopped');
    });
  }

  stop() {
    this._running = false;
    if (this._stream) {
      this._stream.destroy();
      this._stream = null;
    }
  }
}

module.exports = { LogWatcher };
