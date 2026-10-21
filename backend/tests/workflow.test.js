const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, setupTestDB, teardownTestDB } = require('./testHelper');
const Department = require('../models/Department');
const Template = require('../models/Template');
const TableRecord = require('../models/TableRecord');
const PeriodDeadline = require('../models/PeriodDeadline');

describe('Milestone 1 — Workflow State Machine, Deadlines & Audit Logging Test Suite', () => {
  let adminToken;
  let deptUserToken;
  let reviewerToken;
  let cengDept;

  before(async () => {
    await setupTestDB();

    cengDept = await Department.findOne({ code: 'BILGISAYAR_MUH' });

    // Create test template: PROJELER
    await Template.create({
      code: 'PROJELER',
      title: 'Araştırma Projeleri',
      category: 'Araştırma',
      type: 'DYNAMIC',
      columns: [
        { key: 'proje_kodu', label: 'Proje Kodu', type: 'text', required: true },
        { key: 'proje_adi', label: 'Proje Adı', type: 'text', required: true },
        { key: 'butce', label: 'Bütçe (TL)', type: 'decimal' }
      ]
    });

    // Authenticate Admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@ostimteknik.edu.tr', password: 'Admin123!' });
    adminToken = adminLogin.body.token;

    // Authenticate Dept User (CENG)
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ceng@ostimteknik.edu.tr', password: 'Ceng123!' });
    deptUserToken = userLogin.body.token;

    // Authenticate Reviewer (Dean)
    const reviewerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dekan.muhendislik@ostimteknik.edu.tr', password: 'Dekan123!' });
    reviewerToken = reviewerLogin.body.token;
  });

  after(async () => {
    await teardownTestDB();
  });

  it('4.1 Initial state: Table records can be created in DRAFT state', async () => {
    const res = await request(app)
      .post('/api/records/PROJELER')
      .set('Authorization', `Bearer ${deptUserToken}`)
      .send({
        departmentId: cengDept._id,
        period: '2025-2026',
        rows: [
          {
            data: {
              proje_kodu: 'PRJ-01',
              proje_adi: 'Yapay Zeka Destekli Kalite Kontrol',
              butce: 250000
            }
          }
        ]
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    // Verify workflow status is DRAFT
    const wfRes = await request(app)
      .get(`/api/workflow/PROJELER?departmentId=${cengDept._id}&period=2025-2026`)
      .set('Authorization', `Bearer ${deptUserToken}`);

    assert.strictEqual(wfRes.status, 200);
    assert.strictEqual(wfRes.body.data.status, 'DRAFT');
    assert.strictEqual(wfRes.body.data.isLocked, false);
  });

  it('4.2 POST /api/workflow/PROJELER/submit transitions status from DRAFT to SUBMITTED', async () => {
    const res = await request(app)
      .post('/api/workflow/PROJELER/submit')
      .set('Authorization', `Bearer ${deptUserToken}`)
      .send({
        departmentId: cengDept._id,
        period: '2025-2026',
        notes: '2025-2026 Projeler tablosu dekanlık onayına sunuldu.'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'SUBMITTED');
  });

  it('4.3 Enforce Workflow Lock: Non-admin is BLOCKED from mutating records when SUBMITTED (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/records/PROJELER')
      .set('Authorization', `Bearer ${deptUserToken}`)
      .send({
        departmentId: cengDept._id,
        period: '2025-2026',
        rows: [
          {
            data: {
              proje_kodu: 'PRJ-02',
              proje_adi: 'İzinsiz Değişiklik Denemesi',
              butce: 100000
            }
          }
        ]
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'TABLE_SUBMITTED');
    assert.match(res.body.message, /onay için gönderilmiştir/i);
  });

  it('4.4 Reviewer requests revision (action: REVISE) with mandatory notes', async () => {
    // 1. Without notes -> should fail
    const failRes = await request(app)
      .post('/api/workflow/PROJELER/review')
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({
        departmentId: cengDept._id,
        period: '2025-2026',
        action: 'REVISE',
        note: ''
      });

    assert.strictEqual(failRes.status, 400);

    // 2. With notes -> transitions to REVISION_REQUESTED
    const res = await request(app)
      .post('/api/workflow/PROJELER/review')
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({
        departmentId: cengDept._id,
        period: '2025-2026',
        action: 'REVISE',
        note: 'Proje bütçe kalemi BAP formatına uygun yazılmalı.'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'REVISION_REQUESTED');
    assert.strictEqual(res.body.data.reviewNotes, 'Proje bütçe kalemi BAP formatına uygun yazılmalı.');
  });

  it('4.5 In REVISION_REQUESTED state, non-admin is UNBLOCKED and can modify records', async () => {
    const res = await request(app)
      .post('/api/records/PROJELER')
      .set('Authorization', `Bearer ${deptUserToken}`)
      .send({
        departmentId: cengDept._id,
        period: '2025-2026',
        rows: [
          {
            data: {
              proje_kodu: 'PRJ-01',
              proje_adi: 'Yapay Zeka Destekli Kalite Kontrol (Revize Edildi)',
              butce: 275000
            }
          }
        ]
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  it('4.6 Re-submit and Reviewer APPROVES (action: APPROVE), sealing the submission', async () => {
    // 1. Re-submit
    const subRes = await request(app)
      .post('/api/workflow/PROJELER/submit')
      .set('Authorization', `Bearer ${deptUserToken}`)
      .send({
        departmentId: cengDept._id,
        period: '2025-2026',
        notes: 'Gerekli düzeltmeler yapıldı ve tekrar onaya sunuldu.'
      });
    assert.strictEqual(subRes.status, 200);
    assert.strictEqual(subRes.body.data.status, 'SUBMITTED');

    // 2. Reviewer approves
    const appRes = await request(app)
      .post('/api/workflow/PROJELER/review')
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({
        departmentId: cengDept._id,
        period: '2025-2026',
        action: 'APPROVE',
        note: 'Veriler incelendi ve onaylandı.'
      });

    assert.strictEqual(appRes.status, 200);
    assert.strictEqual(appRes.body.success, true);
    assert.strictEqual(appRes.body.data.status, 'APPROVED');
  });

  it('4.7 Enforce Workflow Lock: Non-admin is BLOCKED from modifying APPROVED records (403 TABLE_APPROVED)', async () => {
    const res = await request(app)
      .post('/api/records/PROJELER')
      .set('Authorization', `Bearer ${deptUserToken}`)
      .send({
        departmentId: cengDept._id,
        period: '2025-2026',
        rows: [
          {
            data: {
              proje_kodu: 'PRJ-01',
              proje_adi: 'Onay Sonrası Kaçak Değişiklik',
              butce: 300000
            }
          }
        ]
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'TABLE_APPROVED');
    assert.match(res.body.message, /onaylanmıştır/i);
  });

  it('4.8 Admin Emergency Override: System Admin CAN modify records even when table is APPROVED', async () => {
    const res = await request(app)
      .post('/api/records/PROJELER')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        departmentId: cengDept._id,
        period: '2025-2026',
        rows: [
          {
            data: {
              proje_kodu: 'PRJ-01',
              proje_adi: 'Yönetici Acil Düzeltmesi',
              butce: 280000
            }
          }
        ]
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  it('4.9 Admin REOPEN: Admin reopens APPROVED table back to REVISION_REQUESTED', async () => {
    const res = await request(app)
      .post('/api/workflow/PROJELER/review')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        departmentId: cengDept._id,
        period: '2025-2026',
        action: 'REOPEN',
        note: 'YÖK ek bilgi talebi nedeniyle tablo yeniden açıldı.'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'REVISION_REQUESTED');
  });

  it('4.10 Deadline Enforcement: Expired submission deadline blocks non-admin modifications', async () => {
    // Set deadline for PROJELER in the past
    await PeriodDeadline.create({
      period: '2025-2026',
      templateCode: 'PROJELER',
      departmentId: cengDept._id,
      deadline: new Date('2020-01-01T00:00:00.000Z'),
      remarks: 'Geçmiş teslim tarihi testi'
    });

    const res = await request(app)
      .post('/api/records/PROJELER')
      .set('Authorization', `Bearer ${deptUserToken}`)
      .send({
        departmentId: cengDept._id,
        period: '2025-2026',
        rows: [{ data: { test: true } }]
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'DEADLINE_PASSED');
  });

  it('4.11 Forensic Audit Ledger: GET /api/audit-logs captures chronological lifecycle events', async () => {
    const res = await request(app)
      .get('/api/audit-logs?templateCode=PROJELER')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.total >= 3, 'Audit logs should contain multiple actions');

    const actions = res.body.data.map(l => l.action);
    assert.ok(actions.includes('SUBMIT'), 'SUBMIT action should be recorded');
    assert.ok(actions.includes('APPROVE') || actions.includes('REVISE'), 'Review action should be recorded');
  });
});
