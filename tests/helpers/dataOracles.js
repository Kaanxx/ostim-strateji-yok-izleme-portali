/**
 * Data Oracles & Specification Rules for YÖK Templates
 * 
 * Authoritative ground truth derived from:
 * - 2025-2026 yök izleme şablonlar
 * - ORIGINAL_REQUEST.md
 * - spec_miner_survey_2/analysis.md
 * - spec_miner_survey_3/analysis.md
 */

const path = require('path');
const { ZipReader } = require('./zipUtil');

const TEMPLATES_DIR = path.resolve(__dirname, '../../2025-2026 yök izleme şablonlar');

// 24 YÖK Template Catalog
const YOK_TEMPLATES = [
  {
    code: 'ALANLAR',
    filename: 'Alanlar (4).xlsx',
    type: 'DYNAMIC',
    primarySheet: 'Alanlar',
    headerRow: 5,
    mandatoryRow: 6,
    dataStartRow: 7,
    expectedColumns: 25,
    fixedRowCount: null,
  },
  {
    code: 'ATIK',
    filename: 'Atik (4).xlsx',
    type: 'FIXED',
    primarySheet: 'Atik',
    headerRow: 9,
    mandatoryRow: null,
    dataStartRow: 10,
    expectedColumns: 12,
    fixedRowCount: 6,
    fixedUnits: ['Rektörlük', 'Fakülteler', 'MYO lar', 'Enstitüler', 'Hastaneler', 'Diğer'],
  },
  {
    code: 'BURSLAR',
    filename: 'Burslar (3).xlsx',
    type: 'DYNAMIC',
    primarySheet: 'Burslar',
    headerRow: 6,
    mandatoryRow: 7,
    dataStartRow: 16,
    expectedColumns: 5,
    fixedRowCount: null,
  },
  {
    code: 'DANISMA_KURULU',
    filename: 'DanismaKurulu (3).xlsx',
    type: 'DYNAMIC',
    primarySheet: 'DanismaKurulu',
    headerRow: 4,
    mandatoryRow: 5,
    dataStartRow: 12,
    expectedColumns: 10,
    fixedRowCount: null,
  },
  {
    code: 'DERSLER',
    filename: 'Dersler (7).xlsx',
    type: 'DYNAMIC',
    primarySheet: 'Dersler',
    headerRow: 7,
    mandatoryRow: 8,
    dataStartRow: 9,
    expectedColumns: 18,
    fixedRowCount: null,
  },
  {
    code: 'DIJITAL_OLGUNLUK',
    filename: 'DijitalOlgunlukAnketi.xlsx',
    type: 'FIXED',
    primarySheet: 'DijitalOlgunlukAnketi',
    headerRow: 10,
    mandatoryRow: 11,
    dataStartRow: 15,
    expectedColumns: 15,
    fixedRowCount: 106,
  },
  {
    code: 'EGITICILERIN_EGITIMI',
    filename: 'EgiticilerinEgitimi (3).xlsx',
    type: 'DYNAMIC',
    primarySheet: 'EgiticilerinEgitimi',
    headerRow: 5,
    mandatoryRow: 6,
    dataStartRow: 7,
    expectedColumns: 10,
    fixedRowCount: null,
  },
  {
    code: 'ENERJI',
    filename: 'Enerji - 2026.xlsx',
    type: 'FIXED',
    primarySheet: 'Enerji',
    headerRow: 8,
    mandatoryRow: null,
    dataStartRow: 9,
    expectedColumns: 5,
    fixedRowCount: 28,
  },
  {
    code: 'ETKINLIK',
    filename: 'Etkinlik 2025-2026.xlsx',
    type: 'DYNAMIC',
    primarySheet: 'Etkinlik',
    headerRow: 7,
    mandatoryRow: 8,
    dataStartRow: 9,
    expectedColumns: 17,
    fixedRowCount: null,
  },
  {
    code: 'FINANS',
    filename: 'Finans (3).xlsx',
    type: 'FIXED',
    primarySheet: 'Finans',
    headerRow: 7,
    mandatoryRow: null,
    dataStartRow: 8,
    expectedColumns: 5,
    fixedRowCount: 34,
  },
  {
    code: 'FIRMALAR',
    filename: 'Firmalar (3).xlsx',
    type: 'DYNAMIC',
    primarySheet: 'Firmalar',
    headerRow: 6,
    mandatoryRow: 7,
    dataStartRow: 8,
    expectedColumns: 18,
    fixedRowCount: null,
  },
  {
    code: 'HAREKETLILIK',
    filename: 'Hareketlilik (3).xlsx',
    type: 'DYNAMIC',
    primarySheet: 'Hareketlilik',
    headerRow: 6,
    mandatoryRow: 7,
    dataStartRow: 8,
    expectedColumns: 8,
    fixedRowCount: null,
    countryCount: 226,
  },
  {
    code: 'KARBON_AYAKIZI',
    filename: 'KarbonAyakizi 2026.xlsx',
    type: 'FIXED',
    primarySheet: 'KarbonAyakizi',
    headerRow: 6,
    mandatoryRow: null,
    dataStartRow: 7,
    expectedColumns: 8,
    fixedRowCount: 6,
    fixedUnits: ['Rektörlük', 'Fakülteler', 'MYO lar', 'Enstitüler', 'Hastaneler', 'Diğer'],
  },
  {
    code: 'MYO_UYGULAMALI_EGITIM',
    filename: 'MYOUygulamaliEgitim (2).xlsm',
    type: 'DYNAMIC_MACRO',
    primarySheet: 'Onlisans',
    headerRow: 5,
    mandatoryRow: null,
    dataStartRow: 7,
    expectedColumns: 37,
    fixedRowCount: null,
    isMacro: true,
  },
  {
    code: 'MEMNUNIYET_ANKETI',
    filename: 'MemnuniyetAnketi (3).xlsx',
    type: 'DYNAMIC',
    primarySheet: 'MemnuniyetAnketleri',
    headerRow: 5,
    mandatoryRow: 6,
    dataStartRow: 7,
    expectedColumns: 9,
    fixedRowCount: null,
  },
  {
    code: 'MEZUN_TAKIP_SISTEMI',
    filename: 'MezunTakipSistemi 2025-2026.xlsx',
    type: 'DYNAMIC',
    primarySheet: 'MezunTS',
    headerRow: 6,
    mandatoryRow: 7,
    dataStartRow: 8,
    expectedColumns: 6,
    fixedRowCount: null,
  },
  {
    code: 'ODULLER',
    filename: 'Oduller (4).xlsx',
    type: 'DYNAMIC',
    primarySheet: 'Oduller',
    headerRow: 4,
    mandatoryRow: 5,
    dataStartRow: 6,
    expectedColumns: 10,
    fixedRowCount: null,
    countryCount: 223,
  },
  {
    code: 'OGRENCI_TOPLULUKLARI',
    filename: 'OgrenciTopluluklari (3).xlsx',
    type: 'DYNAMIC',
    primarySheet: 'OgrenciTopluluklari',
    headerRow: 6,
    mandatoryRow: 7,
    dataStartRow: 8,
    expectedColumns: 13,
    fixedRowCount: null,
  },
  {
    code: 'OZDEGERLENDIRME',
    filename: 'Ozdegerlendirme (3).xlsx',
    type: 'DYNAMIC',
    primarySheet: 'Ozdegerlendirme',
    headerRow: 5,
    mandatoryRow: null,
    dataStartRow: 6,
    expectedColumns: 2,
    fixedRowCount: null,
  },
  {
    code: 'PATENT',
    filename: 'Patent - 2026.xlsx',
    type: 'DYNAMIC',
    primarySheet: 'Patent',
    headerRow: 7,
    mandatoryRow: 8,
    dataStartRow: 9,
    expectedColumns: 10,
    fixedRowCount: null,
  },
  {
    code: 'PAYDAS',
    filename: 'Paydas (3).xlsx',
    type: 'DYNAMIC',
    primarySheet: 'Paydas',
    headerRow: 5,
    mandatoryRow: 6,
    dataStartRow: 7,
    expectedColumns: 5,
    fixedRowCount: null,
  },
  {
    code: 'PROJELER',
    filename: 'Projeler 2025-2026.xlsm',
    type: 'DYNAMIC_MACRO',
    primarySheet: 'Projeler',
    headerRow: 11,
    mandatoryRow: 12,
    dataStartRow: 15,
    expectedColumns: 40,
    fixedRowCount: null,
    isMacro: true,
  },
  {
    code: 'SEM',
    filename: 'SEM (3).xlsx',
    type: 'DYNAMIC',
    primarySheet: 'SEM',
    headerRow: 5,
    mandatoryRow: 6,
    dataStartRow: 7,
    expectedColumns: 10,
    fixedRowCount: null,
  },
  {
    code: 'SORU_SETI',
    filename: 'SoruSeti (3).xlsx',
    type: 'FIXED',
    primarySheet: 'SoruSeti',
    headerRow: 5,
    mandatoryRow: null,
    dataStartRow: 6,
    expectedColumns: 5,
    fixedRowCount: 22,
  },
];

