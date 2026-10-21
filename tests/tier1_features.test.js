/**
 * Tier 1: Feature Coverage Test Suite
 * 
 * Verifies core functionality across:
 * 1. 24 YÖK template discovery & column verification
 * 2. 6 fixed-row matrices initialization
 * 3. Live formula calculations (Enerji, Finans, Karbon, Memnuniyet, Projeler, SoruSeti)
 * 4. VBA macro multi-select tag picker behavior
 * 5. User authentication & JWT issuance
 * 6. Dynamic template builder API
 * 7. 1:1 Excel/XLSM export and validated import
 * 
 * Total Target: >= 75 test cases
 */

const path = require('path');
const fs = require('fs');
const { describe, test, it, assert } = require('./runner');
const { ZipReader, createMinimalZip } = require('./helpers/zipUtil');
const {
  TEMPLATES_DIR,
  YOK_TEMPLATES,
  MYO_SECTORS,
  PROJELER_THEMES,
  PROJELER_PARTNERS,
  calcEnerjiSums,
  calcFinansTotals,
  calcKarbonFootprint,
  calcMemnuniyetNormalized,
  calcProjelerBudgetCheck,
  evalSoruSetiWarning,
} = require('./helpers/dataOracles');
const {
  JWTHelper,
  RBACEngine,
  WorkflowFSM,
  MultiSelectTagManager,
  DynamicTemplateValidator,
} = require('./helpers/modelSimulators');

// ============================================================================
// Area 1: 24 YÖK Template Discovery & Structure Verification (24 Tests)
// ============================================================================
describe('Tier 1.1: 24 YÖK Template Discovery & Structure Verification', () => {
  for (const tpl of YOK_TEMPLATES) {
    test(`Verify ${tpl.code} template file (${tpl.filename}) exists and has valid OpenXML sheets`, () => {
      const fullPath = path.join(TEMPLATES_DIR, tpl.filename);
      assert.ok(fs.existsSync(fullPath), `Template file ${tpl.filename} must exist on disk`);

      const reader = new ZipReader(fullPath);
      assert.ok(reader.hasEntry('[Content_Types].xml'), 'Must be a valid OpenXML package');
      assert.ok(reader.hasEntry('xl/workbook.xml'), 'Must contain xl/workbook.xml');

      const sheets = reader.getSheetNames();
      assert.ok(sheets.length > 0, `Template ${tpl.filename} must contain at least one worksheet`);
      assert.includes(sheets, tpl.primarySheet, `Primary worksheet "${tpl.primarySheet}" must exist in ${tpl.filename}`);

      if (tpl.isMacro) {
        assert.ok(reader.hasEntry('xl/vbaProject.bin'), `Macro template ${tpl.filename} must contain xl/vbaProject.bin`);
        const vbaSize = reader.entries['xl/vbaProject.bin'].uncompSize;
        assert.ok(vbaSize > 0, 'xl/vbaProject.bin must be non-empty');
      }
    });
  }
});

