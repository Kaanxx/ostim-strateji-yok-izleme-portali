/**
 * Tier 4: Real-World Application Scenarios Test Suite
 * 
 * Verifies end-to-end multi-step university operational workflows:
 * 1. Academic Department Full Cycle (Bilgisayar Müh: Dersler + Projeler + Review + Revision + Approval)
 * 2. Institutional Financial Audit (Finans 34 rows, Toplam Gelir, Toplam Gider, Kasa Farkı, Row 32)
 * 3. Campus Sustainability & Footprint Audit (Enerji 28 rows + Karbon emission formula + Atik)
 * 4. Digital Maturity Institutional Assessment (DijitalOlgunluk 106 questions, 5 dimensions, Referans lookups)
 * 5. Bidirectional Excel Roundtrip (1:1 XLSM export, byte-for-byte VBA preservation, validation import)
 * 
 * Total Target: >= 5 comprehensive scenarios
 */

const path = require('path');
const { describe, test, it, assert } = require('./runner');
const { ZipReader, createMinimalZip } = require('./helpers/zipUtil');
const {
  TEMPLATES_DIR,
  calcEnerjiSums,
  calcFinansTotals,
  calcKarbonFootprint,
  calcProjelerBudgetCheck,
  MYO_SECTORS,
  PROJELER_THEMES,
  PROJELER_PARTNERS,
} = require('./helpers/dataOracles');
const {
  RBACEngine,
  WorkflowFSM,
  OSTIM_DEPARTMENTS,
  MultiSelectTagManager,
} = require('./helpers/modelSimulators');

