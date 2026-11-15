'use strict';

const request = require('supertest');
const app = require('../src/app');

describe('API health', () => {
  test('GET /api/v1/health returns ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  test('GET /api/v2/health returns version 2', async () => {
    const res = await request(app).get('/api/v2/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.version).toBe(2);
  });
});

describe('Authentication', () => {
  test('GET /api/v1/auth/me without token returns 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.statusCode).toBe(401);
  });

  test('POST /api/v1/auth/login with invalid credentials returns 401 or 5xx', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/v1/auth/login with missing body returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({});
    expect(res.statusCode).toBe(400);
  });
});

describe('Resources (unauthenticated)', () => {
  test('GET /api/v1/sources without token returns 401', async () => {
    const res = await request(app).get('/api/v1/sources');
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/v1/rules without token returns 401', async () => {
    const res = await request(app).get('/api/v1/rules');
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/v1/policies without token returns 401', async () => {
    const res = await request(app).get('/api/v1/policies');
    expect(res.statusCode).toBe(401);
  });
});

describe('404 handling', () => {
  test('GET unknown route returns 404', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.statusCode).toBe(404);
  });
});
