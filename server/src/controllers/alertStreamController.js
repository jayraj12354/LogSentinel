'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function sseStream(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  let id = 0;
  const send = (alert) => { res.write(`id: ${++id}\nevent: alert\ndata: ${JSON.stringify(alert)}\n\n`); };
  res.write(': connected\n\n');

  const watcher = setInterval(async () => {
    const latest = await prisma.alert.findFirst({ orderBy: { triggeredAt: 'desc' }, take: 1 });
    if (latest) send(latest);
  }, 2000);

  req.on('close', () => clearInterval(watcher));
}

module.exports = { sseStream };
