/**
 * fixedTemplates.js
 * 
 * Defines the 6 Fixed-Row Matrix & Survey Templates for YÖK İzleme:
 * 1. ENERJI (28 rows)
 * 2. FINANS (34 rows)
 * 3. KARBON_AYAKIZI (6 rows)
 * 4. ATIK (6 rows)
 * 5. SORU_SETI (22 rows)
 * 6. DIJITAL_OLGUNLUK (106 rows)
 */

const {
  SORU_SETI_QUESTIONS,
  DIJITAL_OLGUNLUK_QUESTIONS,
  DIJITAL_APPROVAL_ROLES,
  DIJITAL_ACCESS_TYPES,
  DIJITAL_ACCESS_LEVELS,
  DIJITAL_MATURITY_LEVELS
} = require('./referenceDictionaries');

// 1. ENERJI
const ENERJI_ROWS = [
  { rowIndex: 1, rowKey: 'unit_rektorluk', label: 'Rektörlük', tur: 'Tüketim' },
  { rowIndex: 2, rowKey: 'unit_fakulteler', label: 'Fakülteler', tur: 'Tüketim' },
  { rowIndex: 3, rowKey: 'unit_myolar', label: 'MYO lar', tur: 'Tüketim' },
  { rowIndex: 4, rowKey: 'unit_enstituler', label: 'Enstitüler', tur: 'Tüketim' },
  { rowIndex: 5, rowKey: 'unit_hastaneler', label: 'Hastaneler', tur: 'Tüketim' },
  { rowIndex: 6, rowKey: 'unit_kutuphane', label: 'Kütüphane', tur: 'Tüketim' },
  { rowIndex: 7, rowKey: 'unit_diger', label: 'Diğer', tur: 'Tüketim' },
  { rowIndex: 8, rowKey: 'total_birim', label: 'Toplam', tur: 'Tüketim', isSummary: true, isReadonly: true, formula: 'SUM(rows[1..7])' },
  { rowIndex: 9, rowKey: 'act_lab', label: 'Laboratuvar Ders faaliyetleri', tur: 'Tüketim' },
  { rowIndex: 10, rowKey: 'act_arge', label: 'Ar-Ge faaliyetleri', tur: 'Tüketim' },
  { rowIndex: 11, rowKey: 'act_uretim', label: 'Üretim Faaliyetleri', tur: 'Tüketim' },
  { rowIndex: 12, rowKey: 'act_egitim', label: 'Eğitim-Öğretim  Faaliyetleri', tur: 'Tüketim' },
  { rowIndex: 13, rowKey: 'act_idari', label: 'İdari faaliyetler', tur: 'Tüketim' },
  { rowIndex: 14, rowKey: 'act_saglik', label: 'Sağlık Hizmetleri', tur: 'Tüketim' },
  { rowIndex: 15, rowKey: 'act_diger2', label: 'Diğer2', tur: 'Tüketim' },
  { rowIndex: 16, rowKey: 'total_faaliyet', label: 'Toplam2', tur: 'Tüketim', isSummary: true, isReadonly: true, formula: 'SUM(rows[9..15])' },
  { rowIndex: 17, rowKey: 'sup_sebeke', label: 'Dağıtım Şirketleri/Belediye', tur: 'Temin' },
  { rowIndex: 18, rowKey: 'sup_hes', label: 'HES', tur: 'Temin' },
  { rowIndex: 19, rowKey: 'sup_gunes', label: 'Güneş Enerjisi', tur: 'Temin' },
  { rowIndex: 20, rowKey: 'sup_jes', label: 'JES', tur: 'Temin' },
  { rowIndex: 21, rowKey: 'sup_res', label: 'RES', tur: 'Temin' },
  { rowIndex: 22, rowKey: 'sup_diger_elektrik', label: 'Diğer Elektrik', tur: 'Temin' },
  { rowIndex: 23, rowKey: 'sup_yagmur_hasati', label: 'Yağmur Hasatı', tur: 'Temin' },
  { rowIndex: 24, rowKey: 'sup_baraj', label: 'Baraj', tur: 'Temin' },
  { rowIndex: 25, rowKey: 'sup_kuyu', label: 'Kuyu', tur: 'Temin' },
  { rowIndex: 26, rowKey: 'sup_gri_su', label: 'Gri su kullanımı, mor şebeke vb.', tur: 'Temin' },
  { rowIndex: 27, rowKey: 'sup_aritma', label: 'Arıtma', tur: 'Temin' },
  { rowIndex: 28, rowKey: 'sup_diger_su', label: 'Diğer Su', tur: 'Temin' }
];