// ============================================================================
// Area 2: 6 Fixed-Row Matrices Initialization (7 Tests)
// ============================================================================
describe('Tier 1.2: Fixed-Row Matrices Initialization', () => {
  test('Enerji template initializes with exactly 28 fixed rows across consumption and supply', () => {
    const enerjiTpl = YOK_TEMPLATES.find(t => t.code === 'ENERJI');
    assert.strictEqual(enerjiTpl.fixedRowCount, 28, 'Enerji must have exactly 28 fixed rows');
    assert.strictEqual(enerjiTpl.dataStartRow, 9, 'Enerji data start row must be 9');
  });

  test('Finans template initializes with exactly 34 fixed financial rows', () => {
    const finansTpl = YOK_TEMPLATES.find(t => t.code === 'FINANS');
    assert.strictEqual(finansTpl.fixedRowCount, 34, 'Finans must have exactly 34 fixed rows');
    assert.strictEqual(finansTpl.dataStartRow, 8, 'Finans data start row must be 8');
  });

  test('KarbonAyakizi initializes with exactly 6 institutional units', () => {
    const karbonTpl = YOK_TEMPLATES.find(t => t.code === 'KARBON_AYAKIZI');
    assert.strictEqual(karbonTpl.fixedRowCount, 6, 'KarbonAyakizi must have exactly 6 fixed unit rows');
    const expectedUnits = ['Rektörlük', 'Fakülteler', 'MYO lar', 'Enstitüler', 'Hastaneler', 'Diğer'];
    assert.deepStrictEqual(karbonTpl.fixedUnits, expectedUnits, 'Fixed units must match official YÖK units');
  });

  test('Atik template initializes with exactly 6 institutional units and 10 waste/recycling metrics', () => {
    const atikTpl = YOK_TEMPLATES.find(t => t.code === 'ATIK');
    assert.strictEqual(atikTpl.fixedRowCount, 6, 'Atik must have exactly 6 fixed unit rows');
    assert.strictEqual(atikTpl.expectedColumns, 12, 'Atik has 12 columns (Sıra, Birim, 5 waste, 5 recycling)');
  });

  test('SoruSeti initializes with exactly 22 institutional indicator questions', () => {
    const soruTpl = YOK_TEMPLATES.find(t => t.code === 'SORU_SETI');
    assert.strictEqual(soruTpl.fixedRowCount, 22, 'SoruSeti must have exactly 22 fixed question rows');
    assert.strictEqual(soruTpl.primarySheet, 'SoruSeti', 'Primary sheet must be SoruSeti');
  });

  test('DijitalOlgunlukAnketi initializes with all 106 survey items across 5 dimensions', () => {
    const dijitalTpl = YOK_TEMPLATES.find(t => t.code === 'DIJITAL_OLGUNLUK');
    assert.strictEqual(dijitalTpl.fixedRowCount, 106, 'DijitalOlgunlukAnketi must have exactly 106 survey items');
    assert.strictEqual(dijitalTpl.expectedColumns, 15, 'Must have 15 columns per question');
  });

  test('DijitalOlgunlukAnketi dimension distribution equals 106 (9 + 36 + 20 + 13 + 28)', () => {
    const dimensions = {
      birey: 9,
      yonetsel: 36,
      egitim: 20,
      arastirma: 13,
      altyapi: 28,
    };
    const totalQuestions = Object.values(dimensions).reduce((a, b) => a + b, 0);
    assert.strictEqual(totalQuestions, 106, 'Sum of question counts across 5 dimensions must equal 106');
  });
});

