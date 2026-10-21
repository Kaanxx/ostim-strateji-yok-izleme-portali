/**
 * institutionalTemplates.js
 * 
 * Defines the 5 Prototype Institutional Categories from PROJE-DOSYASI-main:
 * 1. Research Centers (UAM - 7 tables)
 * 2. Action Plans (6 categories)
 * 3. Ankara Valiliği Briefings (2 tables)
 * 4. TİKA Development Aid (1 table)
 * 5. Educational Services Export (1 table)
 */

const uamColumns = [
  { key: 'merkezAdi', label: 'Merkez Adı', type: 'text', required: true, order: 1 },
  { key: 'faaliyetTuru', label: 'Faaliyet Türü', type: 'select', required: true, options: ['Eğitim', 'Araştırma', 'Yayın', 'Danışmanlık', 'Etkinlik', 'Proje', 'Diğer'], order: 2 },
  { key: 'faaliyetAdi', label: 'Faaliyet Adı', type: 'text', required: true, order: 3 },
  { key: 'tarih', label: 'Faaliyet Tarihi', type: 'date', required: true, order: 4 },
  { key: 'katilimciSayisi', label: 'Katılımcı Sayısı', type: 'integer', min: 0, order: 5 },
  { key: 'gelirTutari', label: 'Elde Edilen Gelir (TL)', type: 'decimal', min: 0, order: 6 },
  { key: 'hedefKitle', label: 'Hedef Kitle', type: 'text', order: 7 }
];

const eylemColumns = [
  { key: 'faaliyetKodu', label: 'Eylem / Faaliyet Kodu', type: 'text', required: true, order: 1 },
  { key: 'eylemTanimi', label: 'Eylem Tanımı ve Kapsamı', type: 'text', required: true, order: 2 },
  { key: 'sorumluBirim', label: 'Sorumlu Birim / Koordinatörlük', type: 'text', required: true, order: 3 },
  { key: 'baslangicTarihi', label: 'Başlangıç Tarihi', type: 'date', required: true, order: 4 },
  { key: 'bitisTarihi', label: 'Bitiş Tarihi', type: 'date', order: 5 },
  { key: 'hedefKitle', label: 'Hedef Kitle', type: 'text', order: 6 },
  { key: 'katilimciSayisi', label: 'Katılımcı / Ulaşılan Kişi Sayısı', type: 'integer', min: 0, order: 7 },
  { key: 'tamamlanmaDurumu', label: 'Tamamlanma Durumu', type: 'select', required: true, options: ['Tamamlandı', 'Devam Ediyor', 'Planlandı', 'İptal Edildi'], order: 8 }
];