const ENERJI_TEMPLATE = {
  code: 'ENERJI',
  title: 'Enerji ve Su Tüketimi/Temini',
  category: 'Çevre ve Altyapı',
  type: 'FIXED',
  description: 'Üniversite birimleri ve faaliyetleri bazında elektrik ve su tüketim ve temin göstergeleri tablosu',
  dataStartRow: 9,
  excelTemplatePath: 'Enerji - 2026.xlsx',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'siraNo', label: 'Sıra No', type: 'integer', required: true, order: 1 },
    { key: 'tur', label: 'Tür', type: 'text', required: true, order: 2 },
    { key: 'label', label: 'Tüketim-Temin', type: 'text', required: true, order: 3 },
    { key: 'elektrik', label: 'Elektrik Tüketim/Temin (kW-saat)', type: 'decimal', min: 0, order: 4 },
    { key: 'su', label: 'Su Tüketim/Temin (m3)', type: 'decimal', min: 0, order: 5 }
  ],
  fixedRows: ENERJI_ROWS
};

// 2. FINANS
const FINANS_ROWS = [
  { rowIndex: 1, rowKey: 'inc_hazine_cari', label: 'Hazine Yardımı (Cari) *', tur: 'Gelir' },
  { rowIndex: 2, rowKey: 'inc_hazine_sermaye', label: 'Hazine Yardımı (Sermaye)*', tur: 'Gelir' },
  { rowIndex: 3, rowKey: 'inc_vakif_bagis', label: 'Kurucu Vakıf Bağışları*', tur: 'Gelir' },
  { rowIndex: 4, rowKey: 'inc_dis_kaynak_arge', label: 'Dış Kaynakla Fonlanan Araştırma Projeleri Geliri *', tur: 'Gelir' },
  { rowIndex: 5, rowKey: 'inc_katki_payi', label: 'Öğrenci Katkı Payı Telafi Gelirleri *, **', tur: 'Gelir' },
  { rowIndex: 6, rowKey: 'inc_uam_kar', label: 'Uygulama Araştırma Merkezlerinin Karları*', tur: 'Gelir' },
  { rowIndex: 7, rowKey: 'inc_kira', label: 'Kira Gelirleri*', tur: 'Gelir' },
  { rowIndex: 8, rowKey: 'inc_ogrenci_diger', label: 'Öğrenci Gelirleri (İkinci öğretim, uzaktan öğretim,  açık öğretim,  yaz okulu)*', tur: 'Gelir' },
  { rowIndex: 9, rowKey: 'inc_diger_arastirma', label: 'Diğer Araştırma Gelirleri*', tur: 'Gelir' },
  { rowIndex: 10, rowKey: 'inc_dis_bagislar', label: 'Kurucu Vakıf Harici Bağışlar  (Devlet Üniv. dahil)*', tur: 'Gelir' },
  { rowIndex: 11, rowKey: 'inc_diger', label: 'Diğer (Yukarıda olmayan diğer kalemler)*', tur: 'Gelir' },
  { rowIndex: 12, rowKey: 'inc_doner_butce', label: 'Döner Sermayeden Bütçeye Aktarılan*', tur: 'Gelir' },
  { rowIndex: 13, rowKey: 'inc_doner_bap', label: "Döner Sermayeden BAP'a Aktarılan*", tur: 'Gelir' },
  { rowIndex: 14, rowKey: 'inc_doner_toplam', label: 'Döner Sermaye Gelirleri (UAM Hariç) Toplam ', tur: 'Gelir' },
  { rowIndex: 15, rowKey: 'inc_topluma_hizmet', label: 'Topluma Hizmet Gelirleri', tur: 'Gelir' },
  { rowIndex: 16, rowKey: 'total_gelir', label: 'Toplam Gelir', tur: 'Gelir', isSummary: true, isReadonly: true, formula: 'SUM(rows[1..12])' },
  { rowIndex: 17, rowKey: 'exp_yatirim_genel', label: 'Yatırım Giderleri (Araştırma Giderleri hariç) *', tur: 'Gider' },
  { rowIndex: 18, rowKey: 'exp_yatirim_arge', label: 'Yatırım Bütçesinden Harcanan Araştırma Giderleri *', tur: 'Gider' },
  { rowIndex: 19, rowKey: 'exp_cari_arge', label: 'Yatırım Bütçesi dışında Harcanan Araştırma Giderleri *', tur: 'Gider' },
  { rowIndex: 20, rowKey: 'exp_kutuphane', label: 'Kitap & Yayın Alımı *', tur: 'Gider' },
  { rowIndex: 21, rowKey: 'exp_burslar', label: 'Burslar *', tur: 'Gider' },
  { rowIndex: 22, rowKey: 'exp_akademik_personel', label: 'Akademik Personel Gideri', tur: 'Gider' },
  { rowIndex: 23, rowKey: 'exp_idari_personel', label: 'İdari Personel Gideri', tur: 'Gider' },
  { rowIndex: 24, rowKey: 'exp_bina_bakim', label: 'Bina Bakım Giderleri (cari) *', tur: 'Gider' },
  { rowIndex: 25, rowKey: 'exp_elektrik', label: 'Elektrik Giderleri *', tur: 'Gider' },
  { rowIndex: 26, rowKey: 'exp_su', label: 'Su Giderleri *', tur: 'Gider' },
  { rowIndex: 27, rowKey: 'exp_dogalgaz_komur', label: 'Doğalgaz & Kömür Giderleri *', tur: 'Gider' },
  { rowIndex: 28, rowKey: 'exp_arac_yakit', label: 'Araç Yakıt Giderleri *', tur: 'Gider' },
  { rowIndex: 29, rowKey: 'exp_yonetim', label: 'Yönetim Giderleri ', tur: 'Gider' },
  { rowIndex: 30, rowKey: 'exp_tanitim', label: 'Tanıtım/Reklam Giderleri', tur: 'Gider' },
  { rowIndex: 31, rowKey: 'exp_diger', label: 'Diğer (Yukarıda olmayan diğer giderler)', tur: 'Gider' },
  { rowIndex: 32, rowKey: 'exp_kasa', label: 'Mali Yıl Sonu Kasası', tur: 'Gider' },
  { rowIndex: 33, rowKey: 'exp_topluma_hizmet', label: 'Topluma Hizmet Giderleri ', tur: 'Gider' },
  { rowIndex: 34, rowKey: 'total_gider', label: 'Toplam Gider', tur: 'Gider', isSummary: true, isReadonly: true, formula: 'SUM(rows[17..32])' }
];

