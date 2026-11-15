'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function sseStream(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(': connected\n\n');

  // Only push alerts created after the client connected, each once.
  let lastId = null;
  const watcher = setInterval(async () => {
    try {
      if (lastId === null) {
        const latest = await prisma.alert.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
        lastId = latest ? latest.id : 0;
        return;
      }
      const fresh = await prisma.alert.findMany({ where: { id: { gt: lastId } }, orderBy: { id: 'asc' } });
      for (const a of fresh) {
        res.write(`id: ${a.id}\nevent: alert\ndata: ${JSON.stringify(a)}\n\n`);
        lastId = a.id;
      }
    } catch (e) {
      // ignore query errors during polling
    }
  }, 2000);

  req.on('close', () => clearInterval(watcher));
}

module.exports = { sseStream };