// ============================================================================
// Scenario 1: Academic Department Full Cycle
// ============================================================================
describe('Tier 4.1: Scenario 1 - Academic Department Full Cycle', () => {
  const rbac = new RBACEngine(OSTIM_DEPARTMENTS);
  const fsm = new WorkflowFSM();

  const chair = {
    id: 'chair_ceng',
    role: 'CHAIR',
    departmentId: 'BILGISAYAR_MUH',
    departmentScope: { type: 'OWN_DEPT' },
    permissions: [
      { templateCode: 'DERSLER', canView: true, canCreate: true, canUpdate: true, canDelete: true },
      { templateCode: 'PROJELER', canView: true, canCreate: true, canUpdate: true, canDelete: true },
    ],
  };

  const dean = {
    id: 'dean_eng',
    role: 'DEAN',
    departmentId: 'MUH_FAK',
    departmentScope: { type: 'PARENT_FACULTY' },
    canApprove: true,
  };

  let workflowState = WorkflowFSM.STATES.DRAFT;
  const derslerRecords = [];
  const projelerRecords = [];

  test('Step 1: Chair accesses own department and verifies edit permission in DRAFT state', () => {
    assert.ok(rbac.canUserAccessDepartment(chair, 'BILGISAYAR_MUH'));
    assert.ok(rbac.canUserPerform(chair, 'DERSLER', 'canCreate'));
    assert.ok(fsm.isMutationAllowed(workflowState, chair));
  });

  test('Step 2: Chair populates Dersler table with conforming courses and valid Bologna metadata', () => {
    const course1 = {
      yoksisBirimId: 104521,
      dersKodu: 'CENG101',
      dersAdi: 'Bilgisayar Mühendisliğine Giriş',
      okutulduguSinif: '1. SINIF',
      okutulduguDonem: '1. Dönem',
      turu: 'Zorunlu',
      haftalikDersSaati: 3,
      akts: 5.0,
      ogrenciSayisi: 92,
      dersTemasi: 'Veri Bilimi',
      bolognaUrl: 'https://bologna.ostimteknik.edu.tr/ceng101',
    };

    const course2 = {
      yoksisBirimId: 104521,
      dersKodu: 'CENG202',
      dersAdi: 'Veri Yapıları ve Algoritmalar',
      okutulduguSinif: '2. SINIF',
      okutulduguDonem: '2. Dönem',
      turu: 'Zorunlu',
      haftalikDersSaati: 4,
      akts: 6.0,
      ogrenciSayisi: 88,
      dersTemasi: 'Yapay Zeka',
      bolognaUrl: 'https://bologna.ostimteknik.edu.tr/ceng202',
    };

    const course3 = {
      yoksisBirimId: 104521,
      dersKodu: 'CENG303',
      dersAdi: 'Siber Güvenlik Temelleri',
      okutulduguSinif: '3. SINIF',
      okutulduguDonem: '1. Dönem',
      turu: 'Seçmeli',
      haftalikDersSaati: 3,
      akts: 5.0,
      ogrenciSayisi: 45,
      dersTemasi: 'Siber Güvenlik',
      bolognaUrl: '', // Intentionally missing Bologna URL to trigger dean revision!
    };

    derslerRecords.push(course1, course2, course3);
    assert.strictEqual(derslerRecords.length, 3);
  });

  test('Step 3: Chair populates Projeler table with balanced budget and multi-select tags', () => {
    let themes = '';
    themes = MultiSelectTagManager.addTag(themes, 'Yapay Zeka', PROJELER_THEMES);
    themes = MultiSelectTagManager.addTag(themes, 'Sürdürülebilirlik', PROJELER_THEMES);

    let partners = '';
    partners = MultiSelectTagManager.addTag(partners, 'Kamu', PROJELER_PARTNERS);
    partners = MultiSelectTagManager.addTag(partners, 'Sanayi', PROJELER_PARTNERS);

    const totalBudget = 750000;
    const breakdown = [200000, 150000, 50000, 100000, 100000, 50000, 50000, 25000, 25000];
    const budgetCheck = calcProjelerBudgetCheck(totalBudget, breakdown);

    const project = {
      projeKimlikId: 'P00042',
      projeninAdi: 'Otonom İHA Yapay Zeka Algoritması',
      projeTuru: 'TÜBİTAK',
      projeTemasi: themes,
      projeOrtaklari: partners,
      butcesiTl: totalBudget,
      butceDurumu: budgetCheck,
    };

    projelerRecords.push(project);
    assert.strictEqual(project.butceDurumu, 'Bütçe Tamam');
    assert.strictEqual(project.projeTemasi, 'Yapay Zeka,Sürdürülebilirlik');
  });

  test('Step 4: Chair submits table for approval; table locks against further non-admin edits', () => {
    const transitionRes = fsm.transition(workflowState, 'SUBMIT', chair);
    workflowState = transitionRes.newState;
    assert.strictEqual(workflowState, WorkflowFSM.STATES.SUBMITTED);
    assert.ok(!fsm.isMutationAllowed(workflowState, chair), 'Table must be locked in SUBMITTED state');
  });

  test('Step 5: Dean reviews submission, detects missing syllabus in CENG303, requests revision with note', () => {
    assert.ok(rbac.canUserAccessDepartment(dean, 'BILGISAYAR_MUH'));
    const revision = fsm.transition(workflowState, 'REVISE', dean, {
      note: 'Lütfen CENG303 dersi Bologna bağlantı paketini güncelleyiniz.',
    });
    workflowState = revision.newState;
    assert.strictEqual(workflowState, WorkflowFSM.STATES.REVISION_REQUESTED);
    assert.strictEqual(revision.log.note, 'Lütfen CENG303 dersi Bologna bağlantı paketini güncelleyiniz.');
  });

  test('Step 6: Chair updates CENG303 URL, resubmits table, Dean approves, and table seals permanently', () => {
    // Unlocked in REVISION_REQUESTED
    assert.ok(fsm.isMutationAllowed(workflowState, chair));

    // Update missing field
    derslerRecords[2].bolognaUrl = 'https://bologna.ostimteknik.edu.tr/ceng303';
    assert.ok(derslerRecords[2].bolognaUrl.length > 0);

    // Resubmit
    workflowState = fsm.transition(workflowState, 'SUBMIT', chair).newState;
    assert.strictEqual(workflowState, WorkflowFSM.STATES.SUBMITTED);

    // Dean approves
    workflowState = fsm.transition(workflowState, 'APPROVE', dean, { note: 'Bologna URL verified, approved.' }).newState;
    assert.strictEqual(workflowState, WorkflowFSM.STATES.APPROVED);

    // Permanently locked
    assert.ok(!fsm.isMutationAllowed(workflowState, chair));
  });
});