const FINANS_TEMPLATE = {
  code: 'FINANS',
  title: 'Gerçekleşen Temel Finans Verileri',
  category: 'Finans ve Bütçe',
  type: 'FIXED',
  description: 'Üniversitenin mali yıl sonu gerçekleşen gelir ve gider kalemleri tablosu',
  dataStartRow: 8,
  excelTemplatePath: 'Finans (3).xlsx',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'siraNo', label: 'Sıra No', type: 'integer', required: true, order: 1 },
    { key: 'tur', label: 'Tür', type: 'text', required: true, order: 2 },
    { key: 'kalem', label: 'Gelir-Gider Kalemi', type: 'text', required: true, order: 3 },
    { key: 'tutar', label: 'Tutar (TL)', type: 'decimal', order: 4 },
    { key: 'kasaFarki', label: 'Kasa Farkı / Durum', type: 'formula', order: 5 }
  ],
  fixedRows: FINANS_ROWS
};

// 3. KARBON_AYAKIZI
const KARBON_ROWS = [
  { rowIndex: 1, rowKey: 'birim_rektorluk', label: 'Rektörlük' },
  { rowIndex: 2, rowKey: 'birim_fakulteler', label: 'Fakülteler' },
  { rowIndex: 3, rowKey: 'birim_myolar', label: 'MYO lar' },
  { rowIndex: 4, rowKey: 'birim_enstituler', label: 'Enstitüler' },
  { rowIndex: 5, rowKey: 'birim_hastaneler', label: 'Hastaneler' },
  { rowIndex: 6, rowKey: 'birim_diger', label: 'Diğer' }
];

const KARBON_AYAKIZI_TEMPLATE = {
  code: 'KARBON_AYAKIZI',
  title: 'Karbon Ayak İzi',
  category: 'Çevre ve Altyapı',
  type: 'FIXED',
  description: 'Kurumsal yakıt tüketimleri ve karbon ayak izi hesaplama matrisi',
  dataStartRow: 7,
  excelTemplatePath: 'KarbonAyakizi 2026.xlsx',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'siraNo', label: 'Sıra No', type: 'integer', required: true, order: 1 },
    { key: 'birim', label: 'Birim', type: 'text', required: true, order: 2 },
    { key: 'dogalgaz', label: 'Doğalgaz (m3)', type: 'decimal', min: 0, order: 3 },
    { key: 'komur', label: 'Kömür (ton)', type: 'decimal', min: 0, order: 4 },
    { key: 'dizel', label: 'Dizel (lt)', type: 'decimal', min: 0, order: 5 },
    { key: 'benzin', label: 'Benzin (lt)', type: 'decimal', min: 0, order: 6 },
    { key: 'fuelOil', label: 'Fuel Oil (ton)', type: 'decimal', min: 0, order: 7 },
    { key: 'karbonAyakiziDegeri', label: 'Karbon Ayak İzi (kg CO2e)', type: 'formula', order: 8 }
  ],
  fixedRows: KARBON_ROWS
};

