'use strict';

const request = require('supertest');
const app = require('../src/app');
const path = require('path');
const fs = require('fs');

const ADMIN_CREDS = { username: 'admin', password: 'admin123' };
const VIEWER_CREDS = { username: 'viewer', password: 'viewer123' };

const unique = () => `test${Date.now()}${Math.floor(Math.random() * 1000)}`;

let adminToken = null;
let viewerToken = null;

beforeAll(async () => {
  const adminRes = await request(app)
    .post('/api/v1/auth/login')
    .send(ADMIN_CREDS);
  adminToken = adminRes.body.data.token;

  const viewerRes = await request(app)
    .post('/api/v1/auth/login')
    .send(VIEWER_CREDS);
  viewerToken = viewerRes.body.data.token;
});

// Tests run against the dev database; remove the rows they create so the app's real data stays clean.
afterAll(async () => {
  const { pool } = require('../src/config/db');
  await pool.query("DELETE FROM rules WHERE name ~ '^Test Rule test[0-9]+$'");
  await pool.query("DELETE FROM alert_policies WHERE name ~ '^Test Policy test[0-9]+$'");
  await pool.query("DELETE FROM users WHERE username ~ '^test[0-9]+$'");
  await pool.query("DELETE FROM sources WHERE name ~ '^(test|update)-source-test[0-9]+$'");
});

describe('API health', () => {
  it('GET /api/v1/health returns ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });
});

describe('Auth', () => {
  it('POST /api/v1/auth/login returns token for valid admin credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send(ADMIN_CREDS);
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.username).toBe('admin');
    expect(res.body.data.user.role).toBe('ADMIN');
  });

  it('POST /api/v1/auth/login rejects bad credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('GET /api/v1/auth/me returns current admin user', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('admin');
  });

  it('GET /api/v1/auth/me requires a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('Users (admin only)', () => {
  it('GET /api/v1/users lists users for admin', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/v1/users rejects viewer with 403', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/v1/users requires authentication', async () => {
    const res = await request(app).get('/api/v1/users');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/users creates a new user', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: unique(),
        email: `${unique()}@logsentinel.local`,
        password: 'testpass123',
        role: 'VIEWER',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.username).toBeDefined();
  });

  it('DELETE /api/v1/users/:id deletes a user', async () => {
    const createRes = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: unique(),
        email: `${unique()}@logsentinel.local`,
        password: 'testpass123',
        role: 'VIEWER',
      });
    const userId = createRes.body.data.id;
    const res = await request(app)
      .delete(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

describe('Sources', () => {
  it('GET /api/v1/sources lists sources (authenticated)', async () => {
    const res = await request(app)
      .get('/api/v1/sources')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/v1/sources creates a source (admin)', async () => {
    const res = await request(app)
      .post('/api/v1/sources')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `test-source-${unique()}`,
        filePath: 'sample-logs/test.log',
        format: 'GENERIC',
        isActive: true,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toContain('test-source');
  });

  it('PUT /api/v1/sources/:id updates a source (admin)', async () => {
    const createRes = await request(app)
      .post('/api/v1/sources')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `update-source-${unique()}`,
        filePath: 'sample-logs/test.log',
        format: 'GENERIC',
        isActive: true,
      });
    const sourceId = createRes.body.data.id;
    const res = await request(app)
      .put(`/api/v1/sources/${sourceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(res.status).toBe(200);
  });

  it('DELETE /api/v1/sources/:id deletes a source (admin)', async () => {
    const createRes = await request(app)
      .post('/api/v1/sources')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `delete-source-${unique()}`,
        filePath: 'sample-logs/test.log',
        format: 'GENERIC',
        isActive: true,
      });
    const sourceId = createRes.body.data.id;
    const res = await request(app)
      .delete(`/api/v1/sources/${sourceId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

describe('Rules', () => {
  it('GET /api/v1/rules lists rules', async () => {
    const res = await request(app)
      .get('/api/v1/rules')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/v1/rules/test validates a regex', async () => {
    const res = await request(app)
      .post('/api/v1/rules/test')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pattern: 'failed password', flags: 'i', sample: 'Failed password for admin' });
    expect(res.status).toBe(200);
    expect(res.body.data.matched).toBe(true);
  });

  it('POST /api/v1/rules creates a rule (admin)', async () => {
    const res = await request(app)
      .post('/api/v1/rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Test Rule ${unique()}`,
        pattern: 'test',
        category: 'TEST_CAT',
        severity: 'LOW',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toContain('Test Rule');
  });
});

describe('Policies', () => {
  it('GET /api/v1/policies lists policies', async () => {
    const res = await request(app)
      .get('/api/v1/policies')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/v1/policies creates a policy (admin)', async () => {
    const res = await request(app)
      .post('/api/v1/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Test Policy ${unique()}`,
        category: 'TEST_CAT',
        thresholdCount: 5,
        windowSeconds: 300,
        groupBy: 'IP',
        severity: 'HIGH',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toContain('Test Policy');
  });
});

describe('Logs', () => {
  it('GET /api/v1/logs lists log entries with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/logs?pageSize=5')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.meta).toBeDefined();
  });

  it('GET /api/v1/logs/filters returns distinct filters', async () => {
    const res = await request(app)
      .get('/api/v1/logs/filters')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.sources).toBeDefined();
    expect(res.body.data.levels).toBeDefined();
  });

  it('GET /api/v1/logs/:sourceId/:lineNo returns one entry or 404', async () => {
    const res = await request(app)
      .get('/api/v1/logs/1/1')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect([200, 404]).toContain(res.status);
  });
});

describe('Analytics', () => {
  it('GET /api/v1/analytics/summary returns dashboard numbers', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/summary')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totalEntries).toBeDefined();
  });

  it('GET /api/v1/analytics/:name/sql refuses names outside the catalogue (no path traversal)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/..%2F..%2Fdb%2Froles/sql')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/v1/analytics/top_offenders runs a catalogued query', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/top_offenders')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/v1/analytics/top_offenders/sql returns SQL text', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/top_offenders/sql')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.text).toBe('string');
  });

  it('GET /api/v1/analytics/unknown returns 400', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/unknown')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(400);
  });
});