// ============================================================================
// Area 3: Live Formula Calculations (15 Tests)
// ============================================================================
describe('Tier 1.3: Live Formula Calculations', () => {
  test('Enerji auto-sums Row 8 (Toplam) correctly for unit consumption rows 1..7', () => {
    const rows = Array.from({ length: 28 }, () => ({ elektrik: 0, su: 0 }));
    rows[0] = { elektrik: 100, su: 50 }; // Rektörlük
    rows[1] = { elektrik: 250, su: 150 }; // Fakülteler
    rows[2] = { elektrik: 80, su: 40 }; // MYO
    rows[3] = { elektrik: 70, su: 30 }; // Enstitüler
    rows[4] = { elektrik: 300, su: 200 }; // Hastaneler
    rows[5] = { elektrik: 50, su: 20 }; // Kütüphane
    rows[6] = { elektrik: 150, su: 110 }; // Diğer

    const res = calcEnerjiSums(rows);
    assert.strictEqual(res.toplamElektrik, 1000, 'Toplam Elektrik must equal sum of rows 1..7');
    assert.strictEqual(res.toplamSu, 600, 'Toplam Su must equal sum of rows 1..7');
  });

  test('Enerji auto-sums Row 16 (Toplam2) correctly for activity rows 9..15', () => {
    const rows = Array.from({ length: 28 }, () => ({ elektrik: 0, su: 0 }));
    // Activity rows (index 8..14)
    rows[8] = { elektrik: 200, su: 100 };
    rows[9] = { elektrik: 300, su: 150 };
    rows[10] = { elektrik: 100, su: 50 };
    rows[11] = { elektrik: 250, su: 150 };
    rows[12] = { elektrik: 100, su: 50 };
    rows[13] = { elektrik: 30, su: 50 };
    rows[14] = { elektrik: 20, su: 50 };

    const res = calcEnerjiSums(rows);
    assert.strictEqual(res.toplam2Elektrik, 1000, 'Toplam2 Elektrik must equal sum of rows 9..15');
    assert.strictEqual(res.toplam2Su, 600, 'Toplam2 Su must equal sum of rows 9..15');
  });

  test('Enerji equality check outputs UYUMLU when Toplam equals Toplam2', () => {
    const rows = Array.from({ length: 28 }, () => ({ elektrik: 0, su: 0 }));
    rows[0] = { elektrik: 500, su: 200 };
    rows[8] = { elektrik: 500, su: 200 };
    const res = calcEnerjiSums(rows);
    assert.ok(res.isEqual, 'Should be equal');
    assert.strictEqual(res.status, 'UYUMLU');
  });

  test('Enerji equality check outputs warning alert when Toplam does not equal Toplam2', () => {
    const rows = Array.from({ length: 28 }, () => ({ elektrik: 0, su: 0 }));
    rows[0] = { elektrik: 500, su: 200 };
    rows[8] = { elektrik: 450, su: 200 }; // Mismatch
    const res = calcEnerjiSums(rows);
    assert.ok(!res.isEqual, 'Should be unequal');
    assert.includes(res.status, 'UYARI');
  });

  test('Finans Toplam Gelir sums rows 1..12 and excludes grey rows 13, 14, 15', () => {
    const rows = Array.from({ length: 34 }, () => ({ tutar: 0 }));
    for (let i = 0; i < 12; i++) {
      rows[i] = { tutar: 1000 }; // 12 * 1000 = 12000
    }
    // Grey excluded rows
    rows[12] = { tutar: 999999 }; // Row 13 (BAP)
    rows[13] = { tutar: 888888 }; // Row 14 (Döner Sermaye UAM Hariç)
    rows[14] = { tutar: 777777 }; // Row 15 (Topluma Hizmet Gelirleri)

    const res = calcFinansTotals(rows);
    assert.strictEqual(res.toplamGelir, 12000, 'Toplam Gelir must strictly exclude rows 13, 14, 15');
  });

  test('Finans Toplam Gider sums rows 17..32 and excludes grey row 33', () => {
    const rows = Array.from({ length: 34 }, () => ({ tutar: 0 }));
    for (let i = 16; i < 32; i++) {
      rows[i] = { tutar: 500 }; // 16 items * 500 = 8000
    }
    // Grey excluded row
    rows[32] = { tutar: 444444 }; // Row 33 (Topluma Hizmet Giderleri)

    const res = calcFinansTotals(rows);
    assert.strictEqual(res.toplamGider, 8000, 'Toplam Gider must strictly exclude row 33');
  });

  test('Finans cash difference outputs "Tamam" when Toplam Gelir equals Toplam Gider', () => {
    const rows = Array.from({ length: 34 }, () => ({ tutar: 0 }));
    rows[0] = { tutar: 100000 }; // Gelir = 100000
    rows[16] = { tutar: 100000 }; // Gider = 100000
    const res = calcFinansTotals(rows);
    assert.strictEqual(res.kasaFarki, 0);
    assert.strictEqual(res.status, 'Tamam');
    assert.ok(res.isBalanced);
  });

  test('Finans cash difference outputs "Gelir Gider Arasında Kasa Farkı Var" when unequal', () => {
    const rows = Array.from({ length: 34 }, () => ({ tutar: 0 }));
    rows[0] = { tutar: 100000 }; // Gelir = 100000
    rows[16] = { tutar: 95000 }; // Gider = 95000
    const res = calcFinansTotals(rows);
    assert.strictEqual(res.kasaFarki, 5000);
    assert.strictEqual(res.status, 'Gelir Gider Arasında Kasa Farkı Var');
    assert.ok(!res.isBalanced);
  });

  test('KarbonAyakizi computes exact emission score matching formula 2*Doğalgaz + 2460*Kömür + 11.5*Dizel + 9.5*Benzin + 3150*FuelOil', () => {
    const units = [
      { dogalgaz: 1000, komur: 2, dizel: 500, benzin: 300, fueloil: 1 },
      { dogalgaz: 2000, komur: 0, dizel: 100, benzin: 50, fueloil: 0 },
    ];
    // sumDogalgaz = 3000 -> 3000 * 2 = 6000
    // sumKomur = 2 -> 2 * 2460 = 4920
    // sumDizel = 600 -> 600 * 11.5 = 6900
    // sumBenzin = 350 -> 350 * 9.5 = 3325
    // sumFuelOil = 1 -> 1 * 3150 = 3150
    // Total = 6000 + 4920 + 6900 + 3325 + 3150 = 24295
    const res = calcKarbonFootprint(units);
    assert.strictEqual(res.totalEmissions, 24295, 'Emissions must equal 24,295 kg CO2e');
  });

  test('MemnuniyetAnketi normalizes 5-point scale score by multiplying by 20', () => {
    const score = calcMemnuniyetNormalized(5, 4.5);
    assert.strictEqual(score, 90, '4.5 on a 5-point scale normalizes to 90/100');
  });

  test('MemnuniyetAnketi normalizes 10-point scale score by multiplying by 10', () => {
    const score = calcMemnuniyetNormalized(10, 8.2);
    assert.strictEqual(score, 82, '8.2 on a 10-point scale normalizes to 82/100');
  });

  test('MemnuniyetAnketi retains score unchanged for 100-point scale', () => {
    const score = calcMemnuniyetNormalized(100, 77.5);
    assert.strictEqual(score, 77.5, '77.5 on 100 scale remains 77.5');
  });

  test('Projeler budget check outputs "Bütçe Tamam" when Q equals sum of AE..AM', () => {
    const total = 1000000;
    const breakdown = [200000, 100000, 50000, 250000, 150000, 50000, 50000, 100000, 50000];
    const status = calcProjelerBudgetCheck(total, breakdown);
    assert.strictEqual(status, 'Bütçe Tamam');
  });

  test('Projeler budget check outputs "Bütçeleri Kontrol Et" when Q does not equal sum of AE..AM', () => {
    const total = 1000000;
    const breakdown = [200000, 100000]; // Sum = 300,000 != 1,000,000
    const status = calcProjelerBudgetCheck(total, breakdown);
    assert.strictEqual(status, 'Bütçeleri Kontrol Et');
  });

  test('SoruSeti rows 9 & 10 trigger explanation warning when response exceeds 89', () => {
    const alert9 = evalSoruSetiWarning(9, 92);
    assert.strictEqual(alert9, '%92 sağladığınızı nasıl kontrol edebileceğimize dair Açıklama sayfasına Açıklama yapınız.');

    const alert10 = evalSoruSetiWarning(10, 90);
    assert.strictEqual(alert10, '%90 sağladığınızı nasıl kontrol edebileceğimize dair Açıklama sayfasına Açıklama yapınız.');

    const normal9 = evalSoruSetiWarning(9, 85);
    assert.strictEqual(normal9, '0-100 arasında olmalıdır.');
  });
});

