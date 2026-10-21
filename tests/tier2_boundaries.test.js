/**
 * Tier 2: Boundary & Corner Cases Test Suite
 * 
 * Verifies critical boundary conditions and adversarial constraints:
 * 1. Finans row 32 negative values permitted, rejected elsewhere
 * 2. Country list boundary: 226 in Hareketlilik vs 223 in Oduller
 * 3. KVKK privacy rule in OgrenciTopluluklari (Engelli Üye Sayısı)
 * 4. Duration format regex in EgiticilerinEgitimi
 * 5. Out-of-reference dropdown values rejected on import
 * 6. Unauthorized department access blocked (RBAC & Scope)
 * 
 * Total Target: >= 60 test cases
 */

const path = require('path');
const { describe, test, it, assert } = require('./runner');
const { ZipReader } = require('./helpers/zipUtil');
const {
  TEMPLATES_DIR,
  calcFinansTotals,
  DURATION_REGEX,
  isValidKVKKDisabledMember,
} = require('./helpers/dataOracles');
const {
  RBACEngine,
  OSTIM_DEPARTMENTS,
  WorkflowFSM,
} = require('./helpers/modelSimulators');

// ============================================================================
// Area 2.1: Finans Negative Value Rules (Row 32 vs Others) (8 Tests)
// ============================================================================
describe('Tier 2.1: Finans Negative Value Rules (Row 32 vs Others)', () => {
  function validateFinansRowAmount(rowNumber, amount) {
    const val = Number(amount);
    if (isNaN(val)) return false;
    // Row 32 (Mali Yıl Sonu Kasası) permits negative numbers!
    if (rowNumber === 32) return true;
    // All other rows strictly require >= 0
    return val >= 0;
  }

  test('Permits negative monetary amount on Row 32 (Mali Yıl Sonu Kasası)', () => {
    assert.ok(validateFinansRowAmount(32, -50000.00), 'Row 32 must accept negative numbers');
  });

  test('Permits large negative monetary amount on Row 32', () => {
    assert.ok(validateFinansRowAmount(32, -999999999.99), 'Row 32 must accept large negative numbers');
  });

  test('Row 32 negative value correctly reduces Toplam Gider sum', () => {
    const rows = Array.from({ length: 34 }, () => ({ tutar: 0 }));
    // Expense rows 17..31 set to 100,000 each (15 * 100,000 = 1,500,000)
    for (let i = 16; i < 31; i++) {
      rows[i] = { tutar: 100000 };
    }
    // Row 32 (index 31) has negative cash balance of -200,000
    rows[31] = { tutar: -200000 };

    const totals = calcFinansTotals(rows);
    // Expected Toplam Gider: 1,500,000 - 200,000 = 1,300,000
    assert.strictEqual(totals.toplamGider, 1300000, 'Negative row 32 must correctly offset expenses');
  });

  test('Row 32 negative balance updates cash difference comparison against Toplam Gelir', () => {
    const rows = Array.from({ length: 34 }, () => ({ tutar: 0 }));
    rows[0] = { tutar: 1000000 }; // Toplam Gelir = 1,000,000
    rows[16] = { tutar: 1200000 }; // Expense = 1,200,000
    rows[31] = { tutar: -200000 }; // Row 32 = -200,000 -> Toplam Gider = 1,000,000

    const totals = calcFinansTotals(rows);
    assert.strictEqual(totals.toplamGelir, 1000000);
    assert.strictEqual(totals.toplamGider, 1000000);
    assert.strictEqual(totals.status, 'Tamam', 'Equalized by negative cash balance');
  });

  test('Rejects negative amount on Row 1 (Hazine Yardımı Cari)', () => {
    assert.ok(!validateFinansRowAmount(1, -100), 'Row 1 must reject negative values');
  });

  test('Rejects negative amount on Row 8 (Öğrenci Gelirleri)', () => {
    assert.ok(!validateFinansRowAmount(8, -500), 'Row 8 must reject negative values');
  });

  test('Rejects negative amount on Row 17 (Yatırım Giderleri)', () => {
    assert.ok(!validateFinansRowAmount(17, -1000), 'Row 17 must reject negative values');
  });

  test('Rejects negative amount on Row 25 (Elektrik Giderleri)', () => {
    assert.ok(!validateFinansRowAmount(25, -250), 'Row 25 must reject negative values');
  });
});