// 4. ATIK
const ATIK_ROWS = [
  { rowIndex: 1, rowKey: 'birim_rektorluk', label: 'Rektörlük' },
  { rowIndex: 2, rowKey: 'birim_fakulteler', label: 'Fakülteler' },
  { rowIndex: 3, rowKey: 'birim_myolar', label: 'MYO lar' },
  { rowIndex: 4, rowKey: 'birim_enstituler', label: 'Enstitüler' },
  { rowIndex: 5, rowKey: 'birim_hastaneler', label: 'Hastaneler' },
  { rowIndex: 6, rowKey: 'birim_diger', label: 'Diğer' }
];

const ATIK_TEMPLATE = {
  code: 'ATIK',
  title: 'Atıklar ve Geri Dönüşüm',
  category: 'Çevre ve Altyapı',
  type: 'FIXED',
  description: 'Kurumsal atık üretimi ve geri dönüşüm miktarları matrisi',
  dataStartRow: 10,
  excelTemplatePath: 'Atik (4).xlsx',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'siraNo', label: 'Sıra No', type: 'integer', required: true, order: 1 },
    { key: 'birimler', label: 'Birimler', type: 'text', required: true, order: 2 },
    { key: 'organikAtik', label: 'Organik Atık (ton)', type: 'decimal', min: 0, max: 1000000, order: 3 },
    { key: 'tibbiAtik', label: 'Tıbbi Atık (ton)', type: 'decimal', min: 0, max: 1000000, order: 4 },
    { key: 'inorganikAtik', label: 'İnorganik Atık (ton)', type: 'decimal', min: 0, max: 1000000, order: 5 },
    { key: 'elektronikAtik', label: 'Elektronik Atık (ton)', type: 'decimal', min: 0, max: 1000000, order: 6 },
    { key: 'digerAtik', label: 'Diğer Atık (ton)', type: 'decimal', min: 0, max: 1000000, order: 7 },
    { key: 'plastikGeriDonusum', label: 'Plastik Geri Dönüşüm (ton)', type: 'decimal', min: 0, max: 1000000, order: 8 },
    { key: 'camGeriDonusum', label: 'Cam Geri Dönüşüm (ton)', type: 'decimal', min: 0, max: 1000000, order: 9 },
    { key: 'kagitGeriDonusum', label: 'Kağıt Geri Dönüşüm (ton)', type: 'decimal', min: 0, max: 1000000, order: 10 },
    { key: 'evselGeriDonusum', label: 'Evsel Geri Dönüşüm (ton)', type: 'decimal', min: 0, max: 1000000, order: 11 },
    { key: 'digerGeriDonusum', label: 'Diğer Geri Dönüşüm (ton)', type: 'decimal', min: 0, max: 1000000, order: 12 }
  ],
  fixedRows: ATIK_ROWS
};

// 5. SORU_SETI
const SORU_SETI_BOUNDS = [
  { min: 0, max: 10000000 },
  { min: 0, max: 100 },
  { min: 0, max: 45 },
  { min: 0, max: 10000000 },
  { min: 0, max: 10000000 },
  { min: 0, max: 100 },
  { min: 0, max: 100 },
  { min: 0, max: 100000 },
  { min: 0, max: 100 },
  { min: 0, max: 100 },
  { min: 0, max: 10000000000 },
  { min: 0, max: 10000000000 },
  { min: 0, max: 100 },
  { min: 0, max: 100 },
  { min: 0, max: 100 },
  { min: 0, max: 100 },
  { min: 0, max: 1000 },
  { min: 0, max: 10000 },
  { min: 0, max: 10000 },
  { min: 0, max: 10000 },
  { min: 0, max: 10000 },
  { min: 0, max: 10000 }
];