// Fixed 27 Sectors from MYOUygulamaliEgitim listeler!E2:E28
const MYO_SECTORS = [
  'Adalet ve Güvenlik',
  'Ağaç İşleri, Kağıt ve Kağıt Ürünleri',
  'Bilişim Teknolojileri',
  'Cam, Çimento ve Toprak',
  'Çevre',
  'Eğitim',
  'Elektrik ve Elektronik',
  'Enerji',
  'Finans',
  'Gıda',
  'İnşaat',
  'İş ve Yönetim',
  'Kimya, Petrol, Lastik ve Plastik',
  'Kültür, Sanat ve Tasarım',
  'Maden',
  'Makine',
  'Medya, İletişim ve Yayıncılık',
  'Metal',
  'Otomotiv',
  'Sağlık ve Sosyal Hizmetler',
  'Spor ve Rekreasyon',
  'Tarım, Avcılık ve Balıkçılık',
  'Tekstil, Hazır Giyim, Deri',
  'Ticaret (Satış ve Pazarlama)',
  'Toplumsal ve Kişisel Hizmetler',
  'Turizm, Konaklama, Yiyecek-İçecek Hizmetleri',
  'Ulaştırma, Lojistik ve Haberleşme'
];

// Projeler 8 Themes from Referans Değerler!$G$8:$G$15
const PROJELER_THEMES = [
  'Yapay Zeka',
  'Savunma Sanayi',
  'Sürdürülebilirlik',
  'Toplumsal Fayda',
  'Afet Yönetimi',
  'Erişilebilirlik',
  'Enerji-Su-Atık',
  'Diğer'
];

