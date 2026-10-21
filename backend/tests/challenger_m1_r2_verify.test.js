const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, setupTestDB, teardownTestDB } = require('./testHelper');

const Department = require('../models/Department');
const User = require('../models/User');
const TableRecord = require('../models/TableRecord');
const WorkflowState = require('../models/WorkflowState');

describe('Empirical Challenger Verification: Record Lock Bypass & Department Spoofing', () => {
  let adminToken;
  let cengUserToken;
  let reviewerToken;
  let cengDept;
  let makineDept;
  let sengDept;
  let approvedRecordId;

  before(async () => {
    await setupTestDB();

    cengDept = await Department.findOne({ code: 'BILGISAYAR_MUH' });
    sengDept = await Department.findOne({ code: 'YAZILIM_MUH' });
    makineDept = await Department.findOne({ code: 'MAKINE_MUH' });

    // Authenticate Admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@ostimteknik.edu.tr', password: 'Admin123!' });
    adminToken = adminLogin.body.token;

    // Authenticate CENG User
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ceng@ostimteknik.edu.tr', password: 'Ceng123!' });
    cengUserToken = userLogin.body.token;

    // Authenticate Reviewer (Dean)
    const reviewerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dekan.muhendislik@ostimteknik.edu.tr', password: 'Dekan123!' });
    reviewerToken = reviewerLogin.body.token;

    // Create DERSLER template
    await request(app)
      .post('/api/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'DERSLER',
        title: 'Dersler',
        category: 'Eğitim',
        type: 'DYNAMIC',
        columns: [
          { key: 'ders_kodu', label: 'Ders Kodu', type: 'text', required: true },
          { key: 'ders_adi', label: 'Ders Adı', type: 'text', required: true }
        ]
      });

    // 1. Create a CENG record under DERSLER
    const recRes = await request(app)
      .post('/api/records/DERSLER')
      .set('Authorization', `Bearer ${cengUserToken}`)
      .send({
        departmentId: cengDept._id,
        period: '2025-2026',
        rows: [{ data: { ders_kodu: 'CENG-LOCK', ders_adi: 'Original Approved Data' } }]
      });
    assert.strictEqual(recRes.status, 200);
    approvedRecordId = recRes.body.data[0]._id;

    // 2. Submit CENG DERSLER workflow
    const subRes = await request(app)
      .post('/api/workflow/DERSLER/submit')
      .set('Authorization', `Bearer ${cengUserToken}`)
      .send({
        departmentId: cengDept._id,
        period: '2025-2026',
        notes: 'Submit for lock verification'
      });
    assert.strictEqual(subRes.status, 200);

    // 3. Approve CENG DERSLER workflow -> state is now APPROVED
    const appRes = await request(app)
      .post('/api/workflow/DERSLER/review')
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({
        departmentId: cengDept._id,
        period: '2025-2026',
        action: 'APPROVE',
        note: 'Sealed as approved'
      });
    assert.strictEqual(appRes.status, 200);
    assert.strictEqual(appRes.body.data.status, 'APPROVED');

    // 4. Grant CENG user CUSTOM department scope including MAKINE_MUH
    // MAKINE_MUH is in DRAFT status with open deadline
    const cengUser = await User.findOne({ email: 'ceng@ostimteknik.edu.tr' });
    cengUser.departmentScope = {
      type: 'CUSTOM',
      departments: [cengDept._id, makineDept._id]
    };
    await cengUser.save();
  });

  after(async () => {
    await teardownTestDB();
  });

  it('C1: PUT with body spoofing (departmentId=MAKINE) against CENG approved record returns 403 TABLE_APPROVED', async () => {
    const res = await request(app)
      .put(`/api/records/DERSLER/${approvedRecordId}`)
      .set('Authorization', `Bearer ${cengUserToken}`)
      .send({
        departmentId: makineDept._id, // Spoofing active draft department
        period: '2025-2026',
        data: { ders_kodu: 'HACKED-BODY', ders_adi: 'Spoofed via Body' }
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'TABLE_APPROVED');

    // Verify record in DB is unmodified
    const recordInDb = await TableRecord.findById(approvedRecordId);
    assert.strictEqual(recordInDb.data.ders_kodu, 'CENG-LOCK');
    assert.strictEqual(recordInDb.data.ders_adi, 'Original Approved Data');
  });

  it('C2: PUT with query spoofing (?departmentId=MAKINE) against CENG approved record returns 403 TABLE_APPROVED', async () => {
    const res = await request(app)
      .put(`/api/records/DERSLER/${approvedRecordId}?departmentId=${makineDept._id}&period=2025-2026`)
      .set('Authorization', `Bearer ${cengUserToken}`)
      .send({
        data: { ders_kodu: 'HACKED-QUERY', ders_adi: 'Spoofed via Query' }
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'TABLE_APPROVED');

    const recordInDb = await TableRecord.findById(approvedRecordId);
    assert.strictEqual(recordInDb.data.ders_kodu, 'CENG-LOCK');
  });

  it('C3: DELETE with body spoofing (departmentId=MAKINE) against CENG approved record returns 403 TABLE_APPROVED', async () => {
    const res = await request(app)
      .delete(`/api/records/DERSLER/${approvedRecordId}`)
      .set('Authorization', `Bearer ${cengUserToken}`)
      .send({
        departmentId: makineDept._id,
        period: '2025-2026'
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'TABLE_APPROVED');

    const recordInDb = await TableRecord.findById(approvedRecordId);
    assert.ok(recordInDb, 'Record must NOT be deleted');
  });

  it('C4: DELETE with query spoofing (?departmentId=MAKINE) against CENG approved record returns 403 TABLE_APPROVED', async () => {
    const res = await request(app)
      .delete(`/api/records/DERSLER/${approvedRecordId}?departmentId=${makineDept._id}&period=2025-2026`)
      .set('Authorization', `Bearer ${cengUserToken}`);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'TABLE_APPROVED');

    const recordInDb = await TableRecord.findById(approvedRecordId);
    assert.ok(recordInDb, 'Record must NOT be deleted');
  });

  it('C5: DELETE without any department parameters against CENG approved record returns 403 TABLE_APPROVED', async () => {
    const res = await request(app)
      .delete(`/api/records/DERSLER/${approvedRecordId}`)
      .set('Authorization', `Bearer ${cengUserToken}`);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'TABLE_APPROVED');

    const recordInDb = await TableRecord.findById(approvedRecordId);
    assert.ok(recordInDb, 'Record must NOT be deleted');
  });

  it('C6: PUT by user without access to target record department returns 403 Forbidden', async () => {
    // Authenticate SENG user (who has NO access to CENG)
    const sengLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'seng@ostimteknik.edu.tr', password: 'Seng123!' });
    const sengToken = sengLogin.body.token;

    // SENG tries to mutate CENG record, passing SENG's departmentId (which is DRAFT)
    const res = await request(app)
      .put(`/api/records/DERSLER/${approvedRecordId}`)
      .set('Authorization', `Bearer ${sengToken}`)
      .send({
        departmentId: sengDept._id,
        period: '2025-2026',
        data: { ders_kodu: 'SENG-HIJACK', ders_adi: 'Hijack Attempt' }
      });

    assert.strictEqual(res.status, 403);

    const recordInDb = await TableRecord.findById(approvedRecordId);
    assert.strictEqual(recordInDb.data.ders_kodu, 'CENG-LOCK');
  });

  it('C7: Admin Emergency Override can successfully update and delete APPROVED record', async () => {
    // Admin PUT succeeds
    const putRes = await request(app)
      .put(`/api/records/DERSLER/${approvedRecordId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        departmentId: cengDept._id,
        period: '2025-2026',
        data: { ders_kodu: 'CENG-ADMIN-FIX', ders_adi: 'Admin Override Fix' }
      });

    assert.strictEqual(putRes.status, 200);
    assert.strictEqual(putRes.body.success, true);
    assert.strictEqual(putRes.body.data.data.ders_kodu, 'CENG-ADMIN-FIX');

    // Admin DELETE succeeds
    const delRes = await request(app)
      .delete(`/api/records/DERSLER/${approvedRecordId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.body.success, true);

    const recordInDb = await TableRecord.findById(approvedRecordId);
    assert.strictEqual(recordInDb, null, 'Record should be deleted by admin');
  });
});
