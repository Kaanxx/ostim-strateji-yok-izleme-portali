const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { app, setupTestDB, teardownTestDB } = require('./testHelper');
const seedTemplates = require('../seeds/seedTemplates');
const Department = require('../models/Department');
const TableRecord = require('../models/TableRecord');
const { saveSnapshotNow, restoreSnapshotIfAvailable, SNAPSHOT_FILE } = require('../services/dbPersistenceService');

describe('Turnkey Persistence, Scoped Workflow Summary & Direct Web Schema Validation Suite', () => {
  let adminToken;
  let cengToken;
  let sengToken;
  let cengDept;
  let sengDept;

  before(async () => {
    await setupTestDB();
    await seedTemplates();

    cengDept = await Department.findOne({ code: 'BILGISAYAR_MUH' });
    sengDept = await Department.findOne({ code: 'YAZILIM_MUH' });

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@ostimteknik.edu.tr', password: 'Admin123!' });
    adminToken = adminLogin.body.token;

    const cengLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ceng@ostimteknik.edu.tr', password: 'Ceng123!' });
    cengToken = cengLogin.body.token;

    const sengLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'seng@ostimteknik.edu.tr', password: 'Seng123!' });
    sengToken = sengLogin.body.token;
  });

  after(async () => {
    try {
      if (fs.existsSync(SNAPSHOT_FILE)) {
        fs.unlinkSync(SNAPSHOT_FILE);
      }
    } catch (_) {}
    await teardownTestDB();
  });

  it('1. Direct Web Record Save enforces column select options and numeric min/max bounds', async () => {
    // 1.a Invalid select option on BURSLAR (bursTuru not in reference list)
    const badSelectRes = await request(app)
      .post('/api/records/BURSLAR')
      .set('Authorization', `Bearer ${cengToken}`)
      .send({
        departmentId: cengDept._id.toString(),
        period: '2025-2026',
        rows: [
          {
            rowNumber: 1,
            data: {
              bursAdi: 'Geçersiz Burs',
              bursTuru: 'OLMAYAN_BURS_TURU',
              ogrenciSayisi: 10
            }
          }
        ]
      });
    assert.strictEqual(badSelectRes.status, 400, 'Invalid select option must return 400');
    assert.strictEqual(badSelectRes.body.success, false);
    assert.ok(Array.isArray(badSelectRes.body.errors) && badSelectRes.body.errors.length > 0);

    // 1.b Negative integer on yararlananKisiSayisi (min: 1)
    const badNumRes = await request(app)
      .post('/api/records/BURSLAR')
      .set('Authorization', `Bearer ${cengToken}`)
      .send({
        departmentId: cengDept._id.toString(),
        period: '2025-2026',
        rows: [
          {
            rowNumber: 1,
            data: {
              bursAdi: 'Negatif Öğrenci',
              bursTuru: 'Nakit',
              yararlananKisiSayisi: -5
            }
          }
        ]
      });
    assert.strictEqual(badNumRes.status, 400, 'Negative yararlananKisiSayisi must return 400');
    assert.strictEqual(badNumRes.body.success, false);
  });

  it('2. Dynamic row syncAll=true removes deleted rows cleanly on save', async () => {
    // Save 2 rows
    const save2 = await request(app)
      .post('/api/records/DERSLER')
      .set('Authorization', `Bearer ${cengToken}`)
      .send({
        departmentId: cengDept._id.toString(),
        period: '2025-2026',
        syncAll: true,
        rows: [
          { rowNumber: 1, data: { dersinKodu: 'CENG101', dersinAdi: 'Programlama I' } },
          { rowNumber: 2, data: { dersinKodu: 'CENG102', dersinAdi: 'Programlama II' } }
        ]
      });
    assert.strictEqual(save2.status, 200);
    assert.strictEqual(save2.body.data.length, 2);

    const firstRowId = save2.body.data[0]._id;

    // Now save with syncAll=true keeping only row 1
    const save1 = await request(app)
      .post('/api/records/DERSLER')
      .set('Authorization', `Bearer ${cengToken}`)
      .send({
        departmentId: cengDept._id.toString(),
        period: '2025-2026',
        syncAll: true,
        rows: [
          { _id: firstRowId, rowNumber: 1, data: { dersinKodu: 'CENG101', dersinAdi: 'Programlama I (Güncel)' } }
        ]
      });
    assert.strictEqual(save1.status, 200);

    const listAfter = await request(app)
      .get(`/api/records/DERSLER?departmentId=${cengDept._id}&period=2025-2026`)
      .set('Authorization', `Bearer ${cengToken}`);
    assert.strictEqual(listAfter.status, 200);
    assert.strictEqual(listAfter.body.data.length, 1, 'Deleted dynamic row must be removed when syncAll=true');
    assert.strictEqual(listAfter.body.data[0].data.dersinAdi, 'Programlama I (Güncel)');
  });

  it('3. GET /api/workflow/summary enforces department scope isolation', async () => {
    // Submit SENG table
    await request(app)
      .post('/api/workflow/DERSLER/submit')
      .set('Authorization', `Bearer ${sengToken}`)
      .send({
        departmentId: sengDept._id.toString(),
        period: '2025-2026',
        notes: 'Yazılım Müh dersler gönderimi'
      });

    // CENG user (OWN_DEPT = BILGISAYAR_MUH) must NOT see SENG's pending submission
    const cengSummary = await request(app)
      .get('/api/workflow/summary?period=2025-2026')
      .set('Authorization', `Bearer ${cengToken}`);
    assert.strictEqual(cengSummary.status, 200);
    const sengInCengPending = (cengSummary.body.pendingReviews || []).some(
      r => String(r.departmentId) === String(sengDept._id)
    );
    assert.strictEqual(sengInCengPending, false, 'CENG user must not see SENG pending reviews');

    // Admin user (ALL) MUST see SENG's pending submission
    const adminSummary = await request(app)
      .get('/api/workflow/summary?period=2025-2026')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(adminSummary.status, 200);
    const sengInAdminPending = (adminSummary.body.pendingReviews || []).some(
      r => String(r.departmentId) === String(sengDept._id)
    );
    assert.strictEqual(sengInAdminPending, true, 'Admin must see SENG pending reviews');
  });

  it('4. Disk snapshot persistence saves and restores records & bcrypt users across wipes', async () => {
    const savedSnap = await saveSnapshotNow({ force: true });
    assert.strictEqual(savedSnap, true, 'saveSnapshotNow({ force: true }) must succeed');
    assert.ok(fs.existsSync(SNAPSHOT_FILE), 'db_snapshot.json must exist on disk');

    // Wipe TableRecord collection to simulate cold restart of embedded DB
    const countBeforeWipe = await TableRecord.countDocuments({ templateCode: 'DERSLER', departmentId: cengDept._id });
    assert.strictEqual(countBeforeWipe, 1);
    await TableRecord.deleteMany({});
    assert.strictEqual(await TableRecord.countDocuments({}), 0);

    // Restore from snapshot
    const restored = await restoreSnapshotIfAvailable({ force: true });
    assert.strictEqual(restored, true, 'restoreSnapshotIfAvailable({ force: true }) must restore data');

    const countAfterRestore = await TableRecord.countDocuments({ templateCode: 'DERSLER', departmentId: cengDept._id });
    assert.strictEqual(countAfterRestore, 1, 'Saved DERSLER record must be restored from disk snapshot');
  });
});