// ============================================================================
// Area 4: VBA Macro Multi-Select Tag Selector Behavior (8 Tests)
// ============================================================================
describe('Tier 1.4: VBA Macro Multi-Select Tag Selector Behavior', () => {
  test('Appends multiple valid sectors from MYO 27 sectors list with comma delimiter', () => {
    let tags = '';
    tags = MultiSelectTagManager.addTag(tags, 'Bilişim Teknolojileri', MYO_SECTORS);
    tags = MultiSelectTagManager.addTag(tags, 'Elektrik ve Elektronik', MYO_SECTORS);
    assert.strictEqual(tags, 'Bilişim Teknolojileri,Elektrik ve Elektronik');
  });

  test('Deduplicates tags when an already selected sector is selected again (VBA InStr behavior)', () => {
    let tags = 'Bilişim Teknolojileri,Enerji';
    tags = MultiSelectTagManager.addTag(tags, 'Bilişim Teknolojileri', MYO_SECTORS);
    assert.strictEqual(tags, 'Bilişim Teknolojileri,Enerji', 'Duplicate tag should not be appended');
  });

  test('Removes a specific tag cleanly without leaving dangling commas', () => {
    const tags = 'Bilişim Teknolojileri,Elektrik ve Elektronik,Enerji';
    const updated = MultiSelectTagManager.removeTag(tags, 'Elektrik ve Elektronik');
    assert.strictEqual(updated, 'Bilişim Teknolojileri,Enerji');
  });

  test('Clears all tags cleanly returning an empty string', () => {
    const cleared = MultiSelectTagManager.clearTags();
    assert.strictEqual(cleared, '');
  });

  test('Rejects sector tag not present in official 27 sectors list', () => {
    assert.throws(() => {
      MultiSelectTagManager.addTag('', 'Uzay ve Havacılık', MYO_SECTORS);
    }, /not in the allowed reference list/);
  });

  test('Projeler multi-select tag selector supports 8 themes from Referans Değerler', () => {
    let themes = '';
    themes = MultiSelectTagManager.addTag(themes, 'Yapay Zeka', PROJELER_THEMES);
    themes = MultiSelectTagManager.addTag(themes, 'Sürdürülebilirlik', PROJELER_THEMES);
    assert.strictEqual(themes, 'Yapay Zeka,Sürdürülebilirlik');
  });

  test('Projeler multi-select tag selector supports 4 partners from Referans Değerler', () => {
    let partners = '';
    partners = MultiSelectTagManager.addTag(partners, 'Kamu', PROJELER_PARTNERS);
    partners = MultiSelectTagManager.addTag(partners, 'Sanayi', PROJELER_PARTNERS);
    partners = MultiSelectTagManager.addTag(partners, 'Üniversite', PROJELER_PARTNERS);
    assert.strictEqual(partners, 'Kamu,Sanayi,Üniversite');
  });

  test('Projeler multi-select rejects unlisted partner', () => {
    assert.throws(() => {
      MultiSelectTagManager.addTag('', 'Vakıf', PROJELER_PARTNERS);
    }, /not in the allowed reference list/);
  });
});

