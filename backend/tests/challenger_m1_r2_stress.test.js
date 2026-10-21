const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');

const { app, setupTestDB, teardownTestDB } = require('./testHelper');
const Department = require('../models/Department');
const Template = require('../models/Template');
const TableRecord = require('../models/TableRecord');
const User = require('../models/User');
const WorkflowState = require('../models/WorkflowState');

describe('Challenger M1-R2 Adversarial Stress Tests: IDOR & Single-Record Edge Cases', () => {
  let cengToken;
  let adminToken;
  let cengDept;
  let sengDept;
  let derslerTemplate;
  let projelerTemplate;

  before(async () => {
    await setupTestDB();

    cengDept = await Department.findOne({ code: 'BILGISAYAR_MUH' });
    sengDept = await Department.findOne({ code: 'YAZILIM_MUH' });

    derslerTemplate = await Template.create({
      code: 'DERSLER',
      title: 'Dersler Şablonu',
      category: 'EĞİTİM VE ÖĞRETİM',
      type: 'DYNAMIC',
      columns: [
        { key: 'ders_kodu', label: 'Ders Kodu', type: 'text', required: true },
        { key: 'ders_adi', label: 'Ders Adı', type: 'text', required: true }
      ]
    });

    projelerTemplate = await Template.create({
      code: 'PROJELER',
      title: 'Projeler Şablonu',
      category: 'ARAŞTIRMA',
      type: 'DYNAMIC',
      columns: [
        { key: 'proje_kodu', label: 'Proje Kodu', type: 'text', required: true },
        { key: 'proje_adi', label: 'Proje Adı', type: 'text', required: true }
      ]
    });

    // Login ceng user
    const cengLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ceng@ostimteknik.edu.tr', password: 'Ceng123!' });
    cengToken = cengLogin.body.token;
    assert.ok(cengToken, 'cengToken must be acquired');

    // Login admin user
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@ostimteknik.edu.tr', password: 'Admin123!' });
    adminToken = adminLogin.body.token;
    assert.ok(adminToken, 'adminToken must be acquired');
  });

  after(async () => {
    await teardownTestDB();
  });

  it('Stress 1: Empty-body PUT on foreign department record returns 403 Forbidden (No 500 crash)', async () => {
    const sengRec = await TableRecord.create({
      templateCode: 'DERSLER',
      departmentId: sengDept._id,
      period: '2025-2026',
      rowNumber: 1,
      data: { ders_kodu: 'SENG101', ders_adi: 'Introduction to Software Engineering' }
    });

    // PUT with completely empty body and no query params
    const res = await request(app)
      .put(`/api/records/DERSLER/${sengRec._id}`)
      .set('Authorization', `Bearer ${cengToken}`)
      .send();

    assert.strictEqual(
      res.status,
      403,
      `Expected 403 Forbidden but got ${res.status}: ${JSON.stringify(res.body)}`
    );
  });

  it('Stress 2: Completely empty DELETE (no body, no query string) on foreign record returns 403 Forbidden', async () => {
    const sengRec = await TableRecord.create({
      templateCode: 'DERSLER',
      departmentId: sengDept._id,
      period: '2025-2026',
      rowNumber: 2,
      data: { ders_kodu: 'SENG102', ders_adi: 'Data Structures' }
    });

    // DELETE with NO body and NO query params
    const res = await request(app)
      .delete(`/api/records/DERSLER/${sengRec._id}`)
      .set('Authorization', `Bearer ${cengToken}`);

    assert.strictEqual(
      res.status,
      403,
      `Expected 403 Forbidden but got ${res.status}: ${JSON.stringify(res.body)}`
    );

    // Verify record was not deleted
    const check = await TableRecord.findById(sengRec._id);
    assert.ok(check, 'Foreign record must remain intact in DB');
  });

  it('Stress 3: Completely empty DELETE (no body, no query string) on OWN record succeeds (200 OK)', async () => {
    const cengRec = await TableRecord.create({
      templateCode: 'DERSLER',
      departmentId: cengDept._id,
      period: '2025-2026',
      rowNumber: 1,
      data: { ders_kodu: 'CENG101', ders_adi: 'Computer Engineering 101' }
    });

    // DELETE own record without body or query string
    const res = await request(app)
      .delete(`/api/records/DERSLER/${cengRec._id}`)
      .set('Authorization', `Bearer ${cengToken}`);

    assert.strictEqual(
      res.status,
      200,
      `Expected 200 OK but got ${res.status}: ${JSON.stringify(res.body)}`
    );

    // Verify record was deleted
    const check = await TableRecord.findById(cengRec._id);
    assert.strictEqual(check, null, 'Own record should have been deleted');
  });

  it('Stress 4: Cross-template IDOR: attempting to mutate DERSLER record via PROJELER route returns 404', async () => {
    const cengRec = await TableRecord.create({
      templateCode: 'DERSLER',
      departmentId: cengDept._id,
      period: '2025-2026',
      rowNumber: 2,
      data: { ders_kodu: 'CENG201', ders_adi: 'Algorithms' }
    });

    // User tries to delete DERSLER record via /api/records/PROJELER/:id
    const delRes = await request(app)
      .delete(`/api/records/PROJELER/${cengRec._id}`)
      .set('Authorization', `Bearer ${cengToken}`)
      .send({ departmentId: cengDept._id, period: '2025-2026' });

    assert.strictEqual(delRes.status, 404, `Cross-template DELETE must return 404, got ${delRes.status}`);

    // User tries to update DERSLER record via /api/records/PROJELER/:id
    const putRes = await request(app)
      .put(`/api/records/PROJELER/${cengRec._id}`)
      .set('Authorization', `Bearer ${cengToken}`)
      .send({ departmentId: cengDept._id, period: '2025-2026', data: { proje_kodu: 'HACK' } });

    assert.strictEqual(putRes.status, 404, `Cross-template PUT must return 404, got ${putRes.status}`);

    // Verify record remains untouched
    const check = await TableRecord.findById(cengRec._id);
    assert.strictEqual(check.data.ders_kodu, 'CENG201');
  });

  it('Stress 5: Batch POST cannot inject or overwrite records of foreign department', async () => {
    const sengRec = await TableRecord.create({
      templateCode: 'DERSLER',
      departmentId: sengDept._id,
      period: '2025-2026',
      rowNumber: 5,
      data: { ders_kodu: 'SENG301', ders_adi: 'Software Architecture' }
    });

    // CENG user submits POST with their own departmentId, but includes sengRec._id in rows
    const res = await request(app)
      .post('/api/records/DERSLER')
      .set('Authorization', `Bearer ${cengToken}`)
      .send({
        departmentId: cengDept._id,
        period: '2025-2026',
        rows: [
          {
            _id: sengRec._id,
            rowNumber: 5,
            data: { ders_kodu: 'INJECTED_OVERWRITE', ders_adi: 'Hijacked' }
          }
        ]
      });

    // The endpoint will respond 200 (since CENG is authorized for CENG), but sengRec must NOT be modified!
    const check = await TableRecord.findById(sengRec._id);
    assert.strictEqual(
      check.data.ders_kodu,
      'SENG301',
      `Foreign record in SENG was mutated via batch POST! Data: ${JSON.stringify(check.data)}`
    );
  });

  it('Stress 6: Workflow lock prevents single record DELETE when table is SUBMITTED', async () => {
    const cengRec = await TableRecord.create({
      templateCode: 'DERSLER',
      departmentId: cengDept._id,
      period: '2025-2026',
      rowNumber: 10,
      data: { ders_kodu: 'CENG401', ders_adi: 'Senior Design' }
    });

    // Transition CENG DERSLER workflow to SUBMITTED
    await WorkflowState.findOneAndUpdate(
      { templateCode: 'DERSLER', departmentId: cengDept._id, period: '2025-2026' },
      { status: 'SUBMITTED', submittedBy: cengDept._id, submittedAt: new Date() },
      { upsert: true }
    );

    // CENG user tries to delete their own record while SUBMITTED
    const res = await request(app)
      .delete(`/api/records/DERSLER/${cengRec._id}`)
      .set('Authorization', `Bearer ${cengToken}`);

    assert.strictEqual(
      res.status,
      403,
      `Expected 403 TABLE_SUBMITTED but got ${res.status}: ${JSON.stringify(res.body)}`
    );
    assert.strictEqual(res.body.code, 'TABLE_SUBMITTED');

    // Verify record remains
    const check = await TableRecord.findById(cengRec._id);
    assert.ok(check, 'Record should not be deleted during SUBMITTED state');
  });

  it('Stress 7: Workflow lock prevents single record PUT when table is SUBMITTED', async () => {
    const cengRec = await TableRecord.findOne({
      templateCode: 'DERSLER',
      departmentId: cengDept._id,
      rowNumber: 10
    });

    // CENG user tries to PUT record while SUBMITTED
    const res = await request(app)
      .put(`/api/records/DERSLER/${cengRec._id}`)
      .set('Authorization', `Bearer ${cengToken}`)
      .send({ data: { ders_kodu: 'CENG401-MOD', ders_adi: 'Modified Title' } });

    assert.strictEqual(
      res.status,
      403,
      `Expected 403 TABLE_SUBMITTED but got ${res.status}: ${JSON.stringify(res.body)}`
    );
    assert.strictEqual(res.body.code, 'TABLE_SUBMITTED');

    // Verify record data unchanged
    const check = await TableRecord.findById(cengRec._id);
    assert.strictEqual(check.data.ders_kodu, 'CENG401');
  });

  it('Stress 8: Malformed and Non-existent IDs handle gracefully with 4xx client errors (No unhandled exceptions)', async () => {
    // Malformed ID without departmentId
    const malformedNoDept = await request(app)
      .delete('/api/records/DERSLER/not-a-valid-mongo-id')
      .set('Authorization', `Bearer ${cengToken}`);
    assert.ok([400, 404].includes(malformedNoDept.status), `Expected 400 or 404, got ${malformedNoDept.status}`);

    // Malformed ID with departmentId
    const malformedWithDept = await request(app)
      .delete(`/api/records/DERSLER/not-a-valid-mongo-id?departmentId=${cengDept._id}&period=2025-2026`)
      .set('Authorization', `Bearer ${cengToken}`);
    assert.strictEqual(malformedWithDept.status, 404);

    // Non-existent valid ObjectId with departmentId
    const fakeId = new mongoose.Types.ObjectId();
    const notFoundRes = await request(app)
      .delete(`/api/records/DERSLER/${fakeId}?departmentId=${cengDept._id}&period=2025-2026`)
      .set('Authorization', `Bearer ${cengToken}`);
    assert.strictEqual(notFoundRes.status, 404);
  });
});