const SORU_SETI_ROWS = SORU_SETI_QUESTIONS.map((q, idx) => ({
  rowIndex: idx + 1,
  rowKey: `soru_${idx + 1}`,
  label: q,
  customRules: {
    min: SORU_SETI_BOUNDS[idx]?.min ?? 0,
    max: SORU_SETI_BOUNDS[idx]?.max ?? 1000000000,
    requiresExplanationIfOver89: idx === 8 || idx === 9 // Rows 9 and 10
  }
}));

const SORU_SETI_TEMPLATE = {
  code: 'SORU_SETI',
  title: 'Soru Seti Göstergeleri',
  category: 'Kurumsal İzleme',
  type: 'FIXED',
  description: 'Kurum genel göstergeleri ve değerlendirme soru seti',
  dataStartRow: 6,
  excelTemplatePath: 'SoruSeti (3).xlsx',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'siraNo', label: 'Sıra No', type: 'integer', required: true, order: 1 },
    { key: 'soru', label: 'Soru / Gösterge', type: 'text', required: true, order: 2 },
    { key: 'cevap', label: 'Cevap', type: 'integer', order: 3 },
    { key: 'not', label: 'Not / Kural', type: 'formula', order: 4 },
    { key: 'aciklama', label: 'Açıklama', type: 'text', order: 5 }
  ],
  fixedRows: SORU_SETI_ROWS
};

// 6. DIJITAL_OLGUNLUK
const DIJITAL_OLGUNLUK_ROWS = DIJITAL_OLGUNLUK_QUESTIONS.map((qItem) => ({
  rowIndex: qItem.index,
  rowKey: `dijital_q_${qItem.index}`,
  label: qItem.question,
  customRules: {
    dimension: qItem.dimension
  }
}));

const DIJITAL_OLGUNLUK_TEMPLATE = {
  code: 'DIJITAL_OLGUNLUK',
  title: 'Dijital Olgunluk Anketi',
  category: 'Kurumsal İzleme',
  type: 'FIXED',
  description: 'Yükseköğretimde Dijital Olgunluk Seviyesi 5 Boyutlu Değerlendirme Anketi',
  dataStartRow: 15,
  excelTemplatePath: 'DijitalOlgunlukAnketi.xlsx',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'questionId', label: 'Soru No', type: 'integer', required: true, order: 1 },
    { key: 'dimension', label: 'Boyut', type: 'text', required: true, order: 2 },
    { key: 'question', label: 'Soru', type: 'text', required: true, order: 3 },
    { key: 'applicationName', label: 'Kullanılan Uygulama İsmi', type: 'text', required: true, order: 4 },
    { key: 'approvalRole', label: 'Kayıtları Hangi Rol Onaylıyor', type: 'select', required: true, options: DIJITAL_APPROVAL_ROLES, order: 5 },
    { key: 'dataSource', label: 'Varsa Veri Kaynağı', type: 'text', order: 6 },
    { key: 'accessType', label: 'Erişim Tipi', type: 'select', required: true, options: DIJITAL_ACCESS_TYPES, order: 7 },
    { key: 'accessLevel', label: 'Erişim Seviyesi', type: 'select', required: true, options: DIJITAL_ACCESS_LEVELS, order: 8 },
    { key: 'annualUserCount', label: 'Yıllık Kullanıcı Sayısı', type: 'integer', required: true, min: 0, max: 100000000, order: 9 },
    { key: 'annualUniqueUserCount', label: 'Yıllık Tekil Kullanıcı Sayısı', type: 'integer', required: true, min: 0, max: 100000000, order: 10 },
    { key: 'performanceMetric', label: 'Varsa Yıllık Performans Ölçümü', type: 'text', order: 11 },
    { key: 'strategicGoalNo', label: 'Stratejik Amaç/Hedef Numarası', type: 'text', order: 12 },
    { key: 'strategicGoalDesc', label: 'Stratejik Amaç/Hedef Tanımı', type: 'text', order: 13 },
    { key: 'dataHistoryYears', label: 'Uygulamanın Kaç Yıllık Verisi Var', type: 'integer', required: true, min: 0, max: 100, order: 14 },
    { key: 'maturityLevel', label: 'Olgunluk Seviyesi', type: 'select', required: true, options: DIJITAL_MATURITY_LEVELS, order: 15 }
  ],
  fixedRows: DIJITAL_OLGUNLUK_ROWS
};

module.exports = [
  ENERJI_TEMPLATE,
  FINANS_TEMPLATE,
  KARBON_AYAKIZI_TEMPLATE,
  ATIK_TEMPLATE,
  SORU_SETI_TEMPLATE,
  DIJITAL_OLGUNLUK_TEMPLATE
];