// Projeler 4 Partners from Referans Değerler!$H$8:$H$11
const PROJELER_PARTNERS = [
  'Kamu',
  'Sanayi',
  'STK',
  'Üniversite'
];

// Formula calculation engines matching specification

function calcEnerjiSums(rows) {
  // rows is an array of 28 row objects with { elektrik, su } (1-indexed for convenience or 0-indexed)
  // Unit consumption: rows 1-7 (index 0..6)
  // Toplam (row 8): sum(1..7)
  // Activity consumption: rows 9-15 (index 8..14)
  // Toplam2 (row 16): sum(9..15)
  // Supply: rows 17-28 (index 16..27)
  let toplamElektrik = 0;
  let toplamSu = 0;
  for (let i = 0; i < 7; i++) {
    toplamElektrik += Number(rows[i]?.elektrik || 0);
    toplamSu += Number(rows[i]?.su || 0);
  }

  let toplam2Elektrik = 0;
  let toplam2Su = 0;
  for (let i = 8; i < 15; i++) {
    toplam2Elektrik += Number(rows[i]?.elektrik || 0);
    toplam2Su += Number(rows[i]?.su || 0);
  }

  const isEqual = (toplamElektrik === toplam2Elektrik) && (toplamSu === toplam2Su);
  const status = isEqual ? 'UYUMLU' : 'UYARI: Birim Tüketim Toplamı (Toplam) ile Faaliyet Tüketim Toplamı (Toplam2) Eşit Değil';

  return {
    toplamElektrik,
    toplamSu,
    toplam2Elektrik,
    toplam2Su,
    isEqual,
    status,
  };
}