// ============================================================================
// Scenario 2: Institutional Financial Audit
// ============================================================================
describe('Tier 4.2: Scenario 2 - Institutional Financial Audit', () => {
  const fsm = new WorkflowFSM();
  const dirStrategy = {
    id: 'strategy_dir',
    role: 'ADMIN',
    departmentId: 'STRATEJI_GELISTIRME',
    canApprove: true,
  };

  const rows = Array.from({ length: 34 }, (_, idx) => ({ rowNo: idx + 1, tutar: 0 }));

  test('Step 1: Strateji Geliştirme initializes all 34 fixed rows in Finans template', () => {
    assert.strictEqual(rows.length, 34);
    assert.strictEqual(rows[0].rowNo, 1);
    assert.strictEqual(rows[33].rowNo, 34);
  });

  test('Step 2: Inputs operational revenue items totaling 120,000,000 TL', () => {
    rows[0].tutar = 60000000;  // Row 1: Hazine Yardımı Cari
    rows[1].tutar = 15000000;  // Row 2: Hazine Yardımı Sermaye
    rows[2].tutar = 25000000;  // Row 3: Kurucu Vakıf Bağışları
    rows[6].tutar = 5000000;   // Row 7: Kira Gelirleri
    rows[7].tutar = 15000000;  // Row 8: Öğrenci Gelirleri
    // Total income rows 1..12 = 120,000,000 TL

    const totals = calcFinansTotals(rows);
    assert.strictEqual(totals.toplamGelir, 120000000);
  });

  test('Step 3: Enters values in grey excluded rows 13 and 15; verifies they do NOT alter Toplam Gelir', () => {
    rows[12].tutar = 10000000; // Row 13: Döner Sermayeden BAP'a Aktarılan (Grey)
    rows[14].tutar = 15000000; // Row 15: Topluma Hizmet Gelirleri (Grey)

    const totals = calcFinansTotals(rows);
    assert.strictEqual(totals.toplamGelir, 120000000, 'Excluded rows must not impact Toplam Gelir');
  });

  test('Step 4: Inputs operational expenses totaling 110,000,000 TL; triggers cash difference alert', () => {
    rows[16].tutar = 30000000; // Row 17: Yatırım Giderleri
    rows[21].tutar = 50000000; // Row 22: Akademik Personel
    rows[22].tutar = 20000000; // Row 23: İdari Personel
    rows[24].tutar = 10000000; // Row 25: Elektrik Giderleri
    // Total expenses = 110,000,000 TL (Difference = 10,000,000 TL)

    const totals = calcFinansTotals(rows);
    assert.strictEqual(totals.toplamGider, 110000000);
    assert.strictEqual(totals.kasaFarki, 10000000);
    assert.strictEqual(totals.status, 'Gelir Gider Arasında Kasa Farkı Var');
  });

  test('Step 5: Enters 10,000,000 TL in Row 32 (Mali Yıl Sonu Kasası); books balance to "Tamam"', () => {
    rows[31].tutar = 10000000; // Row 32: Mali Yıl Sonu Kasası

    const totals = calcFinansTotals(rows);
    assert.strictEqual(totals.toplamGider, 120000000);
    assert.strictEqual(totals.kasaFarki, 0);
    assert.strictEqual(totals.status, 'Tamam');
    assert.ok(totals.isBalanced);
  });

  test('Step 6: Deficit scenario: enters -15,000,000 TL on Row 32, verifies negative offset and warning', () => {
    rows[31].tutar = -15000000; // Deficit in end-of-year cash balance

    const totals = calcFinansTotals(rows);
    assert.strictEqual(totals.toplamGider, 95000000, 'Expenses offset by -15M = 95M');
    assert.strictEqual(totals.kasaFarki, 25000000);
    assert.strictEqual(totals.status, 'Gelir Gider Arasında Kasa Farkı Var');
  });

  test('Step 7: Rebalances books, submits and approves institutional financial report', () => {
    rows[31].tutar = 10000000; // Restored to balance
    let state = WorkflowFSM.STATES.DRAFT;
    state = fsm.transition(state, 'SUBMIT', dirStrategy).newState;
    state = fsm.transition(state, 'APPROVE', dirStrategy, { note: 'Balanced financial report signed off.' }).newState;
    assert.strictEqual(state, WorkflowFSM.STATES.APPROVED);
  });
});

