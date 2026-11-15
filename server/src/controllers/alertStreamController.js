'use strict';

const { prisma } = require('../config/db');
const { alertEvents } = require('../services/alertListener');

// Pushes each alert created after the client connected, once, as soon as Postgres NOTIFYs it.
function sseStream(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(': connected\n\n');

  const onAlert = async ({ id }) => {
    const a = await prisma.alert.findUnique({ where: { id } }).catch(() => null);
    if (a) res.write(`id: ${a.id}\nevent: alert\ndata: ${JSON.stringify(a)}\n\n`);
  };
  alertEvents.on('alert', onAlert);
  req.on('close', () => alertEvents.off('alert', onAlert));
}

module.exports = { sseStream };
