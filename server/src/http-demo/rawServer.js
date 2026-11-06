'use strict';

// SYLLABUS: Backend Development – Node.js fundamentals: built-in http module
// A tiny raw HTTP server (no Express) to contrast with the Express app.
// Run: node src/http-demo/rawServer.js  (port 4001)

const http = require('http');

const PORT = 4001;

const server = http.createServer((req, res) => {
  // Manual routing and header handling (what Express abstracts away).
  if (req.method === 'GET' && req.url === '/health') {
    const body = JSON.stringify({ status: 'ok', via: 'node:http', uptime: process.uptime() });
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
    return;
  }

  const body = JSON.stringify({ error: 'Not found' });
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(body);
});

server.listen(PORT, () => {
  console.log(`[http-demo] Raw HTTP server listening on http://localhost:${PORT}`);
});
