const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, setupTestDB, teardownTestDB } = require('./testHelper');
const seedTemplates = require('../seeds/seedTemplates');
const Department = require('../models/Department');
const formulaEngineService = require('../services/formulaEngineService');

describe('Challenger M2-1 — Empirical Adversarial Stress-Test Suite', () => {
  let adminToken;
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
  });

  after(async () => {
    await teardownTestDB();
  });

  // =========================================================================
  // 1. FINANS CHALLENGES
  // =========================================================================
  describe('Challenge 1: FINANS Constraints & Calculation Engine', () => {
    it('1.1 Row 32 (Mali Yıl Sonu Kasası) accepts negative values', () => {
      const rows = [
        { rowNumber: 1, data: { tutar: 100000 } },
        { rowNumber: 17, data: { tutar: 150000 } },
        { rowNumber: 32, data: { tutar: -50000 } } // Negative cash balance allowed
      ];
      const res = formulaEngineService.calculateFinans(rows);
      assert.strictEqual(res.calculated, true);
      assert.strictEqual(res.totals.toplamGelir, 100000);
      assert.strictEqual(res.totals.toplamGider, 100000); // 150000 + (-50000) = 100000
      assert.strictEqual(res.totals.kasaFarki, 0);
      assert.strictEqual(res.totals.status, 'Tamam');
    });

    it('1.2 Negative values in rows other than row 32 MUST be rejected', () => {
      const rowsWithNegativeRevenue = [
        { rowNumber: 1, data: { tutar: -5000 } }, // Negative revenue should be rejected
        { rowNumber: 32, data: { tutar: -1000 } }
      ];
      const res = formulaEngineService.preSaveHook('FINANS', { rows: rowsWithNegativeRevenue });
      assert.strictEqual(
        res.isValid,
        false,
        'FINANS preSaveHook MUST reject negative values in revenue/expense rows other than row 32'
      );
      assert.ok(
        res.errors && res.errors.length > 0,
        'Expected validation error for negative value in row 1'
      );
    });

    it('1.3 Row 16 (Toplam Gelir) strictly excludes rows 13, 14, 15', () => {
      const rows = [
        { rowNumber: 1, data: { tutar: 20000 } },
        { rowNumber: 2, data: { tutar: 30000 } },
        { rowNumber: 13, data: { tutar: 999999 } }, // BAP - grey row, excluded
        { rowNumber: 14, data: { tutar: 888888 } }, // Döner Sermaye Toplam - grey row, excluded
        { rowNumber: 15, data: { tutar: 777777 } }, // Topluma Hizmet Gelirleri - grey row, excluded
        { rowNumber: 16, data: { isSummary: true } }
      ];
      const res = formulaEngineService.calculateFinans(rows);
      assert.strictEqual(res.totals.toplamGelir, 50000, 'Toplam Gelir must sum only rows 1..12');
      const row16 = res.rows.find(r => r.rowNumber === 16);
      assert.strictEqual(row16.data.tutar, 50000);
    });

    it('1.4 Row 34 (Toplam Gider) strictly excludes row 33', () => {
      const rows = [
        { rowNumber: 17, data: { tutar: 40000 } },
        { rowNumber: 18, data: { tutar: 60000 } },
        { rowNumber: 33, data: { tutar: 999999 } }, // Topluma Hizmet Giderleri - grey row, excluded
        { rowNumber: 34, data: { isSummary: true } }
      ];
      const res = formulaEngineService.calculateFinans(rows);
      assert.strictEqual(res.totals.toplamGider, 100000, 'Toplam Gider must sum only rows 17..32 (excluding row 33)');
      const row34 = res.rows.find(r => r.rowNumber === 34);
      assert.strictEqual(row34.data.tutar, 100000);
    });

    it('1.5 Cash difference alert triggers on imbalance (Toplam Gelir != Toplam Gider)', () => {
      const rows = [
        { rowNumber: 1, data: { tutar: 100000 } },
        { rowNumber: 17, data: { tutar: 80000 } }
      ];
      const res = formulaEngineService.calculateFinans(rows);
      assert.strictEqual(res.totals.isBalanced, false);
      assert.strictEqual(res.totals.status, 'Gelir Gider Arasında Kasa Farkı Var');
      assert.strictEqual(res.totals.kasaFarki, 20000);
      assert.ok(res.warnings.length > 0, 'Must produce cash difference warning');
      assert.strictEqual(res.warnings[0].field, 'kasaFarki');
    });

    it('1.6 Cash difference confirms "Tamam" when balanced (Toplam Gelir == Toplam Gider)', () => {
      const rows = [
        { rowNumber: 1, data: { tutar: 100000 } },
        { rowNumber: 17, data: { tutar: 100000 } }
      ];
      const res = formulaEngineService.calculateFinans(rows);
      assert.strictEqual(res.totals.isBalanced, true);
      assert.strictEqual(res.totals.status, 'Tamam');
      assert.strictEqual(res.totals.kasaFarki, 0);
      assert.strictEqual(res.warnings.length, 0);
    });
  });

  // =========================================================================
  // 2. ENERJI CHALLENGES
  // =========================================================================
  describe('Challenge 2: ENERJI Discrepancy Warnings & Aggregations', () => {
    it('2.1 Discrepancy warning triggers when unit consumption != activity consumption', () => {
      const rows = [
        { rowNumber: 1, data: { elektrik: 1000, su: 500 } }, // Unit row
        { rowNumber: 9, data: { elektrik: 800, su: 500 } }   // Activity row: elektrik mismatch (800 != 1000)
      ];
      const res = formulaEngineService.calculateEnerji(rows);
      assert.strictEqual(res.totals.isEqual, false);
      assert.ok(
        res.totals.status.includes('UYARI: Birim Tüketim Toplamı'),
        'Status must contain discrepancy warning'
      );
      assert.ok(res.warnings.length > 0, 'Warnings must contain at least one mismatch warning');
      assert.strictEqual(res.warnings[0].field, 'elektrik');
    });

    it('2.2 Status outputs "UYUMLU" when unit consumption == activity consumption', () => {
      const rows = [
        { rowNumber: 1, data: { elektrik: 500, su: 200 } },
        { rowNumber: 2, data: { elektrik: 500, su: 300 } },
        { rowNumber: 9, data: { elektrik: 1000, su: 500 } }
      ];
      const res = formulaEngineService.calculateEnerji(rows);
      assert.strictEqual(res.totals.isEqual, true);
      assert.strictEqual(res.totals.status, 'UYUMLU');
      assert.strictEqual(res.warnings.length, 0);
    });

    it('2.3 Row 8 auto-sums rows 1..7 (unit consumption)', () => {
      const rows = [
        { rowNumber: 1, data: { elektrik: 100, su: 10 } },
        { rowNumber: 3, data: { elektrik: 200, su: 20 } },
        { rowNumber: 7, data: { elektrik: 300, su: 30 } },
        { rowNumber: 8, data: { isSummary: true } }
      ];
      const res = formulaEngineService.calculateEnerji(rows);
      const row8 = res.rows.find(r => r.rowNumber === 8);
      assert.strictEqual(row8.data.elektrik, 600);
      assert.strictEqual(row8.data.su, 60);
    });

    it('2.4 Row 16 auto-sums rows 9..15 (activity consumption)', () => {
      const rows = [
        { rowNumber: 9, data: { elektrik: 250, su: 25 } },
        { rowNumber: 12, data: { elektrik: 150, su: 15 } },
        { rowNumber: 15, data: { elektrik: 100, su: 10 } },
        { rowNumber: 16, data: { isSummary: true } }
      ];
      const res = formulaEngineService.calculateEnerji(rows);
      const row16 = res.rows.find(r => r.rowNumber === 16);
      assert.strictEqual(row16.data.elektrik, 500);
      assert.strictEqual(row16.data.su, 50);
    });
  });

  // =========================================================================
  // 3. KARBON_AYAKIZI CHALLENGES
  // =========================================================================
  describe('Challenge 3: KARBON_AYAKIZI Emission Factors & Indicators', () => {
    it('3.1 Verifies individual authentic emission factors: Doğalgaz=2, Kömür=2460, Dizel=11.5, Benzin=9.5, FuelOil=3150', () => {
      // Test each fuel type in isolation
      const testDogalgaz = formulaEngineService.calculateKarbonAyakizi([
        { rowNumber: 1, data: { dogalgaz: 100, komur: 0, dizel: 0, benzin: 0, fuelOil: 0 } }
      ]);
      assert.strictEqual(testDogalgaz.totals.totalEmissions, 200.0, 'Doğalgaz factor must be 2.0 (100 * 2 = 200)');

      const testKomur = formulaEngineService.calculateKarbonAyakizi([
        { rowNumber: 1, data: { dogalgaz: 0, komur: 2, dizel: 0, benzin: 0, fuelOil: 0 } }
      ]);
      assert.strictEqual(testKomur.totals.totalEmissions, 4920.0, 'Kömür factor must be 2460.0 (2 * 2460 = 4920)');

      const testDizel = formulaEngineService.calculateKarbonAyakizi([
        { rowNumber: 1, data: { dogalgaz: 0, komur: 0, dizel: 10, benzin: 0, fuelOil: 0 } }
      ]);
      assert.strictEqual(testDizel.totals.totalEmissions, 115.0, 'Dizel factor must be 11.5 (10 * 11.5 = 115)');

      const testBenzin = formulaEngineService.calculateKarbonAyakizi([
        { rowNumber: 1, data: { dogalgaz: 0, komur: 0, dizel: 0, benzin: 10, fuelOil: 0 } }
      ]);
      assert.strictEqual(testBenzin.totals.totalEmissions, 95.0, 'Benzin factor must be 9.5 (10 * 9.5 = 95)');

      const testFuelOil = formulaEngineService.calculateKarbonAyakizi([
        { rowNumber: 1, data: { dogalgaz: 0, komur: 0, dizel: 0, benzin: 0, fuelOil: 2 } }
      ]);
      assert.strictEqual(testFuelOil.totals.totalEmissions, 6300.0, 'FuelOil factor must be 3150.0 (2 * 3150 = 6300)');
    });

    it('3.2 Computes composite carbon footprint formula and metric tonnes conversion', () => {
      const rows = [
        { rowNumber: 1, data: { dogalgaz: 500, komur: 1, dizel: 20, benzin: 10, fuelOil: 0.5 } }
      ];
      // 500*2 + 1*2460 + 20*11.5 + 10*9.5 + 0.5*3150 = 1000 + 2460 + 230 + 95 + 1575 = 5360
      const res = formulaEngineService.calculateKarbonAyakizi(rows);
      assert.strictEqual(res.totals.totalEmissions, 5360);
      assert.strictEqual(res.totals.totalTonnesCO2e, 5.36);
    });
  });

  // =========================================================================
  // 4. MEMNUNIYET_ANKETI CHALLENGES
  // =========================================================================
  describe('Challenge 4: MEMNUNIYET_ANKETI Normalization & Scale Constraints', () => {
    it('4.1 Scale normalization: scale 5 -> score * 20', () => {
      const rows = [{ rowNumber: 1, data: { olcumSkalasi: 5, ortalamaAnketPuani: 4.5 } }];
      const res = formulaEngineService.calculateMemnuniyetAnketi(rows);
      assert.strictEqual(res.rows[0].data.normalizeAnketPuani, 90.0);
    });

    it('4.2 Scale normalization: scale 10 -> score * 10', () => {
      const rows = [{ rowNumber: 1, data: { olcumSkalasi: 10, ortalamaAnketPuani: 7.8 } }];
      const res = formulaEngineService.calculateMemnuniyetAnketi(rows);
      assert.strictEqual(res.rows[0].data.normalizeAnketPuani, 78.0);
    });

    it('4.3 Scale normalization: scale 100 -> score * 1', () => {
      const rows = [{ rowNumber: 1, data: { olcumSkalasi: 100, ortalamaAnketPuani: 88.5 } }];
      const res = formulaEngineService.calculateMemnuniyetAnketi(rows);
      assert.strictEqual(res.rows[0].data.normalizeAnketPuani, 88.5);
    });

    it('4.4 Score > scale MUST be rejected (e.g. score 6 on 5-scale, score 12 on 10-scale)', () => {
      const invalidRows = [
        { rowNumber: 1, data: { olcumSkalasi: 5, ortalamaAnketPuani: 6 } }
      ];
      const res = formulaEngineService.preSaveHook('MEMNUNIYET_ANKETI', { rows: invalidRows });
      assert.strictEqual(
        res.isValid,
        false,
        'preSaveHook MUST reject ortalamaAnketPuani exceeding olcumSkalasi (score 6 > scale 5)'
      );
      assert.ok(
        res.errors && res.errors.length > 0,
        'Expected validation error when score exceeds scale'
      );
    });

    it('4.5 Negative scores MUST be rejected', () => {
      const invalidRows = [
        { rowNumber: 1, data: { olcumSkalasi: 5, ortalamaAnketPuani: -1 } }
      ];
      const res = formulaEngineService.preSaveHook('MEMNUNIYET_ANKETI', { rows: invalidRows });
      assert.strictEqual(
        res.isValid,
        false,
        'preSaveHook MUST reject negative survey scores'
      );
    });
  });

  // =========================================================================
  // 5. PROJELER CHALLENGES
  // =========================================================================
  describe('Challenge 5: PROJELER Budget Reconciliation Formula', () => {
    it('5.1 Budget check outputs "Bütçeleri Kontrol Et" when Column Q != SUM(AE..AM)', () => {
      const rows = [
        {
          rowNumber: 1,
          data: {
            butcesiTl: 1000000,
            merkeziYatirimButcesi: 300000,
            tubitak: 500000 // Total breakdown = 800000 != 1000000
          }
        }
      ];
      const res = formulaEngineService.calculateProjeler(rows);
      const row = res.rows[0].data;
      assert.strictEqual(row.breakdownSum, 800000);
      assert.strictEqual(row.butceDurumu, 'Bütçeleri Kontrol Et');
    });

    it('5.2 Budget check outputs "Bütçe Tamam" when Column Q == SUM(AE..AM)', () => {
      const rows = [
        {
          rowNumber: 1,
          data: {
            butcesiTl: 1000000,
            merkeziYatirimButcesi: 200000,
            donerSermaye: 100000,
            tubitak: 400000,
            ulusalKamu: 100000,
            uluslararasiFonlar: 200000 // Total = 1000000 == 1000000
          }
        }
      ];
      const res = formulaEngineService.calculateProjeler(rows);
      const row = res.rows[0].data;
      assert.strictEqual(row.breakdownSum, 1000000);
      assert.strictEqual(row.butceDurumu, 'Bütçe Tamam');
    });

    it('5.3 Float rounding precision handles sub-cent discrepancies gracefully', () => {
      const rows = [
        {
          rowNumber: 1,
          data: {
            butcesiTl: 333.33,
            tubitak: 111.11,
            donerSermaye: 111.11,
            merkeziYatirimButcesi: 111.11
          }
        }
      ];
      const res = formulaEngineService.calculateProjeler(rows);
      const row = res.rows[0].data;
      assert.strictEqual(row.butceDurumu, 'Bütçe Tamam');
    });
  });

  // =========================================================================
  // 6. OGRENCI_TOPLULUKLARI KVKK PRIVACY CHALLENGES
  // =========================================================================
  describe('Challenge 6: OGRENCI_TOPLULUKLARI KVKK Privacy Anonymization', () => {
    it('6.1 Disabled member count = 1 MUST be rejected with KVKK_PRIVACY_VIOLATION', () => {
      const check = formulaEngineService.validateKVKKDisabledMember(1);
      assert.strictEqual(check.isValid, false);
      assert.strictEqual(check.code, 'KVKK_PRIVACY_VIOLATION');
      assert.ok(check.message.includes('KVKK'));

      const hookRes = formulaEngineService.preSaveHook('OGRENCI_TOPLULUKLARI', {
        rows: [{ rowNumber: 1, data: { toplulukAdi: 'Kulüp A', engelliUyeSayisi: 1 } }]
      });
      assert.strictEqual(hookRes.isValid, false);
      assert.strictEqual(hookRes.errors[0].code, 'KVKK_PRIVACY_VIOLATION');
    });

    it('6.2 Disabled member count = 2 MUST be rejected with KVKK_PRIVACY_VIOLATION', () => {
      const check = formulaEngineService.validateKVKKDisabledMember(2);
      assert.strictEqual(check.isValid, false);
      assert.strictEqual(check.code, 'KVKK_PRIVACY_VIOLATION');

      const hookRes = formulaEngineService.preSaveHook('OGRENCI_TOPLULUKLARI', {
        rows: [{ rowNumber: 1, data: { toplulukAdi: 'Kulüp B', engelliUyeSayisi: 2 } }]
      });
      assert.strictEqual(hookRes.isValid, false);
      assert.strictEqual(hookRes.errors[0].code, 'KVKK_PRIVACY_VIOLATION');
    });

    it('6.3 Disabled member count = 0 is accepted', () => {
      const check = formulaEngineService.validateKVKKDisabledMember(0);
      assert.strictEqual(check.isValid, true);
      assert.strictEqual(check.value, 0);

      const hookRes = formulaEngineService.preSaveHook('OGRENCI_TOPLULUKLARI', {
        rows: [{ rowNumber: 1, data: { toplulukAdi: 'Kulüp C', engelliUyeSayisi: 0 } }]
      });
      assert.strictEqual(hookRes.isValid, true);
    });

    it('6.4 Disabled member count = null, undefined, or empty string is accepted', () => {
      assert.strictEqual(formulaEngineService.validateKVKKDisabledMember(null).isValid, true);
      assert.strictEqual(formulaEngineService.validateKVKKDisabledMember(undefined).isValid, true);
      assert.strictEqual(formulaEngineService.validateKVKKDisabledMember('').isValid, true);
    });

    it('6.5 Disabled member count >= 3 is accepted (e.g. 3, 5, 50)', () => {
      for (const val of [3, 5, 20, 100]) {
        const check = formulaEngineService.validateKVKKDisabledMember(val);
        assert.strictEqual(check.isValid, true);
        assert.strictEqual(check.value, val);
      }
    });

    it('6.6 Negative or non-integer disabled member count is rejected', () => {
      assert.strictEqual(formulaEngineService.validateKVKKDisabledMember(-1).isValid, false);
      assert.strictEqual(formulaEngineService.validateKVKKDisabledMember(3.5).isValid, false);
      assert.strictEqual(formulaEngineService.validateKVKKDisabledMember('abc').isValid, false);
    });
  });

  // =========================================================================
  // 7. EGITICILERIN_EGITIMI DURATION REGEX CHALLENGES
  // =========================================================================
  describe('Challenge 7: EGITICILERIN_EGITIMI Duration Regex Validation', () => {
    it('7.1 Valid duration strings matching `<Sayı> Saat|Gün|Hafta` are accepted and normalized', () => {
      const validCases = [
        { input: '3 Saat', expectedNum: 3, expectedUnit: 'Saat' },
        { input: '2 Gün', expectedNum: 2, expectedUnit: 'Gün' },
        { input: '1 Hafta', expectedNum: 1, expectedUnit: 'Hafta' },
        { input: '10 saat', expectedNum: 10, expectedUnit: 'Saat' },
        { input: '5 gün', expectedNum: 5, expectedUnit: 'Gün' },
        { input: '4 hafta', expectedNum: 4, expectedUnit: 'Hafta' },
        { input: '  12   Saat  ', expectedNum: 12, expectedUnit: 'Saat' }
      ];

      for (const tc of validCases) {
        const res = formulaEngineService.validateDuration(tc.input);
        assert.strictEqual(res.isValid, true, `Input "${tc.input}" should be valid`);
        assert.strictEqual(res.value, tc.expectedNum);
        assert.strictEqual(res.unit, tc.expectedUnit);
      }
    });

    it('7.2 Invalid duration formats are strictly rejected', () => {
      const invalidCases = [
        '45 Dakika', // Dakika not permitted
        '3 Ay',      // Ay not permitted
        '1 Yıl',     // Yıl not permitted
        'abc',       // non-numeric
        '',          // empty
        'Saat',      // missing number
        '10',        // missing unit
        '-5 Saat'    // negative number
      ];

      for (const input of invalidCases) {
        const res = formulaEngineService.validateDuration(input);
        assert.strictEqual(res.isValid, false, `Input "${input}" should be invalid`);
      }
    });
  });

  // =========================================================================
  // 8. HTTP ENDPOINT VERIFICATION (POST /api/records/:templateCode/calculate)
  // =========================================================================
  describe('Challenge 8: HTTP Endpoint Verification', () => {
    it('8.1 POST /api/records/FINANS/calculate returns authoritative live calculations', async () => {
      const res = await request(app)
        .post('/api/records/FINANS/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rows: [
            { rowNumber: 1, data: { tutar: 200000 } },
            { rowNumber: 13, data: { tutar: 50000 } }, // grey row
            { rowNumber: 17, data: { tutar: 150000 } },
            { rowNumber: 32, data: { tutar: 50000 } }
          ]
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.totals.toplamGelir, 200000);
      assert.strictEqual(res.body.data.totals.toplamGider, 200000);
      assert.strictEqual(res.body.data.totals.isBalanced, true);
    });

    it('8.2 POST /api/records/ENERJI/calculate triggers discrepancy warning over HTTP', async () => {
      const res = await request(app)
        .post('/api/records/ENERJI/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rows: [
            { rowNumber: 1, data: { elektrik: 800, su: 200 } },
            { rowNumber: 9, data: { elektrik: 700, su: 200 } }
          ]
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.totals.isEqual, false);
      assert.ok(res.body.data.warnings.length > 0);
    });

    it('8.3 POST /api/records/KARBON_AYAKIZI/calculate computes footprint over HTTP', async () => {
      const res = await request(app)
        .post('/api/records/KARBON_AYAKIZI/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rows: [
            { rowNumber: 1, data: { dogalgaz: 100, komur: 1, dizel: 10, benzin: 10, fuelOil: 1 } }
          ]
        });

      // 100*2 + 1*2460 + 10*11.5 + 10*9.5 + 1*3150 = 200 + 2460 + 115 + 95 + 3150 = 6020
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.totals.totalEmissions, 6020);
    });

    it('8.4 POST /api/records/OGRENCI_TOPLULUKLARI HTTP endpoint enforces KVKK rule (blocks disabled member count = 1)', async () => {
      const res = await request(app)
        .post('/api/records/OGRENCI_TOPLULUKLARI')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentId: cengDept._id.toString(),
          period: '2025-2026',
          rows: [
            { rowNumber: 1, data: { toplulukAdi: 'Siber Kulübü', engelliUyeSayisi: 1 } }
          ]
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.errors.some(e => e.code === 'KVKK_PRIVACY_VIOLATION'));
    });

    it('8.5 POST /api/records/EGITICILERIN_EGITIMI HTTP endpoint enforces duration regex (blocks "45 Dakika")', async () => {
      const res = await request(app)
        .post('/api/records/EGITICILERIN_EGITIMI')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentId: cengDept._id.toString(),
          period: '2025-2026',
          rows: [
            { rowNumber: 1, data: { egitiminAdi: 'Seminer', egitiminSuresi: '45 Dakika' } }
          ]
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.errors.some(e => e.field === 'egitiminSuresi'));
    });

    it('8.6 POST /api/records/FINANS HTTP endpoint MUST reject negative values in row 1', async () => {
      const res = await request(app)
        .post('/api/records/FINANS')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentId: cengDept._id.toString(),
          period: '2025-2026',
          rows: [
            { rowNumber: 1, data: { tutar: -5000 } }
          ]
        });

      assert.strictEqual(res.status, 400, 'POST /api/records/FINANS must return 400 when row 1 has negative tutar');
      assert.strictEqual(res.body.success, false);
    });

    it('8.7 POST /api/records/MEMNUNIYET_ANKETI HTTP endpoint MUST reject score exceeding scale', async () => {
      const res = await request(app)
        .post('/api/records/MEMNUNIYET_ANKETI')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentId: cengDept._id.toString(),
          period: '2025-2026',
          rows: [
            {
              rowNumber: 1,
              data: {
                anketAdi: 'Öğrenci Memnuniyeti',
                anketTarihi: '2025-05-15',
                hedefKitle: 'Öğrenciler',
                anketiDuzenleyen: 'Üniversite',
                anketKapsami: 'Üniversite',
                katilimciSayisi: 500,
                olcumSkalasi: 5,
                ortalamaAnketPuani: 7.5 // Invalid: 7.5 > 5
              }
            }
          ]
        });

      assert.strictEqual(res.status, 400, 'POST /api/records/MEMNUNIYET_ANKETI must return 400 when score > scale');
      assert.strictEqual(res.body.success, false);
    });
  });
});