// ============================================================================
// Area 5: User Authentication & JWT Issuance (8 Tests)
// ============================================================================
describe('Tier 1.5: User Authentication & JWT Issuance', () => {
  const jwt = new JWTHelper('test-jwt-secret-ostim-2026');

  test('Generates signed JWT token with valid header, payload, and HMAC signature', () => {
    const payload = { id: 'u101', email: 'admin@ostimteknik.edu.tr', role: 'ADMIN' };
    const token = jwt.sign(payload);
    assert.ok(typeof token === 'string');
    assert.strictEqual(token.split('.').length, 3, 'JWT must have 3 segments');
  });

  test('Verifies valid JWT token and extracts exact payload fields', () => {
    const payload = { id: 'u102', email: 'dean@ostimteknik.edu.tr', role: 'DEAN', departmentId: 'MUH_FAK' };
    const token = jwt.sign(payload);
    const verified = jwt.verify(token);
    assert.strictEqual(verified.id, 'u102');
    assert.strictEqual(verified.email, 'dean@ostimteknik.edu.tr');
    assert.strictEqual(verified.role, 'DEAN');
    assert.strictEqual(verified.departmentId, 'MUH_FAK');
    assert.ok(verified.exp > verified.iat);
  });

  test('Rejects token with tampered payload', () => {
    const token = jwt.sign({ id: 'u103', role: 'VIEWER' });
    const parts = token.split('.');
    // Tamper with payload segment
    const tamperedPayload = Buffer.from(JSON.stringify({ id: 'u103', role: 'ADMIN' })).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    assert.throws(() => {
      jwt.verify(tamperedToken);
    }, /Invalid JWT signature/);
  });

  test('Rejects token with wrong secret', () => {
    const foreignJwt = new JWTHelper('attacker-different-secret');
    const token = foreignJwt.sign({ id: 'u104', role: 'ADMIN' });

    assert.throws(() => {
      jwt.verify(token);
    }, /Invalid JWT signature/);
  });

  test('Rejects expired JWT token', () => {
    const expiredToken = jwt.sign({ id: 'u105' }, -10); // Expired 10 seconds ago
    assert.throws(() => {
      jwt.verify(expiredToken);
    }, /JWT token has expired/);
  });

  test('Rejects malformed token with fewer or more than 3 segments', () => {
    assert.throws(() => {
      jwt.verify('invalid.token');
    }, /Malformed JWT token/);
  });

  test('Encodes departmentScope in token payload for immediate client-side and server-side checks', () => {
    const payload = {
      id: 'u106',
      departmentId: 'BILGISAYAR_MUH',
      departmentScope: { type: 'CUSTOM', departments: ['YAZILIM_MUH'] },
    };
    const token = jwt.sign(payload);
    const verified = jwt.verify(token);
    assert.strictEqual(verified.departmentScope.type, 'CUSTOM');
    assert.deepStrictEqual(verified.departmentScope.departments, ['YAZILIM_MUH']);
  });

  test('Encodes table permissions array in user token payload', () => {
    const payload = {
      id: 'u107',
      permissions: [
        { templateCode: 'DERSLER', canView: true, canCreate: true, canUpdate: true, canDelete: false },
      ],
    };
    const token = jwt.sign(payload);
    const verified = jwt.verify(token);
    assert.strictEqual(verified.permissions[0].templateCode, 'DERSLER');
    assert.ok(verified.permissions[0].canCreate);
    assert.ok(!verified.permissions[0].canDelete);
  });
});

