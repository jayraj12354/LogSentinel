'use strict';

const { Pool } = require('pg');
const { parseLine } = require('./logParser');
const { compileRules, classify } = require('./classifier');
const { PrismaClient } = require('@prisma/client');
const config = require('../config/env');

const pool = new Pool({ connectionString: config.databaseUrl });
const prisma = new PrismaClient();

async function importFile(sourceId, filePath, batchSize = config.importBatchSize) {
  const batch = await prisma.importBatch.create({
    data: { sourceId, fileName: filePath.split('/').pop(), status: 'RUNNING' },
  });
  let linesTotal = 0;
  let linesOk = 0;
  let linesFailed = 0;

  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  const rules = await prisma.rule.findMany({ where: { isActive: true } });
  const compiled = compileRules(rules);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const fs = require('fs');
    const readline = require('readline');
    const stream = fs.createReadStream(source.filePath || filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    let lineNo = 0;
    const values = [];
    const flush = async () => {
      if (values.length === 0) return;
      const params = [];
      const chunks = [];
      let idx = 1;
      for (const v of values) {
        chunks.push(`($${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++})`);
        params.push(v.sourceId, v.lineNo, v.loggedAt, v.level, v.message, v.ip, v.category, v.ruleId, JSON.stringify(v.raw), batch.id);
      }
      await client.query(`INSERT INTO log_entries (source_id, line_no, logged_at, level, message, ip, category, rule_id, raw, batch_id) VALUES ${chunks.join(',')}`, params);
      values.length = 0;
    };
    for await (const line of rl) {
      lineNo += 1;
      linesTotal += 1;
      const parsed = parseLine(line, source.format);
      if (!parsed) {
        linesFailed += 1;
        continue;
      }
      const classification = classify(parsed.message, compiled);
      values.push({
        sourceId,
        lineNo,
        loggedAt: parsed.loggedAt,
        level: parsed.level,
        message: parsed.message,
        ip: parsed.ip,
        category: classification.category,
        ruleId: classification.ruleId,
        raw: parsed.raw,
      });
      if (values.length >= batchSize) {
        await flush();
        linesOk += values.length;
      }
    }
    await flush();
    linesOk += values.length;
    await client.query('COMMIT');
  } catch (e) {
    try { await client.query('ROLLBACK').catch(() => null); } catch (_) { throw e; }
    linesFailed = linesTotal;
    throw e;
  } finally {
    client.release();
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { status: 'COMPLETED', linesTotal, linesOk, linesFailed, finishedAt: new Date() },
  });
  return { batchId: batch.id, linesTotal, linesOk, linesFailed };
}

module.exports = { importFile };