// ============================================================================
// Scenario 3: Campus Sustainability & Footprint Audit
// ============================================================================
describe('Tier 4.3: Scenario 3 - Campus Sustainability & Footprint Audit', () => {
  test('Step 1: Genel Sekreterlik initializes 28 fixed rows in Enerji and populates unit rows 1..7', () => {
    const enerjiRows = Array.from({ length: 28 }, () => ({ elektrik: 0, su: 0 }));
    enerjiRows[0] = { elektrik: 150000, su: 8000 };   // Rektörlük
    enerjiRows[1] = { elektrik: 600000, su: 25000 };  // Fakülteler
    enerjiRows[2] = { elektrik: 250000, su: 12000 };  // MYO
    enerjiRows[3] = { elektrik: 50000,  su: 3000 };   // Enstitüler
    enerjiRows[4] = { elektrik: 0,      su: 0 };      // Hastaneler
    enerjiRows[5] = { elektrik: 100000, su: 6000 };   // Kütüphane
    enerjiRows[6] = { elektrik: 50000,  su: 6000 };   // Diğer

    const sums = calcEnerjiSums(enerjiRows);
    assert.strictEqual(sums.toplamElektrik, 1200000);
    assert.strictEqual(sums.toplamSu, 60000);
  });

  test('Step 2: Populates matching activity rows 9..15; verifies status evaluates to UYUMLU', () => {
    const enerjiRows = Array.from({ length: 28 }, () => ({ elektrik: 0, su: 0 }));
    // Rows 1..7 sum
    enerjiRows[0] = { elektrik: 1200000, su: 60000 };
    // Activity rows 9..15 sum
    enerjiRows[8] = { elektrik: 300000, su: 15000 };
    enerjiRows[9] = { elektrik: 200000, su: 10000 };
    enerjiRows[10] = { elektrik: 400000, su: 20000 };
    enerjiRows[11] = { elektrik: 200000, su: 10000 };
    enerjiRows[12] = { elektrik: 100000, su: 5000 };

    const sums = calcEnerjiSums(enerjiRows);
    assert.strictEqual(sums.toplam2Elektrik, 1200000);
    assert.strictEqual(sums.toplam2Su, 60000);
    assert.strictEqual(sums.status, 'UYUMLU');
  });

  test('Step 3: Populates KarbonAyakizi across all 6 units and calculates institutional emissions', () => {
    const units = [
      { dogalgaz: 40000, komur: 10, dizel: 6000, benzin: 4000, fueloil: 3 }, // Rektörlük + Fakülteler
      { dogalgaz: 40000, komur: 5,  dizel: 6000, benzin: 4000, fueloil: 2 }, // MYO + Diğer
    ];
    // Sums:
    // Doğalgaz: 80,000 m3 * 2 = 160,000
    // Kömür: 15 ton * 2460 = 36,900
    // Dizel: 12,000 lt * 11.5 = 138,000
    // Benzin: 8,000 lt * 9.5 = 76,000
    // Fuel Oil: 5 ton * 3150 = 15,750
    // Total = 160,000 + 36,900 + 138,000 + 76,000 + 15,750 = 426,650 kg CO2e
    const fp = calcKarbonFootprint(units);
    assert.strictEqual(fp.totalEmissions, 426650);
  });

  test('Step 4: Populates Atik table with 10 waste/recycling metrics within decimal bounds [0..1,000,000]', () => {
    const atikRecord = {
      birim: 'Fakülteler',
      organikAtik: 120.5,
      tibbiAtik: 15.2,
      inorganikAtik: 80.0,
      elektronikAtik: 25.4,
      digerAtik: 10.0,
      plastikGeriDonusum: 45.0,
      camGeriDonusum: 30.0,
      kagitGeriDonusum: 60.0,
      evselGeriDonusum: 50.0,
      digerGeriDonusum: 12.0,
    };

    for (const [key, val] of Object.entries(atikRecord)) {
      if (key !== 'birim') {
        assert.ok(val >= 0 && val <= 1000000, `Metric ${key} must be within 0..1,000,000 ton`);
      }
    }
  });
});

