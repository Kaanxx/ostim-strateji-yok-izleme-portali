const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, setupTestDB, teardownTestDB } = require('./testHelper');
const Department = require('../models/Department');
const Template = require('../models/Template');
const TableRecord = require('../models/TableRecord');
const User = require('../models/User');

describe('Milestone 1 — Granular RBAC & Department Scope Test Suite', () => {
  let adminToken;
  let cengToken;
  let dekanToken;
  let cengDept;
  let sengDept;
  let muhFakDept;
  let iibfDept;
  let isletmeDept;
  let cengUser;

  before(async () => {
    await setupTestDB();

    // 1. Fetch departments
    cengDept = await Department.findOne({ code: 'BILGISAYAR_MUH' });
    sengDept = await Department.findOne({ code: 'YAZILIM_MUH' });
    muhFakDept = await Department.findOne({ code: 'MUH_FAK' });
    iibfDept = await Department.findOne({ code: 'IIBF' });
    isletmeDept = await Department.findOne({ code: 'ISLETME' });

    // 2. Create test template (DERSLER)
    await Template.create({
      code: 'DERSLER',
      title: 'Dersler Şablonu',
      category: 'Eğitim',
      type: 'DYNAMIC',
      columns: [
        { key: 'ders_kodu', label: 'Ders Kodu', type: 'text', required: true },
        { key: 'ders_adi', label: 'Ders Adı', type: 'text', required: true }
      ]
    });

    // 3. Seed some records for CENG and SENG and ISLETME
    await TableRecord.create([
      {
        templateCode: 'DERSLER',
        departmentId: cengDept._id,
        period: '2025-2026',
        rowNumber: 1,
        data: { ders_kodu: 'CENG101', ders_adi: 'Intro to Programming' }
      },
      {
        templateCode: 'DERSLER',
        departmentId: sengDept._id,
        period: '2025-2026',
        rowNumber: 1,
        data: { ders_kodu: 'SENG101', ders_adi: 'Software Engineering Principles' }
      },
      {
        templateCode: 'DERSLER',
        departmentId: isletmeDept._id,
        period: '2025-2026',
        rowNumber: 1,
        data: { ders_kodu: 'BUS101', ders_adi: 'Management Basics' }
      }
    ]);

    // 4. Authenticate users
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@ostimteknik.edu.tr', password: 'Admin123!' });
    adminToken = adminLogin.body.token;

    const cengLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ceng@ostimteknik.edu.tr', password: 'Ceng123!' });
    cengToken = cengLogin.body.token;
    cengUser = cengLogin.body.user;

    const dekanLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dekan.muhendislik@ostimteknik.edu.tr', password: 'Dekan123!' });
    dekanToken = dekanLogin.body.token;
  });

  after(async () => {
    await teardownTestDB();
  });

  it('2.1 CENG user can view own department records (200 OK)', async () => {
    const res = await request(app)
      .get(`/api/records/DERSLER?departmentId=${cengDept._id}&period=2025-2026`)
      .set('Authorization', `Bearer ${cengToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.length >= 1);
    assert.strictEqual(res.body.data[0].data.ders_kodu, 'CENG101');
  });

  it('2.2 CENG user is BLOCKED from viewing unauthorized SENG records (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/records/DERSLER?departmentId=${sengDept._id}&period=2025-2026`)
      .set('Authorization', `Bearer ${cengToken}`);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /görüntüleme yetkiniz bulunmamaktadır/i);
  });

  it('2.3 CENG user is BLOCKED from inserting records for unauthorized SENG department (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/records/DERSLER')
      .set('Authorization', `Bearer ${cengToken}`)
      .send({
        departmentId: sengDept._id,
        period: '2025-2026',
        data: { ders_kodu: 'SENG201', ders_adi: 'Data Structures' }
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /veri girişi veya değişikliği yapma yetkiniz bulunmamaktadır/i);
  });

  it('2.4 Admin grants CENG user CUSTOM department scope including SENG via PUT /api/users/:id/permissions', async () => {
    const updateRes = await request(app)
      .put(`/api/users/${cengUser.id}/permissions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        departmentScope: {
          type: 'CUSTOM',
          departments: [sengDept._id]
        }
      });

    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.success, true);

    // Refresh CENG token by re-login
    const cengLogin2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ceng@ostimteknik.edu.tr', password: 'Ceng123!' });
    cengToken = cengLogin2.body.token;

    // Now CENG user can query SENG department records!
    const queryRes = await request(app)
      .get(`/api/records/DERSLER?departmentId=${sengDept._id}&period=2025-2026`)
      .set('Authorization', `Bearer ${cengToken}`);

    assert.strictEqual(queryRes.status, 200);
    assert.strictEqual(queryRes.body.success, true);
    assert.strictEqual(queryRes.body.data[0].data.ders_kodu, 'SENG101');

    // And CENG user remains blocked from ungranted departments like ISLETME
    const blockedRes = await request(app)
      .get(`/api/records/DERSLER?departmentId=${isletmeDept._id}&period=2025-2026`)
      .set('Authorization', `Bearer ${cengToken}`);

    assert.strictEqual(blockedRes.status, 403);
  });

  it('2.5 Hierarchical Scope: Dean (Mühendislik Fakültesi) inherits access to all engineering child departments', async () => {
    // 1. Dean queries CENG (child department) -> 200 OK
    const cengRes = await request(app)
      .get(`/api/records/DERSLER?departmentId=${cengDept._id}&period=2025-2026`)
      .set('Authorization', `Bearer ${dekanToken}`);

    assert.strictEqual(cengRes.status, 200);
    assert.strictEqual(cengRes.body.success, true);
    assert.ok(cengRes.body.data.length >= 1);

    // 2. Dean queries SENG (child department) -> 200 OK
    const sengRes = await request(app)
      .get(`/api/records/DERSLER?departmentId=${sengDept._id}&period=2025-2026`)
      .set('Authorization', `Bearer ${dekanToken}`);

    assert.strictEqual(sengRes.status, 200);
    assert.strictEqual(sengRes.body.success, true);
    assert.ok(sengRes.body.data.length >= 1);

    // 3. Dean attempts to query outside faculty (ISLETME under IIBF) -> 403 Forbidden
    const isletmeRes = await request(app)
      .get(`/api/records/DERSLER?departmentId=${isletmeDept._id}&period=2025-2026`)
      .set('Authorization', `Bearer ${dekanToken}`);

    assert.strictEqual(isletmeRes.status, 403);
  });

  it('2.6 Table Permissions Matrix: User without canCreate receives 403 on POST', async () => {
    // Dean has canView: true, canApprove: true, canCreate: false
    const res = await request(app)
      .post('/api/records/DERSLER')
      .set('Authorization', `Bearer ${dekanToken}`)
      .send({
        departmentId: cengDept._id,
        period: '2025-2026',
        data: { ders_kodu: 'CENG999', ders_adi: 'Unauthorized Test' }
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /canCreate/);
  });

  it('2.7 System Admin role has unconditional access across all tables and departments', async () => {
    // Admin queries CENG, SENG, and ISLETME
    const resCeng = await request(app)
      .get(`/api/records/DERSLER?departmentId=${cengDept._id}&period=2025-2026`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(resCeng.status, 200);

    const resIsletme = await request(app)
      .get(`/api/records/DERSLER?departmentId=${isletmeDept._id}&period=2025-2026`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(resIsletme.status, 200);
  });
});