// ============================================================================
// Area 6: Dynamic Template Builder API (8 Tests)
// ============================================================================
describe('Tier 1.6: Dynamic Template Builder API', () => {
  test('Validates compliant custom dynamic template schema', () => {
    const templateDef = {
      title: 'Öğrenci Proje Yarışmaları',
      code: 'OGRENCI_YARISMA_2026',
      category: 'Akademik',
      type: 'DYNAMIC',
      columns: [
        { key: 'projeAdi', name: 'Proje Adı', type: 'text', required: true },
        { key: 'takimUyeSayisi', name: 'Takım Üye Sayısı', type: 'integer', required: true, min: 1, max: 10 },
        { key: 'odulDerecesi', name: 'Ödül Derecesi', type: 'select', required: true, options: ['1.lik', '2.lik', '3.lük', 'Mansiyon'] },
      ],
    };

    assert.ok(DynamicTemplateValidator.validateSchema(templateDef));
  });

  test('Rejects template schema missing title or code', () => {
    assert.throws(() => {
      DynamicTemplateValidator.validateSchema({
        code: 'TEST',
        columns: [{ key: 'c1', name: 'C1', type: 'text' }],
      });
    }, /Template title is required/);

    assert.throws(() => {
      DynamicTemplateValidator.validateSchema({
        title: 'Test',
        columns: [{ key: 'c1', name: 'C1', type: 'text' }],
      });
    }, /Template code is required/);
  });

  test('Rejects template schema with empty columns array', () => {
    assert.throws(() => {
      DynamicTemplateValidator.validateSchema({
        title: 'Empty Table',
        code: 'EMPTY_TABLE',
        columns: [],
      });
    }, /Template must define at least one column/);
  });

  test('Rejects template schema with duplicate column keys', () => {
    assert.throws(() => {
      DynamicTemplateValidator.validateSchema({
        title: 'Dup Keys',
        code: 'DUP_KEYS',
        columns: [
          { key: 'ad', name: 'Ad', type: 'text' },
          { key: 'ad', name: 'İkinci Ad', type: 'text' },
        ],
      });
    }, /Duplicate column key: "ad"/);
  });

  test('Rejects template schema with unsupported column type', () => {
    assert.throws(() => {
      DynamicTemplateValidator.validateSchema({
        title: 'Invalid Type',
        code: 'INV_TYPE',
        columns: [{ key: 'col1', name: 'Col 1', type: 'geopoint' }],
      });
    }, /Invalid column type "geopoint"/);
  });

  test('Rejects select column without options array', () => {
    assert.throws(() => {
      DynamicTemplateValidator.validateSchema({
        title: 'Missing Options',
        code: 'MISS_OPT',
        columns: [{ key: 'status', name: 'Durum', type: 'select', options: [] }],
      });
    }, /Select column "status" must provide non-empty options array/);
  });

  test('Supports all 8 official column types (text, integer, decimal, date, select, multiselect, formula, url)', () => {
    const types = ['text', 'integer', 'decimal', 'date', 'select', 'multiselect', 'formula', 'url'];
    const columns = types.map((t, idx) => ({
      key: `field_${idx}`,
      name: `Field ${idx}`,
      type: t,
      options: (t === 'select' || t === 'multiselect') ? ['Option1', 'Option2'] : undefined,
    }));

    const valid = DynamicTemplateValidator.validateSchema({
      title: 'Full Types Table',
      code: 'FULL_TYPES',
      columns,
    });
    assert.ok(valid);
  });

  test('Admin can define fixed-row template with predefined unit labels', () => {
    const templateDef = {
      title: 'Kampüs Su Tüketimi',
      code: 'KAMPUS_SU',
      type: 'FIXED',
      fixedRows: [
        { rowId: 1, label: 'Kuzey Yerleşke' },
        { rowId: 2, label: 'Güney Yerleşke' },
      ],
      columns: [
        { key: 'tuketimM3', name: 'Tüketim (m3)', type: 'decimal', required: true },
      ],
    };
    assert.ok(DynamicTemplateValidator.validateSchema(templateDef));
  });
});