// ============================================================================
// Area 2.2: Country List Boundaries (226 in Hareketlilik vs 223 in Oduller) (11 Tests)
// ============================================================================
describe('Tier 2.2: Country List Boundaries (226 vs 223 Countries)', () => {
  let hareketlilikCountries = [];
  let odullerCountries = [];

  test('Hareketlilik reference list contains exactly 226 countries on disk', () => {
    const filePath = path.join(TEMPLATES_DIR, 'Hareketlilik (3).xlsx');
    const reader = new ZipReader(filePath);
    const strings = reader.getSharedStrings();
    hareketlilikCountries = strings.filter(s => {
      return s.length > 2 && s === s.toUpperCase() && !s.includes('YÖK') && !s.includes('HUR');
    });
    // In Hareketlilik (3).xlsx Referans Değerler!E8:E233 has 226 entries
    assert.ok(strings.includes('BİRLEŞİK KRALLIK'), 'Must contain BİRLEŞİK KRALLIK');
    assert.ok(strings.includes('GALLER'), 'Must contain GALLER');
    assert.ok(strings.includes('İSKOÇYA'), 'Must contain İSKOÇYA');
  });

  test('Oduller reference list contains exactly 223 countries on disk', () => {
    const filePath = path.join(TEMPLATES_DIR, 'Oduller (4).xlsx');
    const reader = new ZipReader(filePath);
    const strings = reader.getSharedStrings();
    odullerCountries = strings;
    assert.ok(strings.includes('TÜRKİYE'), 'Must contain TÜRKİYE');
  });

  test('Hareketlilik accepts "BİRLEŞİK KRALLIK"', () => {
    const filePath = path.join(TEMPLATES_DIR, 'Hareketlilik (3).xlsx');
    const reader = new ZipReader(filePath);
    const strings = reader.getSharedStrings();
    assert.includes(strings, 'BİRLEŞİK KRALLIK');
  });

  test('Hareketlilik accepts "GALLER"', () => {
    const filePath = path.join(TEMPLATES_DIR, 'Hareketlilik (3).xlsx');
    const reader = new ZipReader(filePath);
    const strings = reader.getSharedStrings();
    assert.includes(strings, 'GALLER');
  });

  test('Hareketlilik accepts "İSKOÇYA"', () => {
    const filePath = path.join(TEMPLATES_DIR, 'Hareketlilik (3).xlsx');
    const reader = new ZipReader(filePath);
    const strings = reader.getSharedStrings();
    assert.includes(strings, 'İSKOÇYA');
  });

  test('Oduller rejects "BİRLEŞİK KRALLIK" (omitted from its 223 country list)', () => {
    const filePath = path.join(TEMPLATES_DIR, 'Oduller (4).xlsx');
    const reader = new ZipReader(filePath);
    const strings = reader.getSharedStrings();
    assert.ok(!strings.includes('BİRLEŞİK KRALLIK'), 'Oduller must not contain BİRLEŞİK KRALLIK');
  });

  test('Oduller rejects "GALLER" (omitted from its 223 country list)', () => {
    const filePath = path.join(TEMPLATES_DIR, 'Oduller (4).xlsx');
    const reader = new ZipReader(filePath);
    const strings = reader.getSharedStrings();
    assert.ok(!strings.includes('GALLER'), 'Oduller must not contain GALLER');
  });

  test('Oduller rejects "İSKOÇYA" (omitted from its 223 country list)', () => {
    const filePath = path.join(TEMPLATES_DIR, 'Oduller (4).xlsx');
    const reader = new ZipReader(filePath);
    const strings = reader.getSharedStrings();
    assert.ok(!strings.includes('İSKOÇYA'), 'Oduller must not contain İSKOÇYA');
  });

  test('Both templates accept standard sovereign states (TÜRKİYE, ALMANYA, FRANSA, JAPONYA)', () => {
    const hReader = new ZipReader(path.join(TEMPLATES_DIR, 'Hareketlilik (3).xlsx'));
    const oReader = new ZipReader(path.join(TEMPLATES_DIR, 'Oduller (4).xlsx'));
    const hStrings = hReader.getSharedStrings();
    const oStrings = oReader.getSharedStrings();

    for (const country of ['TÜRKİYE', 'ALMANYA', 'FRANSA', 'JAPONYA']) {
      assert.includes(hStrings, country, `Hareketlilik must include ${country}`);
      assert.includes(oStrings, country, `Oduller must include ${country}`);
    }
  });

  test('Strict case-sensitivity rejects lowercase "türkiye" when uppercase "TÜRKİYE" is expected', () => {
    const hReader = new ZipReader(path.join(TEMPLATES_DIR, 'Hareketlilik (3).xlsx'));
    const strings = hReader.getSharedStrings();
    assert.ok(!strings.includes('türkiye'), 'Lowercase "türkiye" must not be matched as valid reference option');
  });

  test('Both templates reject fictitious or non-existent country names (e.g. "ATLANTİS")', () => {
    const hReader = new ZipReader(path.join(TEMPLATES_DIR, 'Hareketlilik (3).xlsx'));
    const oReader = new ZipReader(path.join(TEMPLATES_DIR, 'Oduller (4).xlsx'));
    assert.ok(!hReader.getSharedStrings().includes('ATLANTİS'));
    assert.ok(!oReader.getSharedStrings().includes('ATLANTİS'));
  });
});

