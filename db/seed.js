'use strict';
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const viewerHash = await bcrypt.hash('viewer123', 10);
  await prisma.user.upsert({ where: { username: 'admin' }, update: {}, create: { username: 'admin', email: 'admin@logsentinel.local', passwordHash: adminHash, role: 'ADMIN' } });
  await prisma.user.upsert({ where: { username: 'viewer' }, update: {}, create: { username: 'viewer', email: 'viewer@logsentinel.local', passwordHash: viewerHash, role: 'VIEWER' } });

  const sources = [
    { name: 'auth-server', format: 'GENERIC', filePath: 'sample-logs/auth.log' },
    { name: 'web-access', format: 'ACCESS', filePath: 'sample-logs/access.log' },
    { name: 'app-server', format: 'GENERIC', filePath: 'sample-logs/app.log' },
    { name: 'synthetic-demo', format: 'GENERIC', filePath: null },
    { name: 'silent-demo', format: 'GENERIC', filePath: null },
  ];
  for (const s of sources) {
    await prisma.source.upsert({ where: { name: s.name }, update: {}, create: s });
  }

  const rules = [
    { name: 'Login failure', pattern: 'failed password\\|authentication failure\\|invalid user\\|login failed', category: 'AUTH_FAILURE', severity: 'MEDIUM' },
    { name: 'Login success', pattern: 'accepted password\\|accepted publickey\\|session opened\\|login successful', category: 'AUTH_SUCCESS', severity: 'LOW' },
  ];
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  for (const r of rules) {
    await prisma.rule.upsert({ where: { name: r.name }, update: {}, create: { ...r, createdBy: admin.id } });
  }

  const policies = [
    { name: 'Brute-force login', category: 'AUTH_FAILURE', thresholdCount: 5, windowSeconds: 300, groupBy: 'IP', severity: 'HIGH' },
  ];
  for (const p of policies) {
    await prisma.alertPolicy.upsert({ where: { name: p.name }, update: {}, create: p });
  }
  console.log('Seed complete');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