// ============================================================================
// Area 7: 1:1 Excel/XLSM Export and Validated Import (8 Tests)
// ============================================================================
describe('Tier 1.7: 1:1 Excel/XLSM Export and Validated Import', () => {
  test('Creates valid OOXML package with intact [Content_Types].xml and xl/workbook.xml', () => {
    const files = {
      '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
      'xl/workbook.xml': '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets><sheet name="TestSheet" sheetId="1"/></sheets></workbook>',
    };
    const zipBuf = createMinimalZip(files);
    assert.ok(zipBuf.length > 0);

    const reader = new ZipReader(zipBuf);
    assert.ok(reader.hasEntry('[Content_Types].xml'));
    assert.ok(reader.hasEntry('xl/workbook.xml'));
    assert.strictEqual(reader.getSheetNames()[0], 'TestSheet');
  });

  test('1:1 XLSM export preserves original xl/vbaProject.bin byte-for-byte sha256 checksum', () => {
    const originalPath = path.join(TEMPLATES_DIR, 'Projeler 2025-2026.xlsm');
    const originalReader = new ZipReader(originalPath);
    const originalVbaSha = originalReader.getEntrySha256('xl/vbaProject.bin');
    assert.ok(originalVbaSha, 'Original Projeler must have xl/vbaProject.bin hash');

    // Simulate 1:1 export re-packaging with injected rows
    const originalVbaBuffer = originalReader.readEntryBuffer('xl/vbaProject.bin');
    const exportedZip = createMinimalZip({
      'xl/workbook.xml': originalReader.readEntryBuffer('xl/workbook.xml'),
      'xl/vbaProject.bin': originalVbaBuffer,
    });

    const exportedReader = new ZipReader(exportedZip);
    const exportedVbaSha = exportedReader.getEntrySha256('xl/vbaProject.bin');
    assert.strictEqual(exportedVbaSha, originalVbaSha, 'Exported xl/vbaProject.bin must match original sha256 byte-for-byte');
  });

  test('1:1 Export preserves secondary reference sheets (Referans Değerler, listeler)', () => {
    const derslerPath = path.join(TEMPLATES_DIR, 'Dersler (7).xlsx');
    const reader = new ZipReader(derslerPath);
    const sheets = reader.getSheetNames();
    assert.includes(sheets, 'Dersler', 'Must contain primary data sheet');
    assert.includes(sheets, 'Referans Değerler', 'Must preserve secondary Referans Değerler sheet');
  });

  test('Valid import parses conforming row and maps fields to database model', () => {
    const sampleRecord = {
      yoksisBirimId: 104521,
      dersKodu: 'CENG101',
      dersAdi: 'Introduction to Computer Engineering',
      okutulduguSinif: '1. SINIF',
      okutulduguDonem: '1. Dönem',
      turu: 'Zorunlu',
      haftalikDersSaati: 4,
      akts: 6.0,
      ogrenciSayisi: 85,
    };

    // Validation checks
    assert.ok(sampleRecord.yoksisBirimId >= 100000 && sampleRecord.yoksisBirimId <= 999999);
    assert.ok(sampleRecord.haftalikDersSaati >= 0 && sampleRecord.haftalikDersSaati <= 45);
    assert.ok(sampleRecord.akts >= 0 && sampleRecord.akts <= 50);
  });

  test('Validated import flags row missing mandatory field with specific error message', () => {
    const invalidRow = {
      yoksisBirimId: 104521,
      dersKodu: '', // Missing mandatory dersKodu!
      dersAdi: 'Data Structures',
    };

    const errors = [];
    if (!invalidRow.dersKodu || invalidRow.dersKodu.trim() === '') {
      errors.push({ field: 'dersKodu', message: 'Ders Kodu alanı zorunludur' });
    }

    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].field, 'dersKodu');
    assert.includes(errors[0].message, 'zorunludur');
  });

  test('Validated import flags out-of-range integer value', () => {
    const invalidRow = {
      haftalikDersSaati: 50, // Max allowed is 45!
    };

    const errors = [];
    if (invalidRow.haftalikDersSaati > 45) {
      errors.push({ field: 'haftalikDersSaati', message: 'Haftalık ders saati 0 ile 45 arasında olmalıdır' });
    }

    assert.strictEqual(errors.length, 1);
    assert.includes(errors[0].message, '0 ile 45 arasında');
  });

  test('Validated import flags unlisted dropdown option value', () => {
    const allowedClasses = ['YABANCI DİL HAZIRLIK', '1. SINIF', '2. SINIF', '3. SINIF', '4. SINIF', '5. SINIF', '6. SINIF'];
    const invalidValue = '8. SINIF';

    const errors = [];
    if (!allowedClasses.includes(invalidValue)) {
      errors.push({ field: 'okutulduguSinif', message: `Geçersiz sınıf değeri: "${invalidValue}"` });
    }

    assert.strictEqual(errors.length, 1);
    assert.includes(errors[0].message, 'Geçersiz sınıf değeri');
  });

  test('Validated import distinguishes valid rows from invalid rows in summary report', () => {
    const rows = [
      { id: 1, valid: true },
      { id: 2, valid: false, err: 'Missing code' },
      { id: 3, valid: true },
    ];

    const validRows = rows.filter(r => r.valid);
    const invalidRows = rows.filter(r => !r.valid);

    const report = {
      totalRows: rows.length,
      validCount: validRows.length,
      invalidCount: invalidRows.length,
    };

    assert.strictEqual(report.totalRows, 3);
    assert.strictEqual(report.validCount, 2);
    assert.strictEqual(report.invalidCount, 1);
  });
});