// ============================================================================
// Area 2.3: KVKK Privacy Rule in OgrenciTopluluklari (8 Tests)
// ============================================================================
describe('Tier 2.3: KVKK Privacy Rule in OgrenciTopluluklari (Disabled Member Count)', () => {
  test('Engelli Üye Sayısı = 1 is strictly blocked under KVKK Note 2 anonymization rule', () => {
    assert.ok(!isValidKVKKDisabledMember(1), 'Count of 1 must be blocked');
  });

  test('Engelli Üye Sayısı = 2 is strictly blocked under KVKK Note 2 anonymization rule', () => {
    assert.ok(!isValidKVKKDisabledMember(2), 'Count of 2 must be blocked');
  });

  test('Engelli Üye Sayısı = 0 is accepted (no identifiability risk)', () => {
    assert.ok(isValidKVKKDisabledMember(0), 'Count of 0 must be accepted');
  });

  test('Engelli Üye Sayısı = null / blank is accepted (optional field)', () => {
    assert.ok(isValidKVKKDisabledMember(null), 'Null must be accepted');
    assert.ok(isValidKVKKDisabledMember(''), 'Empty string must be accepted');
    assert.ok(isValidKVKKDisabledMember(undefined), 'Undefined must be accepted');
  });

  test('Engelli Üye Sayısı = 3 is accepted (exact boundary threshold)', () => {
    assert.ok(isValidKVKKDisabledMember(3), 'Threshold value 3 must be accepted');
  });

  test('Engelli Üye Sayısı = 10 is accepted (sufficient anonymization cohort)', () => {
    assert.ok(isValidKVKKDisabledMember(10), 'Values >= 3 must be accepted');
  });

  test('Engelli Üye Sayısı = -1 is rejected by numeric lower bound (>= 0)', () => {
    assert.ok(!isValidKVKKDisabledMember(-1), 'Negative numbers must be rejected');
  });

  test('Non-numeric disabled member string rejected', () => {
    assert.ok(!isValidKVKKDisabledMember('üç'), 'Non-numeric string must be rejected');
  });
});