function calcFinansTotals(rows) {
  // rows: array of 34 row objects with { tutar }
  // Income rows 1..12 (index 0..11) included in Toplam Gelir
  // Grey rows 13 (index 12), 14 (index 13), 15 (index 14) EXCLUDED
  let toplamGelir = 0;
  for (let i = 0; i < 12; i++) {
    toplamGelir += Number(rows[i]?.tutar || 0);
  }

  // Expense rows 17..32 (index 16..31) included in Toplam Gider
  // Note: Row 32 (index 31, Mali Yıl Sonu Kasası) permits negative numbers!
  // Grey row 33 (index 32, Topluma Hizmet Giderleri) EXCLUDED
  let toplamGider = 0;
  for (let i = 16; i < 32; i++) {
    toplamGider += Number(rows[i]?.tutar || 0);
  }

  const kasaFarki = toplamGelir - toplamGider;
  const status = (kasaFarki === 0) ? 'Tamam' : 'Gelir Gider Arasında Kasa Farkı Var';

  return {
    toplamGelir,
    toplamGider,
    kasaFarki,
    status,
    isBalanced: kasaFarki === 0,
  };
}

function calcKarbonFootprint(units) {
  // units: array of 6 unit objects with { dogalgaz, komur, dizel, benzin, fueloil }
  // Formula: 2*SUM(Doğalgaz) + 2460*SUM(Kömür) + 11.5*SUM(Dizel) + 9.5*SUM(Benzin) + 3150*SUM(FuelOil)
  let sumDogalgaz = 0;
  let sumKomur = 0;
  let sumDizel = 0;
  let sumBenzin = 0;
  let sumFuelOil = 0;

  for (const u of units) {
    sumDogalgaz += Number(u.dogalgaz || 0);
    sumKomur += Number(u.komur || 0);
    sumDizel += Number(u.dizel || 0);
    sumBenzin += Number(u.benzin || 0);
    sumFuelOil += Number(u.fueloil || 0);
  }

  const totalEmissions = (2 * sumDogalgaz) +
                         (2460 * sumKomur) +
                         (11.5 * sumDizel) +
                         (9.5 * sumBenzin) +
                         (3150 * sumFuelOil);

  return {
    sumDogalgaz,
    sumKomur,
    sumDizel,
    sumBenzin,
    sumFuelOil,
    totalEmissions,
  };
}

function calcMemnuniyetNormalized(scale, score) {
  // If scale = 5 -> score * 20
  // If scale = 10 -> score * 10
  // If scale = 100 -> score
  if (score === null || score === undefined || score === '') return null;
  const s = Number(score);
  const sc = Number(scale);
  if (sc === 5) return s * 20;
  if (sc === 10) return s * 10;
  if (sc === 100) return s;
  return null;
}

function calcProjelerBudgetCheck(totalBudget, breakdownArray) {
  if (totalBudget === null || totalBudget === undefined || totalBudget === '') {
    return '';
  }
  const q = Number(totalBudget);
  const sumBreakdown = breakdownArray.reduce((acc, val) => acc + Number(val || 0), 0);
  if (Math.abs(q - sumBreakdown) < 0.001) {
    return 'Bütçe Tamam';
  } else {
    return 'Bütçeleri Kontrol Et';
  }
}

function evalSoruSetiWarning(rowNumber, value) {
  // Rows 9 and 10 (Dumansız Hava Sahası, Yeşil Alan)
  const val = Number(value);
  if (rowNumber === 9 || rowNumber === 10) {
    if (val > 89) {
      return `%${val} sağladığınızı nasıl kontrol edebileceğimize dair Açıklama sayfasına Açıklama yapınız.`;
    } else {
      return '0-100 arasında olmalıdır.';
    }
  }
  return null;
}

// Validation rules
const DURATION_REGEX = /^\d+\s*(Saat|Gün|Hafta)$/;

function isValidKVKKDisabledMember(count) {
  if (count === null || count === undefined || count === '') return true;
  const n = Number(count);
  if (isNaN(n) || n < 0) return false;
  if (n === 1 || n === 2) return false; // Blocked under KVKK anonymization
  return true; // 0 or >= 3
}

module.exports = {
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
  DURATION_REGEX,
  isValidKVKKDisabledMember,
};
