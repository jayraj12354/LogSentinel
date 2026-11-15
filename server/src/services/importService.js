'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { parseLine } = require('./logParser');
const { compileRules, classify } = require('./classifier');
const config = require('../config/env');
const { pool, prisma } = require('../config/db');

// Relative paths (e.g. seeded 'sample-logs/auth.log') resolve against the repo root / app Resources dir, not process.cwd().
const ROOT = path.resolve(__dirname, '..', '..', '..');

function resolveLogPath(p) {
  return p ? path.resolve(ROOT, p) : null;
}

async function importFile(sourceId, filePath, batchSize = config.importBatchSize) {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) throw Object.assign(new Error('source not found'), { status: 404, code: 'NOT_FOUND' });
  const file = resolveLogPath(filePath || source.filePath);
  if (!file || !fs.existsSync(file)) throw Object.assign(new Error(`log file not found: ${file || '(none)'}`), { status: 400, code: 'VALIDATION_ERROR' });
  const batch = await prisma.importBatch.create({
    data: { sourceId, fileName: path.basename(file), status: 'RUNNING' },
  });
  let linesTotal = 0;
  let linesOk = 0;
  let linesFailed = 0;

  const rules = await prisma.rule.findMany({ where: { isActive: true } });
  const compiled = compileRules(rules);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const stream = fs.createReadStream(file, { encoding: 'utf8' });
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
      // re-importing a file skips lines already stored instead of failing on the (source_id, line_no) key
      const r = await client.query(`INSERT INTO log_entries (source_id, line_no, logged_at, level, message, ip, category, rule_id, raw, batch_id) VALUES ${chunks.join(',')} ON CONFLICT DO NOTHING`, params);
      linesOk += r.rowCount;
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
      if (values.length >= batchSize) await flush();
    }
    await flush();
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => null);
    await prisma.importBatch.update({ where: { id: batch.id }, data: { status: 'FAILED', linesTotal, linesOk: 0, linesFailed: linesTotal, finishedAt: new Date() } }).catch(() => null);
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

module.exports = { importFile, resolveLogPath };