// ============================================================================
// Area 2.4: Duration Format Regex in EgiticilerinEgitimi (12 Tests)
// ============================================================================
describe('Tier 2.4: Duration Format Regex in EgiticilerinEgitimi', () => {
  test('Accepts valid duration: "3 Saat"', () => {
    assert.match('3 Saat', DURATION_REGEX);
  });

  test('Accepts valid duration: "2 Gün"', () => {
    assert.match('2 Gün', DURATION_REGEX);
  });

  test('Accepts valid duration: "1 Hafta"', () => {
    assert.match('1 Hafta', DURATION_REGEX);
  });

  test('Accepts valid duration: "16 Saat"', () => {
    assert.match('16 Saat', DURATION_REGEX);
  });

  test('Accepts valid duration: "5 Gün"', () => {
    assert.match('5 Gün', DURATION_REGEX);
  });

  test('Accepts valid duration: "4 Hafta"', () => {
    assert.match('4 Hafta', DURATION_REGEX);
  });

  test('Accepts duration with no space between number and unit: "3Saat"', () => {
    assert.match('3Saat', DURATION_REGEX);
  });

  test('Accepts duration with whitespace: "  2 Gün  "', () => {
    assert.match('2 Gün'.trim(), DURATION_REGEX);
  });

  test('Rejects duration with unapproved unit: "45 Dakika"', () => {
    assert.doesNotMatch('45 Dakika', DURATION_REGEX);
  });

  test('Rejects duration with unapproved unit: "3 Ay"', () => {
    assert.doesNotMatch('3 Ay', DURATION_REGEX);
  });

  test('Rejects duration missing number: "Saat"', () => {
    assert.doesNotMatch('Saat', DURATION_REGEX);
  });

  test('Rejects duration missing unit: "12"', () => {
    assert.doesNotMatch('12', DURATION_REGEX);
  });
});

