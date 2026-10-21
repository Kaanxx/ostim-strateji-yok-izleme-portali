const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, setupTestDB, teardownTestDB } = require('./testHelper');
const seedTemplates = require('../seeds/seedTemplates');
const Department = require('../models/Department');
const Template = require('../models/Template');
const TableRecord = require('../models/TableRecord');
const formulaEngineService = require('../services/formulaEngineService');

describe('Milestone 2 — Template Engine, Formulas & Validations Test Suite', () => {
  let adminToken;
  let deptUserToken;
  let cengDept;

  before(async () => {
    await setupTestDB();
    await seedTemplates();

    cengDept = await Department.findOne({ code: 'BILGISAYAR_MUH' });

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
  });

  after(async () => {
    await teardownTestDB();
  });

  describe('1. 24 Official YÖK Templates & Institutional Hierarchy Seeding', () => {
    it('1.1 All 24 official YÖK templates must be present in the database', async () => {
      const yokCodes = [
        'ALANLAR', 'ATIK', 'BURSLAR', 'DANISMA_KURULU', 'DERSLER',
        'DIJITAL_OLGUNLUK', 'EGITICILERIN_EGITIMI', 'ENERJI', 'ETKINLIK',
        'FIRMALAR', 'FINANS', 'HAREKETLILIK', 'KARBON_AYAKIZI',
        'MEMNUNIYET_ANKETI', 'MEZUN_TAKIP_SISTEMI', 'MYO_UYGULAMALI_EGITIM',
        'ODULLER', 'OGRENCI_TOPLULUKLARI', 'OZDEGERLENDIRME', 'PATENT',
        'PAYDAS', 'PROJELER', 'SEM', 'SORU_SETI'
      ];

      for (const code of yokCodes) {
        const t = await Template.findOne({ code });
        assert.ok(t, `Template ${code} should exist in database`);
        assert.strictEqual(t.isActive, true, `Template ${code} should be active`);
      }
    });

    it('1.2 Exactly 6 fixed matrix templates have type=FIXED and required fixedRows', async () => {
      const fixedConfigs = {
        ENERJI: 28,
        FINANS: 34,
        KARBON_AYAKIZI: 6,
        ATIK: 6,
        SORU_SETI: 22,
        DIJITAL_OLGUNLUK: 106
      };

      for (const [code, expectedRows] of Object.entries(fixedConfigs)) {
        const t = await Template.findOne({ code });
        assert.ok(t, `Fixed template ${code} must exist`);
        assert.strictEqual(t.type, 'FIXED', `${code} must have type FIXED`);
        assert.strictEqual(t.fixedRows.length, expectedRows, `${code} must have ${expectedRows} fixedRows`);
      }
    });

    it('1.3 Institutional templates exist across all 5 prototype categories', async () => {
      const categories = [
        'Uygulama ve Araştırma Merkezleri',
        'Ulusal Eylem Planları',
        'Valilik ve Kamu Raporları',
        'Dış İlişkiler ve Kalkınma',
        'Uluslararasılaşma'
      ];

      for (const category of categories) {
        const count = await Template.countDocuments({ category });
        assert.ok(count > 0, `Category "${category}" should have seeded templates`);
      }
    });
  });

  describe('2. On-Demand Fixed-Row Auto-Initialization on Query', () => {
    it('2.1 Initial query to ENERJI auto-populates all 28 fixed rows in DRAFT state', async () => {
      const res = await request(app)
        .get('/api/records/ENERJI')
        .query({ departmentId: cengDept._id.toString(), period: '2025-2026' })
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.count, 28);
      assert.strictEqual(res.body.data.length, 28);

      // Verify first row and summary rows
      assert.strictEqual(res.body.data[0].rowNumber, 1);
      assert.strictEqual(res.body.data[0].status, 'DRAFT');

      const row8 = res.body.data.find(r => r.rowNumber === 8);
      assert.ok(row8, 'Row 8 must exist');
      assert.strictEqual(row8.data.isSummary, true);
    });

    it('2.2 Second query to ENERJI does NOT create duplicate records', async () => {
      const res = await request(app)
        .get('/api/records/ENERJI')
        .query({ departmentId: cengDept._id.toString(), period: '2025-2026' })
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.count, 28);

      const dbCount = await TableRecord.countDocuments({
        templateCode: 'ENERJI',
        departmentId: cengDept._id,
        period: '2025-2026'
      });
      assert.strictEqual(dbCount, 28, 'Database must contain exactly 28 records');
    });

    it('2.3 Initial query to FINANS auto-populates all 34 fixed rows', async () => {
      const res = await request(app)
        .get('/api/records/FINANS')
        .query({ departmentId: cengDept._id.toString(), period: '2025-2026' })
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.count, 34);

      const row16 = res.body.data.find(r => r.rowNumber === 16);
      assert.ok(row16, 'Row 16 Toplam Gelir must exist');
      assert.strictEqual(row16.data.isSummary, true);

      const row34 = res.body.data.find(r => r.rowNumber === 34);
      assert.ok(row34, 'Row 34 Bütçe Dengesi must exist');
      assert.strictEqual(row34.data.isSummary, true);
    });

    it('2.4 Initial query to KARBON_AYAKIZI auto-populates 6 fixed unit rows', async () => {
      const res = await request(app)
        .get('/api/records/KARBON_AYAKIZI')
        .query({ departmentId: cengDept._id.toString(), period: '2025-2026' })
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.count, 6);
    });
  });

  describe('3. Live Formula Calculation Engine & Endpoints', () => {
    it('3.1 ENERJI: Computes correct sums and detects UYUMLU vs FARKLILIK VAR', async () => {
      const rows = [
        { rowNumber: 1, data: { siraNo: 1, label: 'Rektörlük', elektrik: 200, su: 50 } },
        { rowNumber: 2, data: { siraNo: 2, label: 'Mühendislik Fakültesi', elektrik: 400, su: 150 } },
        { rowNumber: 8, data: { siraNo: 8, label: 'Toplam', isSummary: true } },
        { rowNumber: 9, data: { siraNo: 9, label: 'Eğitim-Öğretim', elektrik: 600, su: 200 } },
        { rowNumber: 16, data: { siraNo: 16, label: 'Toplam2', isSummary: true } }
      ];

      const res = await request(app)
        .post('/api/records/ENERJI/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rows });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);

      const calcRows = res.body.data.rows;
      const calcRow8 = calcRows.find(r => r.rowNumber === 8);
      const calcRow16 = calcRows.find(r => r.rowNumber === 16);

      assert.strictEqual(calcRow8.data.elektrik, 600);
      assert.strictEqual(calcRow8.data.su, 200);

      assert.strictEqual(calcRow16.data.elektrik, 600);
      assert.strictEqual(calcRow16.data.su, 200);

      assert.strictEqual(res.body.data.summary.isEqual, true);
      assert.strictEqual(res.body.data.summary.status, 'UYUMLU');
    });

    it('3.2 FINANS: Sums revenues (excluding rows 13 & 15), expenses, and verifies cash balance', async () => {
      const rows = [
        { rowNumber: 1, data: { tutar: 1000000 } },
        { rowNumber: 2, data: { tutar: 500000 } },
        { rowNumber: 13, data: { tutar: 999999 } }, // Grey row excluded from Toplam Gelir
        { rowNumber: 14, data: { tutar: 888888 } }, // Grey row excluded from Toplam Gelir
        { rowNumber: 15, data: { tutar: 777777 } }, // Grey row excluded from Toplam Gelir
        { rowNumber: 16, data: { isSummary: true } },
        { rowNumber: 17, data: { tutar: 1200000 } }, // Expense row
        { rowNumber: 18, data: { tutar: 200000 } },  // Expense row
        { rowNumber: 32, data: { tutar: 100000 } },  // Kasa
        { rowNumber: 34, data: { isSummary: true } }
      ];

      const res = await request(app)
        .post('/api/records/FINANS/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rows });

      assert.strictEqual(res.statusCode, 200);
      const calcRows = res.body.data.rows;

      const calcRow16 = calcRows.find(r => r.rowNumber === 16);
      const calcRow34 = calcRows.find(r => r.rowNumber === 34);

      // Toplam Gelir = Row 1 + Row 2 = 1,500,000 (excluding 13, 14, 15)
      assert.strictEqual(calcRow16.data.tutar, 1500000);
      // Toplam Gider = Row 17 (1,200,000) + Row 18 (200,000) + Row 32 (100,000) = 1,500,000
      assert.strictEqual(calcRow34.data.tutar, 1500000);
      // Kasa Farkı = 1,500,000 - 1,500,000 = 0
      assert.strictEqual(calcRow34.data.kasaFarki, 0);
      assert.strictEqual(calcRow34.data.durum, 'Tamam');
    });

    it('3.3 KARBON_AYAKIZI: Verifies authentic emission factors and totals', async () => {
      const rows = [
        { rowNumber: 1, data: { dogalgaz: 1000, komur: 2, dizel: 50, benzin: 30, fuelOil: 1 } }
      ];

      const res = await request(app)
        .post('/api/records/KARBON_AYAKIZI/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rows });

      assert.strictEqual(res.statusCode, 200);
      const calcRow = res.body.data.rows[0].data;

      // 1000*2.0 + 2*2460 + 50*11.5 + 30*9.5 + 1*3150 = 2000 + 4920 + 575 + 285 + 3150 = 10930
      assert.strictEqual(calcRow.karbonAyakiziDegeri, 10930);
      assert.strictEqual(res.body.data.totals.totalEmissions, 10930);
      assert.strictEqual(res.body.data.totals.totalTonnesCO2e, 10.93);
    });

    it('3.4 PROJELER: Computes budget reconciliation against breakdown sources', async () => {
      const rows = [
        {
          rowNumber: 1,
          data: {
            butcesiTl: 500000,
            tubitak: 350000,
            donerSermaye: 150000
          }
        }
      ];

      const res = await request(app)
        .post('/api/records/PROJELER/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rows });

      assert.strictEqual(res.statusCode, 200);
      const calcRow = res.body.data.rows[0].data;
      assert.strictEqual(calcRow.breakdownSum, 500000);
      assert.strictEqual(calcRow.butceDurumu, 'Bütçe Tamam');
    });

    it('3.5 MEMNUNIYET_ANKETI: Computes normalized score across different survey scales', async () => {
      const rows = [
        { rowNumber: 1, data: { olcumSkalasi: 5, ortalamaAnketPuani: 4 } },
        { rowNumber: 2, data: { olcumSkalasi: 10, ortalamaAnketPuani: 8.5 } },
        { rowNumber: 3, data: { olcumSkalasi: 100, ortalamaAnketPuani: 90 } }
      ];

      const res = await request(app)
        .post('/api/records/MEMNUNIYET_ANKETI/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rows });

      assert.strictEqual(res.statusCode, 200);
      const calcRows = res.body.data.rows;

      // Scale 5: 4 * 20 = 80
      assert.strictEqual(calcRows[0].data.normalizeAnketPuani, 80);
      // Scale 10: 8.5 * 10 = 85
      assert.strictEqual(calcRows[1].data.normalizeAnketPuani, 85);
      // Scale 100: 90
      assert.strictEqual(calcRows[2].data.normalizeAnketPuani, 90);
    });
  });

  describe('4. Custom Validations & Pre-Save Enforcement', () => {
    it('4.1 EGITICILERIN_EGITIMI: Accepts valid duration strings ("3 Saat", "2 Gün", "1 Hafta")', async () => {
      const res = await request(app)
        .post('/api/records/EGITICILERIN_EGITIMI')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentId: cengDept._id.toString(),
          period: '2025-2026',
          rows: [
            { rowNumber: 1, data: { egitiminAdi: 'Pedagojik Formasyon', egitiminSuresi: '3 Saat' } },
            { rowNumber: 2, data: { egitiminAdi: 'Yapay Zeka', egitiminSuresi: '2 Gün' } }
          ]
        });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
    });

    it('4.2 EGITICILERIN_EGITIMI: Blocks invalid duration format with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/records/EGITICILERIN_EGITIMI')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentId: cengDept._id.toString(),
          period: '2025-2026',
          rows: [
            { rowNumber: 1, data: { egitiminAdi: 'Hatalı Süre', egitiminSuresi: '45 Dakika' } }
          ]
        });

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.errors.some(e => e.field === 'egitiminSuresi'));
    });

    it('4.3 OGRENCI_TOPLULUKLARI: Allows 0 and >=3 disabled members', async () => {
      const res = await request(app)
        .post('/api/records/OGRENCI_TOPLULUKLARI')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentId: cengDept._id.toString(),
          period: '2025-2026',
          rows: [
            { rowNumber: 1, data: { toplulukAdi: 'Robotik Kulübü', engelliUyeSayisi: 0 } },
            { rowNumber: 2, data: { toplulukAdi: 'Yazılım Kulübü', engelliUyeSayisi: 4 } }
          ]
        });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
    });

    it('4.4 OGRENCI_TOPLULUKLARI: Blocks 1 and 2 disabled members (KVKK Privacy Rule)', async () => {
      for (const disabledCount of [1, 2]) {
        const res = await request(app)
          .post('/api/records/OGRENCI_TOPLULUKLARI')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            departmentId: cengDept._id.toString(),
            period: '2025-2026',
            rows: [
              { rowNumber: 1, data: { toplulukAdi: 'Gizlilik Test Kulübü', engelliUyeSayisi: disabledCount } }
            ]
          });

        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(res.body.success, false);
        assert.ok(res.body.errors.some(e => e.code === 'KVKK_PRIVACY_VIOLATION'));
      }
    });

    it('4.5 SORU_SETI: Enforces explanation requirement when response > 89% on rows 9 & 10', async () => {
      const invalidRes = await request(app)
        .post('/api/records/SORU_SETI')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentId: cengDept._id.toString(),
          period: '2025-2026',
          rows: [
            { rowNumber: 9, data: { siraNo: 9, cevap: 95, aciklama: '' } }
          ]
        });

      assert.strictEqual(invalidRes.statusCode, 400);
      assert.strictEqual(invalidRes.body.success, false);
      assert.ok(invalidRes.body.errors.some(e => e.field === 'aciklama'));

      const validRes = await request(app)
        .post('/api/records/SORU_SETI')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentId: cengDept._id.toString(),
          period: '2025-2026',
          rows: [
            { rowNumber: 9, data: { siraNo: 9, cevap: 95, aciklama: 'Yüksek memnuniyet gerekçesi' } }
          ]
        });

      assert.strictEqual(validRes.statusCode, 200);
      assert.strictEqual(validRes.body.success, true);
    });
  });
});
