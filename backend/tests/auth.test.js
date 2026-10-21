const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, setupTestDB, teardownTestDB } = require('./testHelper');

describe('Milestone 1 — Authentication & Security Test Suite', () => {
  before(async () => {
    await setupTestDB();
  });

  after(async () => {
    await teardownTestDB();
  });

  it('1.1 POST /api/auth/login with valid admin credentials should return 200 and JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@ostimteknik.edu.tr',
        password: 'Admin123!'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.token, 'Token must be returned');
    assert.strictEqual(res.body.user.email, 'admin@ostimteknik.edu.tr');
    assert.strictEqual(res.body.user.role, 'ADMIN');
  });

  it('1.2 POST /api/auth/login with wrong password should return 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@ostimteknik.edu.tr',
        password: 'WrongPassword123'
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /hatalı/i);
  });

  it('1.3 POST /api/auth/login with nonexistent email should return 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nobody@ostimteknik.edu.tr',
        password: 'Admin123!'
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  it('1.4 GET /api/auth/me with valid Bearer token should return user profile', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'ceng@ostimteknik.edu.tr',
        password: 'Ceng123!'
      });

    const token = loginRes.body.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.success, true);
    assert.strictEqual(meRes.body.user.email, 'ceng@ostimteknik.edu.tr');
    assert.strictEqual(meRes.body.user.role, 'DEPT_USER');
    assert.ok(meRes.body.user.departmentId, 'Department should be populated');
  });

  it('1.5 GET /api/auth/me without token should return 401 Unauthorized', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  it('1.6 GET /api/auth/me with malformed token should return 401 Unauthorized', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token-xyz');

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  it('1.7 POST /api/auth/change-password should update password securely', async () => {
    // 1. Login as seng user
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'seng@ostimteknik.edu.tr',
        password: 'Seng123!'
      });
    const token = loginRes.body.token;

    // 2. Change password
    const changeRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'Seng123!',
        newPassword: 'NewSengPassword2026!'
      });

    assert.strictEqual(changeRes.status, 200);
    assert.strictEqual(changeRes.body.success, true);

    // 3. Old password should fail
    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'seng@ostimteknik.edu.tr',
        password: 'Seng123!'
      });
    assert.strictEqual(oldLogin.status, 401);

    // 4. New password should succeed
    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'seng@ostimteknik.edu.tr',
        password: 'NewSengPassword2026!'
      });
    assert.strictEqual(newLogin.status, 200);
    assert.ok(newLogin.body.token);
  });

  it('1.8 Legacy POST /login compatibility route should work with real credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send({
        username: 'admin@ostimteknik.edu.tr',
        password: 'Admin123!'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.token);
  });
});