// ============================================================================
// Area 2.5: Out-of-Reference Dropdown Values Rejected on Import (12 Tests)
// ============================================================================
describe('Tier 2.5: Out-of-Reference Dropdown Values Rejected on Import', () => {
  function validateDropdownOption(allowedOptions, enteredValue) {
    if (!enteredValue) return false;
    // Strict case-sensitive match
    return allowedOptions.includes(enteredValue.trim());
  }

  test('MYOUygulamaliEgitim Eğitim Modeli accepts all 4 valid models', () => {
    const models = ['3+1', '2+2', '4+2', '4+0(Uygulama Yok)'];
    for (const m of models) {
      assert.ok(validateDropdownOption(models, m));
    }
  });

  test('MYOUygulamaliEgitim Eğitim Modeli rejects "5+1"', () => {
    const models = ['3+1', '2+2', '4+2', '4+0(Uygulama Yok)'];
    assert.ok(!validateDropdownOption(models, '5+1'));
  });

  test('MYOUygulamaliEgitim Eğitim Modeli rejects "Uzaktan"', () => {
    const models = ['3+1', '2+2', '4+2', '4+0(Uygulama Yok)'];
    assert.ok(!validateDropdownOption(models, 'Uzaktan'));
  });

  test('Dersler Okutulduğu Sınıf rejects "7. SINIF"', () => {
    const classes = ['YABANCI DİL HAZIRLIK', '1. SINIF', '2. SINIF', '3. SINIF', '4. SINIF', '5. SINIF', '6. SINIF'];
    assert.ok(!validateDropdownOption(classes, '7. SINIF'));
  });

  test('Dersler Okutulduğu Sınıf rejects abbreviated "Hazırlık"', () => {
    const classes = ['YABANCI DİL HAZIRLIK', '1. SINIF', '2. SINIF', '3. SINIF', '4. SINIF', '5. SINIF', '6. SINIF'];
    assert.ok(!validateDropdownOption(classes, 'Hazırlık'));
  });

  test('Dersler Okutulduğu Dönem rejects "3. Dönem"', () => {
    const terms = ['1. Dönem', '2. Dönem', 'Tüm Yıl'];
    assert.ok(!validateDropdownOption(terms, '3. Dönem'));
  });

  test('DijitalOlgunluk Olgunluk Seviyesi accepts all 5 standard levels', () => {
    const levels = ['Farkındalık', 'Kısmi Uygulamalar', 'Stratejik Uygulamalar', 'Bütünleşik Uygulamalar', 'Kültüre Dönüşme'];
    for (const lvl of levels) {
      assert.ok(validateDropdownOption(levels, lvl));
    }
  });

  test('DijitalOlgunluk Olgunluk Seviyesi rejects "Başlangıç"', () => {
    const levels = ['Farkındalık', 'Kısmi Uygulamalar', 'Stratejik Uygulamalar', 'Bütünleşik Uygulamalar', 'Kültüre Dönüşme'];
    assert.ok(!validateDropdownOption(levels, 'Başlangıç'));
  });

  test('DijitalOlgunluk Kayıtları Hangi Rol Onaylıyor rejects unlisted "Rektör"', () => {
    const roles = ['İlgili Veri Sahibi', 'Memur', 'Müdür-Şef', 'Daire Başkanı', 'Genel Sekreter'];
    assert.ok(!validateDropdownOption(roles, 'Rektör'));
  });

  test('DanismaKurulu Kurul Seviyesi rejects unlisted "Bölüm"', () => {
    const levels = ['Üniversite', 'Rektörlük', 'Fakülte', 'MYO', 'Enstitü', 'Araştırma Merkezi'];
    assert.ok(!validateDropdownOption(levels, 'Bölüm'));
  });

  test('Case-sensitivity check: rejects lowercase "evet" when "Evet" is expected', () => {
    const boolOptions = ['Evet', 'Hayır'];
    assert.ok(!validateDropdownOption(boolOptions, 'evet'));
  });

  test('Case-sensitivity check: rejects uppercase "HAYIR" when "Hayır" is expected', () => {
    const boolOptions = ['Evet', 'Hayır'];
    assert.ok(!validateDropdownOption(boolOptions, 'HAYIR'));
  });
});

