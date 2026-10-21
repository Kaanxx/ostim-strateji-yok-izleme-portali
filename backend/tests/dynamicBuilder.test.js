const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const ExcelJS = require('exceljs');
const { app, setupTestDB, teardownTestDB } = require('./testHelper');
const Department = require('../models/Department');

describe('Milestone 1 — Dynamic Template & Table Builder Test Suite', () => {
  let adminToken;
  let deptUserToken;
  let cengDept;

  before(async () => {
    await setupTestDB();

    cengDept = await Department.findOne({ code: 'BILGISAYAR_MUH' });

    // Authenticate Admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@ostimteknik.edu.tr', password: 'Admin123!' });
    adminToken = adminLogin.body.token;

    // Authenticate Dept User
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ceng@ostimteknik.edu.tr', password: 'Ceng123!' });
    deptUserToken = userLogin.body.token;
  });

  after(async () => {
    await teardownTestDB();
  });

  it('3.1 Non-admin user is BLOCKED from creating templates (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/templates')
      .set('Authorization', `Bearer ${deptUserToken}`)
      .send({
        code: 'TEST_TBL',
        title: 'Test Table',
        category: 'Test',
        columns: [{ key: 'col1', label: 'Kolon 1', type: 'text' }]
      });

    assert.strictEqual(res.status, 403);
  });

  it('3.2 System Admin can dynamically create a new custom template with typed columns', async () => {
    const res = await request(app)
      .post('/api/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'LAB_ENVANTER',
        title: 'Laboratuvar Cihaz Envanteri',
        category: 'Altyapı',
        type: 'DYNAMIC',
        description: 'Bölümlerdeki laboratuvar cihazlarının takibi',
        columns: [
          { key: 'cihaz_kodu', label: 'Cihaz Kodu', type: 'text', required: true },
          { key: 'cihaz_adi', label: 'Cihaz Adı', type: 'text', required: true },
          { key: 'adet', label: 'Cihaz Adedi', type: 'integer', min: 1, max: 100 },
          { key: 'durum', label: 'Çalışma Durumu', type: 'select', options: ['Aktif', 'Bakımda', 'Hurda'] }
        ]
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.code, 'LAB_ENVANTER');
    assert.strictEqual(res.body.data.columns.length, 4);
  });

  it('3.3 Creating template with duplicate column keys should be rejected (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'DUPLICATE_KEY_TBL',
        title: 'Duplicate Test',
        category: 'Test',
        columns: [
          { key: 'ayni_kolon', label: 'Birinci', type: 'text' },
          { key: 'ayni_kolon', label: 'İkinci', type: 'integer' }
        ]
      });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.message, /mükerrer/i);
  });

  it('3.4 GET /api/templates/:code returns the newly created template schema', async () => {
    const res = await request(app)
      .get('/api/templates/LAB_ENVANTER');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.title, 'Laboratuvar Cihaz Envanteri');
    assert.strictEqual(res.body.data.columns[2].type, 'integer');
    assert.strictEqual(res.body.data.columns[3].options.length, 3);
  });

  it('3.5 Admin can update template columns and metadata via PUT /api/templates/:code', async () => {
    const res = await request(app)
      .put('/api/templates/LAB_ENVANTER')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Güncellenmiş Laboratuvar Envanteri',
        columns: [
          { key: 'cihaz_kodu', label: 'Cihaz Kodu', type: 'text', required: true },
          { key: 'cihaz_adi', label: 'Cihaz Adı', type: 'text', required: true },
          { key: 'adet', label: 'Cihaz Adedi', type: 'integer', min: 1 },
          { key: 'durum', label: 'Çalışma Durumu', type: 'select', options: ['Aktif', 'Bakımda', 'Hurda', 'Kalibrasyonda'] },
          { key: 'kalibrasyon_tarihi', label: 'Son Kalibrasyon Tarihi', type: 'date' }
        ]
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.title, 'Güncellenmiş Laboratuvar Envanteri');
    assert.strictEqual(res.body.data.columns.length, 5);
  });

  it('3.6 Granted department user can immediately submit data to the dynamically created template', async () => {
    const res = await request(app)
      .post('/api/records/LAB_ENVANTER')
      .set('Authorization', `Bearer ${deptUserToken}`)
      .send({
        departmentId: cengDept._id,
        period: '2025-2026',
        rows: [
          {
            data: {
              cihaz_kodu: 'DEV-001',
              cihaz_adi: 'Osiloskop',
              adet: 5,
              durum: 'Aktif'
            }
          },
          {
            data: {
              cihaz_kodu: 'DEV-002',
              cihaz_adi: 'Spektrum Analizör',
              adet: 2,
              durum: 'Bakımda'
            }
          }
        ]
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.count, 2);

    // Query back records
    const fetchRes = await request(app)
      .get(`/api/records/LAB_ENVANTER?departmentId=${cengDept._id}&period=2025-2026`)
      .set('Authorization', `Bearer ${deptUserToken}`);

    assert.strictEqual(fetchRes.status, 200);
    assert.strictEqual(fetchRes.body.data.length, 2);
    assert.strictEqual(fetchRes.body.data[0].data.cihaz_kodu, 'DEV-001');
  });

  it('3.7 POST /api/templates/extract-from-excel extracts sheet, headers and data types from sample workbook', async () => {
    // Generate an in-memory sample Excel file
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Burslar');

    // Headers
    sheet.addRow(['Öğrenci No', 'Ad Soyad', 'Burs Miktarı', 'Burs Türü']);
    // Data rows
    sheet.addRow(['210101', 'Ali Can', 3500.50, 'Başarı Bursu']);
    sheet.addRow(['210102', 'Ayşe Yılmaz', 5000.00, 'İhtiyaç Bursu']);

    const buffer = await workbook.xlsx.writeBuffer();

    const res = await request(app)
      .post('/api/templates/extract-from-excel')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(buffer), 'Burslar.xlsx');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.code, 'BURSLAR');
    assert.ok(res.body.data.columns.length >= 4);

    const keys = res.body.data.columns.map(c => c.key);
    assert.ok(keys.includes('ogrenci_no'));
    assert.ok(keys.includes('ad_soyad'));
    assert.ok(keys.includes('burs_miktari'));
    assert.ok(keys.includes('burs_turu'));
  });
});