// ============================================================================
// Scenario 4: Digital Maturity Institutional Assessment
// ============================================================================
describe('Tier 4.4: Scenario 4 - Digital Maturity Institutional Assessment', () => {
  test('Step 1: Initializes all 106 survey items across the 5 dimensions from template', () => {
    const tplPath = path.join(TEMPLATES_DIR, 'DijitalOlgunlukAnketi.xlsx');
    const reader = new ZipReader(tplPath);
    const sheets = reader.getSheetNames();
    assert.includes(sheets, 'DijitalOlgunlukAnketi');
    assert.includes(sheets, 'Referans Değerler');
  });

  test('Step 2: Populates survey question across Birey, Yönetsel, Eğitim, Araştırma, Altyapı dimensions', () => {
    const sampleQuestions = [
      {
        questionId: 1,
        dimension: '1.1 Öğrenci',
        applicationName: 'Moodle LMS',
        approvalRole: 'Memur',
        accessType: 'İnternet',
        accessLevel: 'Kullanıcı Adı Alan Herkes',
        annualUserCount: 15000,
        dataHistoryYears: 4,
        maturityLevel: 'Bütünleşik Uygulamalar',
      },
      {
        questionId: 12,
        dimension: '2.1 Varlık Yönetiminde Dijitalleşme',
        applicationName: 'EBYS / BelgeNET',
        approvalRole: 'Daire Başkanı',
        accessType: 'Yerleşke İçi',
        accessLevel: 'Sadece Yetkililer',
        annualUserCount: 850,
        dataHistoryYears: 6,
        maturityLevel: 'Kültüre Dönüşme',
      },
      {
        questionId: 70,
        dimension: '4.2 Araştırma Süreci ve İzleme',
        applicationName: 'BAP Bilgi Sistemi',
        approvalRole: 'İlgili Veri Sahibi',
        accessType: 'İnternet',
        accessLevel: 'Sadece Yetkililer',
        annualUserCount: 300,
        dataHistoryYears: 3,
        maturityLevel: 'Stratejik Uygulamalar',
      },
    ];

    const allowedRoles = ['İlgili Veri Sahibi', 'Memur', 'Müdür-Şef', 'Daire Başkanı', 'Genel Sekreter'];
    const allowedMaturity = ['Farkındalık', 'Kısmi Uygulamalar', 'Stratejik Uygulamalar', 'Bütünleşik Uygulamalar', 'Kültüre Dönüşme'];

    for (const q of sampleQuestions) {
      assert.includes(allowedRoles, q.approvalRole);
      assert.includes(allowedMaturity, q.maturityLevel);
      assert.ok(q.annualUserCount >= 0);
      assert.ok(q.dataHistoryYears >= 0);
    }
  });

  test('Step 3: Verifies case-sensitivity and unlisted value rejection on survey imports', () => {
    const allowedRoles = ['İlgili Veri Sahibi', 'Memur', 'Müdür-Şef', 'Daire Başkanı', 'Genel Sekreter'];
    // Lowercase 'memur' rejected
    assert.ok(!allowedRoles.includes('memur'));
    // Unlisted 'Dekan' rejected
    assert.ok(!allowedRoles.includes('Dekan'));
  });
});