const institutionalTemplates = [
  // 1. Research Centers (UAM)
  {
    code: 'UAM_AHI_EVRAN',
    title: 'Ahi Evran Anadolu Müteşebbisliği Veri Tablosu',
    category: 'Uygulama ve Araştırma Merkezleri',
    type: 'DYNAMIC',
    isOfficialYOK: false,
    isActive: true,
    columns: uamColumns
  },
  {
    code: 'UAM_DIL_OGRETIMI',
    title: 'Dil Öğretimi Veri Tablosu',
    category: 'Uygulama ve Araştırma Merkezleri',
    type: 'DYNAMIC',
    isOfficialYOK: false,
    isActive: true,
    columns: uamColumns
  },
  {
    code: 'UAM_ENERJI_TEK',
    title: 'Enerji Teknolojileri Veri Tablosu',
    category: 'Uygulama ve Araştırma Merkezleri',
    type: 'DYNAMIC',
    isOfficialYOK: false,
    isActive: true,
    columns: uamColumns
  },
  {
    code: 'UAM_GIRISIMCILIK',
    title: 'Girişimcilik ve Liderlik Veri Tablosu',
    category: 'Uygulama ve Araştırma Merkezleri',
    type: 'DYNAMIC',
    isOfficialYOK: false,
    isActive: true,
    columns: uamColumns
  },
  {
    code: 'UAM_UZAKTAN_EGITIM',
    title: 'Uzaktan Eğitim Veri Tablosu',
    category: 'Uygulama ve Araştırma Merkezleri',
    type: 'DYNAMIC',
    isOfficialYOK: false,
    isActive: true,
    columns: uamColumns
  },
  {
    code: 'UAM_YASAM_BOYU',
    title: 'Yaşam Boyu Öğrenme Veri Tablosu',
    category: 'Uygulama ve Araştırma Merkezleri',
    type: 'DYNAMIC',
    isOfficialYOK: false,
    isActive: true,
    columns: uamColumns
  },
  {
    code: 'UAM_TTO',
    title: 'Teknoloji Transfer Ofisi Veri Tablosu',
    category: 'Uygulama ve Araştırma Merkezleri',
    type: 'DYNAMIC',
    isOfficialYOK: false,
    isActive: true,
    columns: uamColumns
  },

  // 2. Action Plans
  {
    code: 'EYLEM_ENGELLI_HAKLARI',
    title: 'YÖK Engelli Hakları Ulusal Eylem Planı Anketi',
    category: 'Ulusal Eylem Planları',
    type: 'DYNAMIC',
    isOfficialYOK: false,
    isActive: true,
    columns: eylemColumns
  },
  {
    code: 'EYLEM_COCUK_HAKLARI',
    title: 'YÖK Türkiye Çocuk Hakları Eylem Planı Anketi',
    category: 'Ulusal Eylem Planları',
    type: 'DYNAMIC',
    isOfficialYOK: false,
    isActive: true,
    columns: eylemColumns
  },
  {
    code: 'EYLEM_BAGIMLILIK',
    title: 'YÖK Bağımlılık ile Mücadele Veri Girişi',
    category: 'Ulusal Eylem Planları',
    type: 'DYNAMIC',
    isOfficialYOK: false,
    isActive: true,
    columns: eylemColumns
  },
  {
    code: 'EYLEM_KALKINMA',
    title: 'YÖK Kalkınma Planı Anketi Veri Girişi',
    category: 'Ulusal Eylem Planları',
    type: 'DYNAMIC',
    isOfficialYOK: false,
    isActive: true,
    columns: eylemColumns
  },
  {
    code: 'EYLEM_CESITLI',
    title: 'YÖK Çeşitli Eylem Planları Veri Girişi',
    category: 'Ulusal Eylem Planları',
    type: 'DYNAMIC',
    isOfficialYOK: false,
    isActive: true,
    columns: eylemColumns
  },
  {
    code: 'EYLEM_KADINA_SIDDET',
    title: 'YÖK Kadına Şiddetle Mücadele Veri Girişi',
    category: 'Ulusal Eylem Planları',
    type: 'DYNAMIC',
    isOfficialYOK: false,
    isActive: true,
    columns: eylemColumns
  },

  // 3. Ankara Valiliği Brifingler
  {
    code: 'VALILIK_UNIVERSITELER',
    title: 'Valilik Üniversiteler Veri Tablosu',
    category: 'Valilik ve Kamu Raporları',
    type: 'DYNAMIC',
    isOfficialYOK: false,
    isActive: true,
    columns: [
      { key: 'universiteAdi', label: 'Üniversite Adı', type: 'text', required: true, order: 1 },
      { key: 'ogrenciSayisi', label: 'Toplam Öğrenci Sayısı', type: 'integer', min: 0, order: 2 },
      { key: 'akademikPersonelSayisi', label: 'Akademik Personel Sayısı', type: 'integer', min: 0, order: 3 },
      { key: 'idariPersonelSayisi', label: 'İdari Personel Sayısı', type: 'integer', min: 0, order: 4 },
      { key: 'fakulteSayisi', label: 'Fakülte Sayısı', type: 'integer', min: 0, order: 5 },
      { key: 'yerleskeAlaniM2', label: 'Toplam Yerleşke Alanı (m2)', type: 'decimal', min: 0, order: 6 },
      { key: 'raporYili', label: 'Rapor Yılı', type: 'integer', min: 2020, max: 2050, order: 7 }
    ]
  },
  {
    code: 'VALILIK_KURULUS_BRIFINGI',
    title: 'Valilik Kuruluş Brifingi Veri Tablosu',
    category: 'Valilik ve Kamu Raporları',
    type: 'DYNAMIC',
    isOfficialYOK: false,
    isActive: true,
    columns: [
      { key: 'konuBasligi', label: 'Brifing Konu Başlığı', type: 'text', required: true, order: 1 },
      { key: 'stratejikOncelik', label: 'Stratejik Öncelik Alanı', type: 'text', required: true, order: 2 },
      { key: 'gerceklesenFaaliyetler', label: 'Gerçekleşen Faaliyetler Özeti', type: 'text', required: true, order: 3 },
      { key: 'planlananProjeler', label: 'Planlanan Projeler', type: 'text', order: 4 },
      { key: 'butceTahmini', label: 'Tahmini Bütçe (TL)', type: 'decimal', min: 0, order: 5 },
      { key: 'brifingTarihi', label: 'Brifing Tarihi', type: 'date', required: true, order: 6 }
    ]
  },

  // 4. TİKA Kalkınma Yardımları
  {
    code: 'TIKA_KALKINMA',
    title: 'TİKA Kalkınma Yardımları Veri Girişi',
    category: 'Dış İlişkiler ve Kalkınma',
    type: 'DYNAMIC',
    isOfficialYOK: false,
    isActive: true,
    columns: [
      { key: 'projeYardimAdi', label: 'Kalkınma Projesi / Yardım Adı', type: 'text', required: true, order: 1 },
      { key: 'hedefUlke', label: 'Hedef Ülke / Bölge', type: 'text', required: true, order: 2 },
      { key: 'yardimTuru', label: 'Yardım / İş Birliği Türü', type: 'select', required: true, options: ['Eğitim Desteği', 'Teknik Altyapı', 'Kapasite Geliştirme', 'Burs ve Staj', 'Sosyal Yardım', 'Diğer'], order: 3 },
      { key: 'yardimTutariUsd', label: 'Yardım Tutarı (USD)', type: 'decimal', min: 0, order: 4 },
      { key: 'baslangicTarihi', label: 'Başlangıç Tarihi', type: 'date', required: true, order: 5 },
      { key: 'faydalaniciSayisi', label: 'Faydalanıcı Kişi/Kurum Sayısı', type: 'integer', min: 0, order: 6 },
      { key: 'tamamlanmaDurumu', label: 'Durum', type: 'select', required: true, options: ['Devam Ediyor', 'Tamamlandı', 'Planlandı'], order: 7 }
    ]
  },

  // 5. Eğitim Hizmet İhracatı
  {
    code: 'EGITIM_IHRACATI',
    title: 'YÖK Eğitim Hizmet İhracatı ve Uluslararası Öğrenci',
    category: 'Uluslararasılaşma',
    type: 'DYNAMIC',
    isOfficialYOK: false,
    isActive: true,
    columns: [
      { key: 'akademikYil', label: 'Akademik Yıl', type: 'text', required: true, placeholder: '2025-2026', order: 1 },
      { key: 'uluslararasiOgrenciSayisi', label: 'Uluslararası Öğrenci Sayısı', type: 'integer', required: true, min: 0, order: 2 },
      { key: 'gelenOgrenciUlkeSayisi', label: 'Öğrenci Gelen Ülke Sayısı', type: 'integer', min: 0, order: 3 },
      { key: 'ogrenimUcretiGeliriUsd', label: 'Öğrenim Ücreti Geliri (USD)', type: 'decimal', min: 0, order: 4 },
      { key: 'digerHizmetGeliriUsd', label: 'Diğer Hizmet İhracatı Geliri (USD)', type: 'decimal', min: 0, order: 5 },
      { key: 'akrediteProgramSayisi', label: 'Uluslararası Akredite Program Sayısı', type: 'integer', min: 0, order: 6 },
      { key: 'yurtdisiTanitimSayisi', label: 'Yurt Dışı Fuar/Tanıtım Sayısı', type: 'integer', min: 0, order: 7 }
    ]
  }
];

module.exports = institutionalTemplates;