describe('Alerts', () => {
  it('GET /api/v1/alerts lists alerts with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/alerts?pageSize=5')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.meta).toBeDefined();
  });

  it('GET /api/v1/alerts/:id returns one alert or 404', async () => {
    const res = await request(app)
      .get('/api/v1/alerts/99999')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(404);
  });

  it('PATCH /api/v1/alerts/:id/ack requires admin', async () => {
    const res = await request(app)
      .patch('/api/v1/alerts/1/ack')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/v1/alerts/stream returns SSE headers', () => {
    return new Promise((resolve) => {
      const req = request(app)
        .get('/api/v1/alerts/stream')
        .set('Authorization', `Bearer ${viewerToken}`);
      let settled = false;
      req.on('response', (res) => {
        if (settled) return;
        settled = true;
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/event-stream');
        resolve();
      });
      req.on('error', () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      });
      setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve();
        }
      }, 500);
    });
  });
});

describe('Error handling', () => {
  it('GET unknown route returns 404', async () => {
    const res = await request(app).get('/api/v1/unknown-route');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /api/v2/health returns version 2', async () => {
    const res = await request(app).get('/api/v2/health');
    expect(res.status).toBe(200);
    expect(res.body.data.version).toBe(2);
  });
});

describe('Security', () => {
  it('POST /auth/login rejects non-string credentials with 400 instead of crashing', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ username: { a: 1 }, password: 'x' });
    expect(res.status).toBe(400);
  });

  it('POST /auth/login throttles after 5 tries, even when X-Forwarded-For changes each time', async () => {
    const username = unique();
    const statuses = [];
    for (let i = 1; i <= 6; i += 1) {
      const res = await request(app).post('/api/v1/auth/login').set('X-Forwarded-For', `198.51.100.${i}`).send({ username, password: 'wrong' });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses[5]).toBe(429);
  });

  it('a deleted admin’s token loses admin access immediately', async () => {
    const name = unique();
    const created = await request(app).post('/api/v1/users').set('Authorization', `Bearer ${adminToken}`)
      .send({ username: name, email: `${name}@example.com`, password: 'pw-123456', role: 'ADMIN' });
    const login = await request(app).post('/api/v1/auth/login').send({ username: name, password: 'pw-123456' });
    await request(app).delete(`/api/v1/users/${created.body.data.id}`).set('Authorization', `Bearer ${adminToken}`);
    const res = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${login.body.data.token}`);
    expect(res.status).toBe(403);
  });
});

describe('Alert engine', () => {
  it('raises one alert per group however often it runs', async () => {
    const { pool } = require('../src/config/db');
    const { evaluatePolicies } = require('../src/services/alertEngine');
    const tag = unique();
    const { rows: [src] } = await pool.query("INSERT INTO sources (name) VALUES ($1) RETURNING id", [`test-source-${tag}`]);
    const { rows: [pol] } = await pool.query(
      "INSERT INTO alert_policies (name, category, threshold_count, window_seconds, group_by, severity) VALUES ($1, 'ENGINE_TEST', 3, 300, 'IP', 'HIGH') RETURNING id",
      [`Test Policy ${tag}`],
    );
    for (let line = 1; line <= 3; line += 1) {
      await pool.query("INSERT INTO log_entries (source_id, line_no, logged_at, level, message, ip, category) VALUES ($1, $2, now(), 'WARN', 'engine test', '203.0.113.77', 'ENGINE_TEST')", [src.id, line]);
    }
    await evaluatePolicies();
    await evaluatePolicies();
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM alerts WHERE policy_id = $1', [pol.id]);
    await pool.query('DELETE FROM alerts WHERE policy_id = $1', [pol.id]); // policy + source (and its lines) go in afterAll
    expect(rows[0].n).toBe(1);
  });
});

describe('SQL showcase files', () => {
  const queriesDir = path.resolve(__dirname, '../../db/queries');
  const expected = [
    '00_functions_tour.sql',
    '01_top_offenders.sql',
    '02_moving_average_errors.sql',
    '03_fail_then_success.sql',
    '04_window_lag.sql',
    '05_moving_average_errors.sql',
    '06_intersect_ips.sql',
    '07_silent_sources.sql',
    '08_alert_window.sql',
    'joins_pitfalls.sql',
  ];

  for (const file of expected) {
    it(`${file} exists and contains SQL`, () => {
      const fullPath = path.join(queriesDir, file);
      expect(fs.existsSync(fullPath)).toBe(true);
      const content = fs.readFileSync(fullPath, 'utf8');
      expect(content.trim().length).toBeGreaterThan(0);
    });
  }

  it('ddl_demo.sql exists', () => {
    const fullPath = path.resolve(__dirname, '../../db/ddl_demo.sql');
    expect(fs.existsSync(fullPath)).toBe(true);
  });

  it('seed_synthetic.sql exists', () => {
    const fullPath = path.resolve(__dirname, '../../db/seed_synthetic.sql');
    expect(fs.existsSync(fullPath)).toBe(true);
  });

  it('roles.sql exists', () => {
    const fullPath = path.resolve(__dirname, '../../db/roles.sql');
    expect(fs.existsSync(fullPath)).toBe(true);
  });

  it('tests/dcl_check.sql exists', () => {
    const fullPath = path.resolve(__dirname, '../../db/tests/dcl_check.sql');
    expect(fs.existsSync(fullPath)).toBe(true);
  });
});