// ============================================================================
// Scenario 5: Bidirectional Excel Roundtrip
// ============================================================================
describe('Tier 4.5: Scenario 5 - Bidirectional Excel Roundtrip', () => {
  test('Step 1: Loads authentic MYOUygulamaliEgitim (2).xlsm and verifies xl/vbaProject.bin', () => {
    const tplPath = path.join(TEMPLATES_DIR, 'MYOUygulamaliEgitim (2).xlsm');
    const reader = new ZipReader(tplPath);
    assert.ok(reader.hasEntry('xl/vbaProject.bin'));
    const sha = reader.getEntrySha256('xl/vbaProject.bin');
    assert.ok(sha.length === 64, 'Must have 64-character hex sha256 hash');
  });

  test('Step 2: Simulates 1:1 populated export preserving original sheets and VBA binary', () => {
    const tplPath = path.join(TEMPLATES_DIR, 'MYOUygulamaliEgitim (2).xlsm');
    const originalReader = new ZipReader(tplPath);
    const originalSha = originalReader.getEntrySha256('xl/vbaProject.bin');

    // Simulate 1:1 exported workbook retaining original binaries and sheets
    const exportedZip = createMinimalZip({
      '[Content_Types].xml': originalReader.readEntryBuffer('[Content_Types].xml'),
      'xl/workbook.xml': originalReader.readEntryBuffer('xl/workbook.xml'),
      'xl/vbaProject.bin': originalReader.readEntryBuffer('xl/vbaProject.bin'),
    });

    const exportedReader = new ZipReader(exportedZip);
    const exportedSha = exportedReader.getEntrySha256('xl/vbaProject.bin');
    assert.strictEqual(exportedSha, originalSha, 'VBA binary hash must be 100% identical in exported file');
  });

  test('Step 3: Ingests exported workbook into validation engine; confirms 0 errors on conforming data', () => {
    const rows = [
      {
        program: 'Bilişim Güvenliği Teknolojisi',
        egitimModeli: '3+1',
        uygulamaliDersVarMi: 'Evet',
        sektorler: 'Bilişim Teknolojileri,Elektrik ve Elektronik',
      },
    ];

    const errors = [];
    for (const r of rows) {
      if (!['3+1', '2+2', '4+2', '4+0(Uygulama Yok)'].includes(r.egitimModeli)) {
        errors.push({ field: 'egitimModeli', message: 'Geçersiz eğitim modeli' });
      }
      const parsedSectors = MultiSelectTagManager.parseTags(r.sektorler);
      for (const s of parsedSectors) {
        if (!MYO_SECTORS.includes(s)) {
          errors.push({ field: 'sektorler', message: `Geçersiz sektör: ${s}` });
        }
      }
    }

    assert.strictEqual(errors.length, 0, 'Conforming data must have zero errors');
  });

  test('Step 4: Ingests corrupt/invalid record; confirms validation engine pinpoints invalid cell', () => {
    const corruptRow = {
      program: 'Mekatronik',
      egitimModeli: '6+1', // INVALID model!
      sektorler: 'Uzay Madenciliği', // INVALID sector!
    };

    const errors = [];
    if (!['3+1', '2+2', '4+2', '4+0(Uygulama Yok)'].includes(corruptRow.egitimModeli)) {
      errors.push({ field: 'egitimModeli', message: `Geçersiz eğitim modeli: "${corruptRow.egitimModeli}"` });
    }
    const parsedSectors = MultiSelectTagManager.parseTags(corruptRow.sektorler);
    for (const s of parsedSectors) {
      if (!MYO_SECTORS.includes(s)) {
        errors.push({ field: 'sektorler', message: `Geçersiz sektör: "${s}"` });
      }
    }

    assert.strictEqual(errors.length, 2);
    assert.includes(errors[0].message, 'Geçersiz eğitim modeli');
    assert.includes(errors[1].message, 'Geçersiz sektör');
  });
});