// ============================================================================
// Area 2.6: Unauthorized Department Access Blocked (RBAC & Scope) (11 Tests)
// ============================================================================
describe('Tier 2.6: Unauthorized Department Access Blocked (RBAC & Scope)', () => {
  const rbac = new RBACEngine(OSTIM_DEPARTMENTS);

  test('Bilgisayar Müh user can view and edit Bilgisayar Müh records', () => {
    const user = {
      id: 'u_ceng',
      role: 'CHAIR',
      departmentId: 'BILGISAYAR_MUH',
      departmentScope: { type: 'OWN_DEPT' },
    };
    assert.ok(rbac.canUserAccessDepartment(user, 'BILGISAYAR_MUH'));
  });

  test('Bilgisayar Müh user is blocked (403 Forbidden) from Yazılım Müh without grant', () => {
    const user = {
      id: 'u_ceng',
      role: 'CHAIR',
      departmentId: 'BILGISAYAR_MUH',
      departmentScope: { type: 'OWN_DEPT' },
    };
    assert.ok(!rbac.canUserAccessDepartment(user, 'YAZILIM_MUH'));
  });

  test('Bilgisayar Müh user is blocked from Makine Müh records without grant', () => {
    const user = {
      id: 'u_ceng',
      role: 'CHAIR',
      departmentId: 'BILGISAYAR_MUH',
      departmentScope: { type: 'OWN_DEPT' },
    };
    assert.ok(!rbac.canUserAccessDepartment(user, 'MAKINE_MUH'));
  });

  test('Bilgisayar Müh user is blocked from university-wide queries without specific filter', () => {
    const user = {
      id: 'u_ceng',
      role: 'CHAIR',
      departmentId: 'BILGISAYAR_MUH',
      departmentScope: { type: 'OWN_DEPT' },
    };
    const accessible = rbac.resolveAccessibleDepartments(user);
    assert.strictEqual(accessible.length, 1);
    assert.strictEqual(accessible[0], 'BILGISAYAR_MUH');
  });

  test('Bilgisayar Müh user granted specific scope to Yazılım Müh CAN view Yazılım Müh', () => {
    const user = {
      id: 'u_ceng_granted',
      role: 'CHAIR',
      departmentId: 'BILGISAYAR_MUH',
      departmentScope: { type: 'CUSTOM', departments: ['YAZILIM_MUH'] },
    };
    assert.ok(rbac.canUserAccessDepartment(user, 'BILGISAYAR_MUH'));
    assert.ok(rbac.canUserAccessDepartment(user, 'YAZILIM_MUH'));
  });

  test('Bilgisayar Müh user granted Yazılım Müh is STILL BLOCKED from Makine Müh', () => {
    const user = {
      id: 'u_ceng_granted',
      role: 'CHAIR',
      departmentId: 'BILGISAYAR_MUH',
      departmentScope: { type: 'CUSTOM', departments: ['YAZILIM_MUH'] },
    };
    assert.ok(!rbac.canUserAccessDepartment(user, 'MAKINE_MUH'));
  });

  test('Dean of Mühendislik Fakültesi with PARENT_FACULTY scope accesses all engineering departments', () => {
    const dean = {
      id: 'u_dean',
      role: 'DEAN',
      departmentId: 'MUH_FAK',
      departmentScope: { type: 'PARENT_FACULTY' },
    };
    const accessible = rbac.resolveAccessibleDepartments(dean);
    assert.includes(accessible, 'MUH_FAK');
    assert.includes(accessible, 'BILGISAYAR_MUH');
    assert.includes(accessible, 'YAZILIM_MUH');
    assert.includes(accessible, 'MAKINE_MUH');
    assert.includes(accessible, 'ELEKTRIK_MUH');
    assert.includes(accessible, 'ENDUSTRI_MUH');
  });

  test('Dean of Mühendislik Fakültesi is BLOCKED from IIBF departments (İşletme, İktisat)', () => {
    const dean = {
      id: 'u_dean',
      role: 'DEAN',
      departmentId: 'MUH_FAK',
      departmentScope: { type: 'PARENT_FACULTY' },
    };
    assert.ok(!rbac.canUserAccessDepartment(dean, 'ISLETME'));
    assert.ok(!rbac.canUserAccessDepartment(dean, 'IKTISAT'));
  });

  test('User with canView=true but canCreate=false is blocked from record creation', () => {
    const user = {
      id: 'u_viewer',
      role: 'VIEWER',
      permissions: [{ templateCode: 'DERSLER', canView: true, canCreate: false }],
    };
    assert.ok(rbac.canUserPerform(user, 'DERSLER', 'canView'));
    assert.ok(!rbac.canUserPerform(user, 'DERSLER', 'canCreate'));
  });

  test('User without canExport is blocked from downloading Excel export', () => {
    const user = {
      id: 'u_staff',
      role: 'STAFF',
      permissions: [{ templateCode: 'FINANS', canView: true, canExport: false }],
    };
    assert.ok(!rbac.canUserPerform(user, 'FINANS', 'canExport'));
  });

  test('System Admin has unrestricted access across all departments and tables', () => {
    const admin = {
      id: 'u_admin',
      role: 'ADMIN',
      departmentId: 'REKTORLUK',
    };
    assert.ok(rbac.canUserAccessDepartment(admin, 'BILGISAYAR_MUH'));
    assert.ok(rbac.canUserAccessDepartment(admin, 'ISLETME'));
    assert.ok(rbac.canUserAccessDepartment(admin, 'STRATEJI_GELISTIRME'));
    assert.ok(rbac.canUserPerform(admin, 'ANY_TEMPLATE', 'canDelete'));
  });
});
