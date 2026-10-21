/**
 * dynamicTemplates.js
 * 
 * Defines the 18 Dynamic-Row & Macro-Enabled Official YÖK Templates
 */

const {
  HAREKETLILIK_COUNTRIES,
  ODULLER_COUNTRIES,
  MYO_SECTORS_27,
  PROJELER_THEMES_8,
  PROJELER_PARTNERS_4,
  DERSLER_THEMES_18
} = require('./referenceDictionaries');

// 1. ALANLAR (25 cols)
const ALANLAR_TEMPLATE = {
  code: 'ALANLAR',
  title: 'Yerleşke ve Bina Alan Bilgileri',
  category: 'Çevre ve Altyapı',
  type: 'DYNAMIC',
  description: 'Üniversite yerleşke ve binalarının fiziki alan ve kapasite bilgileri',
  dataStartRow: 7,
  excelTemplatePath: 'Alanlar (4).xlsx',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'siraNo', label: 'Sıra No', type: 'integer', required: true, order: 1 },
    { key: 'yerleskeAdi', label: 'Yerleşke Adı', type: 'text', required: true, order: 2 },
    { key: 'binaAdi', label: 'Bina Adı', type: 'text', required: true, order: 3 },
    { key: 'egitim', label: 'Eğitim Alanı (m2)', type: 'decimal', min: 0, order: 4 },
    { key: 'arastirma', label: 'Araştırma Alanı (m2)', type: 'decimal', min: 0, order: 5 },
    { key: 'yonetim', label: 'Yönetim Alanı (m2)', type: 'decimal', min: 0, order: 6 },
    { key: 'saglikHizmeti', label: 'Sağlık Hizmeti Alanı (m2)', type: 'decimal', min: 0, order: 7 },
    { key: 'kutuphane', label: 'Kütüphane Alanı (m2)', type: 'decimal', min: 0, order: 8 },
    { key: 'topKonSalAlani', label: 'Toplantı ve Konferans Salonu Alanı (m2)', type: 'decimal', min: 0, order: 9 },
    { key: 'sosyalAlanlar', label: 'Sosyal Alanlar (m2)', type: 'decimal', min: 0, order: 10 },
    { key: 'sporAlanlari', label: 'Spor Alanları (m2)', type: 'decimal', min: 0, order: 11 },
    { key: 'ticariAlanlar', label: 'Ticari Alanlar (m2)', type: 'decimal', min: 0, order: 12 },
    { key: 'barinma', label: 'Barınma Alanı (m2)', type: 'decimal', min: 0, order: 13 },
    { key: 'islakHacimler', label: 'Islak Hacimler (m2)', type: 'decimal', min: 0, order: 14 },
    { key: 'sirkulasyonAlanlari', label: 'Sirkülasyon Alanları (m2)', type: 'decimal', min: 0, order: 15 },
    { key: 'otopark', label: 'Otopark Alanı (m2)', type: 'decimal', min: 0, order: 16 },
    { key: 'diger', label: 'Diğer Alanlar (m2)', type: 'decimal', min: 0, order: 17 },
    { key: 'toplamAcikAlan', label: 'Toplam Açık Alan (m2)', type: 'decimal', min: 0, order: 18 },
    { key: 'nitelikliAcikAlan', label: 'Nitelikli Açık Alan (m2)', type: 'decimal', min: 0, order: 19 },
    { key: 'tuvaletSayisi', label: 'Tuvalet Sayısı', type: 'integer', min: 0, order: 20 },
    { key: 'binayiKullananBirimler', label: 'Binayı Kullanan Birimler', type: 'text', order: 21 },
    { key: 'ogrenciSayisi', label: 'Öğrenci Sayısı', type: 'integer', min: 0, order: 22 },
    { key: 'akademikPersonel', label: 'Akademik Personel Sayısı', type: 'integer', min: 0, order: 23 },
    { key: 'idariPersonel', label: 'İdari Personel Sayısı', type: 'integer', min: 0, order: 24 },
    { key: 'toplanmaAlaniSayisi', label: 'Toplanma Alanı Sayısı', type: 'integer', min: 0, order: 25 }
  ]
};

// 2. BURSLAR (5 cols)
const BURSLAR_TEMPLATE = {
  code: 'BURSLAR',
  title: 'Burslar ve Sosyal Destekler',
  category: 'Eğitim-Öğretim',
  type: 'DYNAMIC',
  description: 'Üniversite tarafından sağlanan burs ve sosyal destek verileri',
  dataStartRow: 16,
  excelTemplatePath: 'Burslar (3).xlsx',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'bursAdi', label: 'Burs Adı', type: 'text', required: true, order: 1 },
    { key: 'bursTuru', label: 'Burs Türü', type: 'select', required: true, options: ['Barınma Yardımı', 'Yemek', 'Eğitim İndirimi', 'Engelli Bursu', 'Nakit', 'Spor ve Sanat', 'Diğer'], order: 2 },
    { key: 'yillikOdemeSayisi', label: 'Yıllık Ödeme Sayısı', type: 'integer', required: true, min: 1, order: 3 },
    { key: 'kisiBasiYillikMiktar', label: 'Kişi Başı Yıllık Miktar (TL)', type: 'decimal', required: true, min: 1, order: 4 },
    { key: 'yararlananKisiSayisi', label: 'Yararlanan Kişi Sayısı', type: 'integer', required: true, min: 1, order: 5 }
  ]
};

// 3. DANISMA_KURULU (10 cols)
const DANISMA_KURULU_TEMPLATE = {
  code: 'DANISMA_KURULU',
  title: 'Danışma Kurulları Bilgileri',
  category: 'Kurumsal İzleme',
  type: 'DYNAMIC',
  description: 'Üniversite ve birim danışma kurulları üye ve faaliyet bilgileri',
  dataStartRow: 12,
  excelTemplatePath: 'DanismaKurulu (3).xlsx',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'danismaKurulAdi', label: 'Danışma Kurulu Adı', type: 'text', required: true, order: 1 },
    { key: 'gorevAlani', label: 'Görev Alanı', type: 'text', required: true, order: 2 },
    { key: 'yillikEtkinlikSayisi', label: 'Yıllık Etkinlik/Toplantı Sayısı', type: 'integer', required: true, min: 0, order: 3 },
    { key: 'kurulSeviyesi', label: 'Kurul Seviyesi', type: 'select', required: true, options: ['Üniversite', 'Rektörlük', 'Fakülte', 'MYO', 'Enstitü', 'Araştırma Merkezi'], order: 4 },
    { key: 'akademikUyeSayisi', label: 'Akademik Üye Sayısı', type: 'integer', min: 0, order: 5 },
    { key: 'idariUyeSayisi', label: 'İdari Üye Sayısı', type: 'integer', min: 0, order: 6 },
    { key: 'kamuKurumuUyeSayisi', label: 'Kamu Kurumu Üye Sayısı', type: 'integer', min: 0, order: 7 },
    { key: 'sektorUyeSayisi', label: 'Sektör Üye Sayısı', type: 'integer', min: 0, order: 8 },
    { key: 'stkUyeSayisi', label: 'STK Üye Sayısı', type: 'integer', min: 0, order: 9 },
    { key: 'ilkTesekkulYili', label: 'İlk Teşekkül Yılı', type: 'integer', required: true, min: 1980, max: 2050, order: 10 }
  ]
};

// 4. DERSLER (18 cols)
const DERSLER_TEMPLATE = {
  code: 'DERSLER',
  title: 'Bologna Ders Bilgi Paketi Dersleri',
  category: 'Eğitim-Öğretim',
  type: 'DYNAMIC',
  description: 'Bologna bilgi paketi ders tanımları, temaları ve AKTS kredileri',
  dataStartRow: 9,
  excelTemplatePath: 'Dersler (7).xlsx',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'yoksisBirimId', label: 'YÖKSİS Birim ID', type: 'integer', required: true, min: 100000, max: 999999, order: 1 },
    { key: 'dersinKodu', label: 'Dersin Kodu', type: 'text', required: true, order: 2 },
    { key: 'dersinAdi', label: 'Dersin Adı', type: 'text', required: true, order: 3 },
    { key: 'okutulduguSinif', label: 'Okutulduğu Sınıf', type: 'select', required: true, options: ['YABANCI DİL HAZIRLIK', '1. SINIF', '2. SINIF', '3. SINIF', '4. SINIF', '5. SINIF', '6. SINIF'], order: 4 },
    { key: 'okutulduguDonem', label: 'Okutulduğu Dönem', type: 'select', required: true, options: ['1. Dönem', '2. Dönem', 'Tüm Yıl'], order: 5 },
    { key: 'turu', label: 'Türü', type: 'select', required: true, options: ['Zorunlu', 'Seçmeli', 'Mesleki Seçmeli', 'Üniversite Seçmeli', 'Alan Dışı Seçmeli', 'Diğer'], order: 6 },
    { key: 'haftalikDersSaati', label: 'Haftalık Ders Saati', type: 'integer', required: true, min: 0, max: 45, order: 7 },
    { key: 'akts', label: 'AKTS', type: 'decimal', required: true, min: 0, max: 50, order: 8 },
    { key: 'dersiAlanOgrenciSayisi', label: 'Dersi Alan Öğrenci Sayısı', type: 'integer', required: true, min: 0, order: 9 },
    { key: 'ortalamaDerseDevamYuzdesi', label: 'Ortalama Derse Devam Yüzdesi', type: 'integer', min: 0, max: 100, order: 10 },
    { key: 'labUygulamasiVarMi', label: 'Laboratuvar Uygulaması Var Mı?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 11 },
    { key: 'dersTemasi', label: 'Ders Teması', type: 'select', options: DERSLER_THEMES_18, order: 12 },
    { key: 'egitimPlatformlari', label: 'Eğitim Platformları', type: 'text', order: 13 },
    { key: 'dersIsletmedeMiOkuldaMi', label: 'Ders Nerede Yapılıyor?', type: 'select', required: true, options: ['Okulda', 'İşletmede', 'Hibrit'], order: 14 },
    { key: 'ilkAcildigiYil', label: 'İlk Açıldığı Yıl', type: 'integer', required: true, min: 1923, max: 2050, order: 15 },
    { key: 'sonGuncellenmeTarihi', label: 'Son Güncellenme Tarihi', type: 'date', required: true, order: 16 },
    { key: 'dersinAmaci', label: 'Dersin Amacı', type: 'text', required: true, order: 17 },
    { key: 'dersBilgiPaketiAdresi', label: 'Ders Bilgi Paketi Adresi (URL)', type: 'url', order: 18 }
  ]
};

// 5. EGITICILERIN_EGITIMI (10 cols)
const EGITICILERIN_EGITIMI_TEMPLATE = {
  code: 'EGITICILERIN_EGITIMI',
  title: 'Eğiticilerin Eğitimi Programları',
  category: 'Eğitim-Öğretim',
  type: 'DYNAMIC',
  description: 'Öğretim elemanlarına yönelik eğiticilerin eğitimi faaliyetleri',
  dataStartRow: 7,
  excelTemplatePath: 'EgiticilerinEgitimi (3).xlsx',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'egitiminAdi', label: 'Eğitimin Adı', type: 'text', required: true, order: 1 },
    { key: 'egiticininAdi', label: 'Eğiticinin Adı', type: 'text', required: true, order: 2 },
    { key: 'egiticininUnvani', label: 'Eğiticinin Unvanı', type: 'select', required: true, options: ['Profesör', 'Doçent', 'Doktor Öğretim Üyesi', 'Öğretim Görevlisi', 'Araştırma Görevlisi', 'Akademi Dışı Uzman', 'Kamu Görevlisi'], order: 3 },
    { key: 'egitiminTarihi', label: 'Eğitimin Tarihi', type: 'date', required: true, order: 4 },
    { key: 'egitiminSuresi', label: 'Eğitimin Süresi', type: 'text', required: true, pattern: '^\\d+\\s*(Saat|Gün|Hafta)$', placeholder: 'Örn: 4 Saat, 2 Gün', order: 5 },
    { key: 'egitimiAlanOgretimElemaniSayisi', label: 'Eğitimi Alan Öğretim Elemanı Sayısı', type: 'integer', required: true, min: 1, order: 6 },
    { key: 'ortakEgitimMi', label: 'Ortak Eğitim Mi?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 7 },
    { key: 'egitimTuru', label: 'Eğitim Türü', type: 'select', required: true, options: ['Derslik/Yüz Yüze', 'Hibrit', 'Uzaktan', 'Diğer'], order: 8 },
    { key: 'memnuniyetAnketiOrtalamasi', label: 'Memnuniyet Anketi Ortalaması', type: 'integer', min: 0, max: 100, order: 9 },
    { key: 'ortakYurutucu', label: 'Ortak Yürütücü', type: 'text', order: 10 }
  ]
};

// 6. ETKINLIK (17 cols)
const ETKINLIK_TEMPLATE = {
  code: 'ETKINLIK',
  title: 'Etkinlik ve Toplantı Faaliyetleri',
  category: 'Sosyo-Kültürel ve Bilimsel',
  type: 'DYNAMIC',
  description: 'Üniversite genelinde düzenlenen bilimsel, kültürel ve sosyal etkinlikler',
  dataStartRow: 9,
  excelTemplatePath: 'Etkinlik 2025-2026.xlsx',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'toplantiFaaliyetId', label: 'Toplantı/Faaliyet ID', type: 'text', required: true, order: 1 },
    { key: 'faaliyetinAdi', label: 'Faaliyetin Adı', type: 'text', required: true, order: 2 },
    { key: 'ulusalUluslararasi', label: 'Ulusal / Uluslararası', type: 'select', required: true, options: ['Ulusal', 'Uluslararası'], order: 3 },
    { key: 'faaliyetTuru', label: 'Faaliyet Türü', type: 'select', required: true, options: ['Çalıştay', 'Konferans', 'Kongre', 'Sempozyum', 'Panel', 'Seminer', 'Söyleşi', 'Forum', 'Kültürel/Sanatsal Etkinlik', 'Sosyal Sorumluluk/Gönüllülük Etkinliği', 'Diğer'], order: 4 },
    { key: 'etkinlikTemasi', label: 'Etkinlik Teması', type: 'select', required: true, options: ['Akademik Çalışmalar', 'Sosyo-Kültürel', 'Spor', 'Sanat', 'Sürdürülebilirlik', 'Teknoloji', 'Girişimcilik', 'Kariyer', 'Sağlık', 'Toplumsal Katkı', 'Uluslararasılaşma', 'Akreditasyon ve Kalite', 'Diğer'], order: 5 },
    { key: 'baslamaTarihi', label: 'Başlama Tarihi', type: 'date', required: true, order: 6 },
    { key: 'kaliteKulturunuYayginlastirma', label: 'Kalite Kültürünü Yaygınlaştırma Faaliyeti Mi?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 7 },
    { key: 'yurtDisindanKatilimciSayisi', label: 'Yurt Dışından Katılımcı Sayısı', type: 'integer', min: 0, order: 8 },
    { key: 'duzenleyenBirim', label: 'Düzenleyen Birim', type: 'text', required: true, order: 9 },
    { key: 'faaliyetYurutucusu', label: 'Faaliyet Yürütücüsü', type: 'select', required: true, options: ['İdari Personel', 'Akademik Personel', 'Öğrenci', 'Öğrenci Kulübü'], order: 10 },
    { key: 'kariyerMerkeziFaaliyetiMi', label: 'Kariyer Merkezi Faaliyeti Mi?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 11 },
    { key: 'bagimliliklaMucadeleFaaliyetiMi', label: 'Bağımlılıkla Mücadele Faaliyeti Mi?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 12 },
    { key: 'dezavantajliGruplaraYonelikMi', label: 'Dezavantajlı Gruplara Yönelik Mi?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 13 },
    { key: 'sektorIsBirligiVarMi', label: 'Sektör İş Birliği Var Mı?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 14 },
    { key: 'etkinlikYarismaIceriyorMu', label: 'Etkinlik Yarışma / Ödül İçeriyor Mu?', type: 'select', required: true, options: ['Yarışma İçermiyor', 'Yarışma İçeriyor', 'Yarışma ve Madalya Ödülü İçeriyor', 'Yarışmasız Plaket vb. Ödül İçeriyor', 'Yarışma ve Diğer Ödülleri İçeriyor'], order: 15 },
    { key: 'katilimTuru', label: 'Katılım Türü', type: 'select', required: true, options: ['Tek Düzenleyici', 'Düzenleyici Ortak', 'Kurumsal Katılımcı', 'Bireysel Katılımcı'], order: 16 },
    { key: 'katilimciSayisi', label: 'Katılımcı Sayısı', type: 'integer', required: true, min: 0, order: 17 }
  ]
};

// 7. FIRMALAR (18 cols)
const FIRMALAR_TEMPLATE = {
  code: 'FIRMALAR',
  title: 'Öğrenci ve Akademisyen Firma Verileri',
  category: 'Girişimcilik ve Sanayi',
  type: 'DYNAMIC',
  description: 'Öğrenci ve akademisyen ortaklı firma, girişimcilik ve sanayi iş birlikleri',
  dataStartRow: 8,
  excelTemplatePath: 'Firmalar (3).xlsx',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'firmaAdi', label: 'Firma Adı', type: 'text', required: true, order: 1 },
    { key: 'mersisNo', label: 'MERSİS No', type: 'text', required: true, order: 2 },
    { key: 'vergiNo', label: 'Vergi No', type: 'text', required: true, order: 3 },
    { key: 'faaliyetAlani', label: 'Faaliyet Alanı', type: 'select', required: true, options: ['Teknolojik Tasarım', 'Teknolojik Üretim', 'Proje Yönetim', 'İmalat', 'Yazılım', 'Danışmanlık', 'Hizmet'], order: 4 },
    { key: 'adresIlce', label: 'Adres (İlçe)', type: 'text', required: true, order: 5 },
    { key: 'adresIl', label: 'Adres (İl)', type: 'text', required: true, order: 6 },
    { key: 'firmaSahibiTcNo', label: 'Firma Sahibi TC No', type: 'text', order: 7 },
    { key: 'firmaSahibi', label: 'Firma Sahibi Statüsü', type: 'select', required: true, options: ['Üniversite Vakfı', 'Akademisyen', 'Öğrenci(Lisansüstü)', 'Öğrenci(Ön Lisans ve Lisans)', 'Mezun', 'Diğer'], order: 8 },
    { key: 'son1YilToplantiSayisi', label: 'Son 1 Yıl Toplantı Sayısı', type: 'integer', required: true, min: 0, order: 9 },
    { key: 'teknoparkSirketiIseTeknoparkIsmi', label: 'Teknopark Şirketi İse Teknopark İsmi', type: 'text', order: 10 },
    { key: 'kosgebDestegiVarMi', label: 'KOSGEB Desteği Var Mı?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 11 },
    { key: 'savunmaSanayiProtokolNo', label: 'Savunma Sanayii Protokol No', type: 'text', order: 12 },
    { key: 'buyukluk', label: 'Firma Büyüklüğü (Çalışan)', type: 'select', required: true, options: ['1 - 10', '10 - 100', '100+'], order: 13 },
    { key: 'ogrenciIstihdamSayisi', label: 'İstihdam Edilen Öğrenci Sayısı', type: 'integer', min: 0, order: 14 },
    { key: 'akademisyenIsBirligiSayisi', label: 'İş Birliği Yapılan Akademisyen Sayısı', type: 'integer', min: 0, order: 15 },
    { key: 'tubitakProtokolNo', label: 'TÜBİTAK Protokol No', type: 'text', order: 16 },
    { key: 'stajYapanOgrenciSayisi', label: 'Staj Yapan Öğrenci Sayısı', type: 'integer', min: 0, order: 17 },
    { key: 'myoProtokolNo', label: 'MYO Protokol No', type: 'text', order: 18 }
  ]
};

// 8. HAREKETLILIK (8 cols, 226 countries)
const HAREKETLILIK_TEMPLATE = {
  code: 'HAREKETLILIK',
  title: 'Uluslararası Hareketlilik Verileri',
  category: 'Uluslararasılaşma',
  type: 'DYNAMIC',
  description: 'Gelen ve giden öğrenci ve öğretim elemanı uluslararası hareketlilik kayıtları',
  dataStartRow: 8,
  excelTemplatePath: 'Hareketlilik (3).xlsx',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'tcYuPasaportNo', label: 'T.C. / Y.U. / Pasaport No', type: 'text', required: true, order: 1 },
    { key: 'adi', label: 'Adı', type: 'text', required: true, order: 2 },
    { key: 'soyadi', label: 'Soyadı', type: 'text', required: true, order: 3 },
    { key: 'ulke', label: 'Ülke', type: 'select', required: true, options: HAREKETLILIK_COUNTRIES, order: 4 },
    { key: 'program', label: 'Hareketlilik Programı', type: 'select', required: true, options: ['Erasmus - Değişim', 'Teknik Gezi', 'Araştırma Görevlisi Destekleme Programı', 'Mevlana Değişim Programı', 'Öğretim Üyesi Yetiştirme Programı (ÖYP)', 'Öğretim Üyesi Akademik İzin Kapsamında Yurtdışı Görevi', 'Misafir Öğretim Elemanı', 'Diğer Araştırmacı', 'Diğer'], order: 5 },
    { key: 'baslamaTarihi', label: 'Başlama Tarihi', type: 'date', required: true, order: 6 },
    { key: 'bitisTarihi', label: 'Bitiş Tarihi', type: 'date', order: 7 },
    { key: 'gelenGiden', label: 'Gelen / Giden', type: 'select', required: true, options: ['Gelen', 'Giden'], order: 8 }
  ]
};

// 9. MEMNUNIYET_ANKETI (9 cols)
const MEMNUNIYET_ANKETI_TEMPLATE = {
  code: 'MEMNUNIYET_ANKETI',
  title: 'Üniversite Memnuniyet Anketleri',
  category: 'Kurumsal İzleme',
  type: 'DYNAMIC',
  description: 'Öğrenci, personel ve dış paydaş memnuniyet anketi sonuçları ve normalize puanları',
  dataStartRow: 7,
  excelTemplatePath: 'MemnuniyetAnketi (3).xlsx',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'anketAdi', label: 'Anket Adı', type: 'text', required: true, order: 1 },
    { key: 'anketTarihi', label: 'Anket Tarihi', type: 'date', required: true, order: 2 },
    { key: 'hedefKitle', label: 'Hedef Kitle', type: 'select', required: true, options: ['Öğrenciler', 'Mezunlar', 'Akademik Personel', 'İdari Personel', 'Paydaşlar'], order: 3 },
    { key: 'anketiDuzenleyen', label: 'Anketi Düzenleyen', type: 'select', required: true, options: ['Üniversite', 'Diğer Üniversite', 'Bağımsız Anket Şirketi'], order: 4 },
    { key: 'anketKapsami', label: 'Anket Kapsamı', type: 'select', required: true, options: ['Ders', 'Bölüm', 'Birim', 'Fakülte', 'Üniversite'], order: 5 },
    { key: 'katilimciSayisi', label: 'Katılımcı Sayısı', type: 'integer', required: true, min: 0, order: 6 },
    { key: 'olcumSkalasi', label: 'Ölçüm Skalası', type: 'select', required: true, options: ['5', '10', '100'], order: 7 },
    { key: 'ortalamaAnketPuani', label: 'Ortalama Anket Puanı', type: 'decimal', required: true, min: 0, max: 100, order: 8 },
    { key: 'normalizeAnketPuani', label: 'Normalize Anket Puanı (100 Üzerinden)', type: 'formula', order: 9 }
  ]
};

// 10. MEZUN_TAKIP_SISTEMI (6 cols)
const MEZUN_TAKIP_SISTEMI_TEMPLATE = {
  code: 'MEZUN_TAKIP_SISTEMI',
  title: 'Mezun Takip Sistemi',
  category: 'Eğitim-Öğretim',
  type: 'DYNAMIC',
  description: 'Mezunların istihdam durumu, iletişim kanalları ve kariyer takibi',
  dataStartRow: 8,
  excelTemplatePath: 'MezunTakipSistemi 2025-2026.xlsx',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'tcKimlikNo', label: 'T.C. Kimlik No', type: 'text', required: true, order: 1 },
    { key: 'mezuniyetYili', label: 'Mezuniyet Yılı / Tarihi', type: 'text', required: true, placeholder: 'YYYY veya 01.07.YYYY', order: 2 },
    { key: 'mezuniyetProgrami', label: 'Mezuniyet Programı', type: 'text', required: true, order: 3 },
    { key: 'sonIletisimZamani', label: 'Son İletişim Zamanı', type: 'date', required: true, order: 4 },
    { key: 'sonIletisimSekli', label: 'Son İletişim Şekli', type: 'select', required: true, options: ['E-posta', 'Telefon', 'Yüz Yüze', 'Sosyal Medya / LinkedIn', 'Kariyer Portalı', 'Diğer'], order: 5 },
    { key: 'mezunDurumu', label: 'Mezun Durumu', type: 'select', required: true, options: ['Yurt İçi 4A', 'Yurt İçi 4B', 'Yurt İçi 4C', 'Kendi İşi/Girişimci', 'Yurt Dışı İstihdam', 'Yurt İçi Lisansüstü Eğitim', 'Yurt Dışı Lisansüstü Eğitim'], order: 6 }
  ]
};

// 11. MYO_UYGULAMALI_EGITIM (37 cols)
const MYO_UYGULAMALI_EGITIM_TEMPLATE = {
  code: 'MYO_UYGULAMALI_EGITIM',
  title: 'Mesleki Ön Lisans Uygulamalı Eğitim',
  category: 'Eğitim-Öğretim',
  type: 'DYNAMIC',
  description: 'Meslek yüksekokulları uygulamalı eğitim, işletmede mesleki eğitim ve staj verileri',
  dataStartRow: 7,
  excelTemplatePath: 'MYOUygulamaliEgitim (2).xlsm',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'no', label: 'No', type: 'integer', required: true, order: 1 },
    { key: 'meslekiOnLisansProgramlari', label: 'Mesleki Ön Lisans Programları', type: 'text', required: true, order: 2 },
    { key: 'yoksisBirimId', label: 'YÖKSİS Birim ID', type: 'integer', required: true, order: 3 },
    { key: 'myoAdi', label: 'MYO Adı', type: 'text', required: true, order: 4 },
    { key: 'ilce', label: 'İlçe', type: 'text', required: true, order: 5 },
    { key: 'egitimModeli', label: 'Eğitim Modeli', type: 'select', required: true, options: ['3+1', '2+2', '4+2', '4+0 (Uygulama Yok)'], order: 6 },
    { key: 'uygulamaliDerslerVarMi', label: 'Uygulamalı Dersler Var Mı?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 7 },
    { key: 'uygulamaliDerslerNerede', label: 'Uygulamalı Dersler Nerede?', type: 'select', options: ['Okulda', 'İşletmede', 'Hibrit'], order: 8 },
    { key: 'uygulamaliAktsOrani', label: 'Uygulamalı Ders AKTS Oranı (%)', type: 'decimal', min: 0, max: 100, order: 9 },
    { key: 'sektorelDanismaKuruluVarMi', label: 'Sektörel Danışma Kurulu Var Mı?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 10 },
    { key: 'sektordenEgiticiSayisi', label: 'Sektörden Eğitici Sayısı', type: 'integer', min: 0, order: 11 },
    { key: 'isletmedeMeslekiEgitimVarMi', label: 'İşletmede Mesleki Eğitim Var Mı?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 12 },
    { key: 'isletmedeDonemSuresi', label: 'İşletmede Dönem Süresi', type: 'integer', min: 0, order: 13 },
    { key: 'isletmedeHaftaSuresi', label: 'İşletmede Hafta Süresi', type: 'integer', min: 0, order: 14 },
    { key: 'isletmedeGunSayisi', label: 'İşletmede Gün Sayısı', type: 'integer', min: 0, order: 15 },
    { key: 'isletmedeAktsOrani', label: 'İşletmede Mesleki Eğitim AKTS Oranı (%)', type: 'decimal', min: 0, max: 100, order: 16 },
    { key: 'isletmedeProtokolVarMi', label: 'Protokol Yapılan İşletme Var Mı?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 17 },
    { key: 'isletmeKucukOlcekSayisi', label: 'Küçük Ölçekli İşletme Sayısı', type: 'integer', min: 0, order: 18 },
    { key: 'isletmeOrtaOlcekSayisi', label: 'Orta Ölçekli İşletme Sayısı', type: 'integer', min: 0, order: 19 },
    { key: 'isletmeBuyukOlcekSayisi', label: 'Büyük Ölçekli İşletme Sayısı', type: 'integer', min: 0, order: 20 },
    { key: 'isletmeKamuKurumuSayisi', label: 'Kamu Kurumu Sayısı', type: 'integer', min: 0, order: 21 },
    { key: 'isletmeIsimleri', label: 'İşletme İsimleri', type: 'text', order: 22 },
    { key: 'isletmeSektoru', label: 'İşletmede Eğitim Sektörü', type: 'multiselect', options: MYO_SECTORS_27, order: 23 },
    { key: 'stajDersiVarMi', label: 'Staj Dersi Var Mı?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 24 },
    { key: 'stajDonemSuresi', label: 'Staj Dönem Süresi', type: 'integer', min: 0, order: 25 },
    { key: 'stajHaftaSuresi', label: 'Staj Hafta Süresi', type: 'integer', min: 0, order: 26 },
    { key: 'stajGunSayisi', label: 'Staj Gün Sayısı', type: 'integer', min: 0, order: 27 },
    { key: 'stajAktsOrani', label: 'Staj AKTS Oranı (%)', type: 'decimal', min: 0, max: 100, order: 28 },
    { key: 'stajProtokolVarMi', label: 'Staj İçin Protokol Var Mı?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 29 },
    { key: 'stajKucukOlcekSayisi', label: 'Staj Küçük Ölçekli Sayısı', type: 'integer', min: 0, order: 30 },
    { key: 'stajOrtaOlcekSayisi', label: 'Staj Orta Ölçekli Sayısı', type: 'integer', min: 0, order: 31 },
    { key: 'stajBuyukOlcekSayisi', label: 'Staj Büyük Ölçekli Sayısı', type: 'integer', min: 0, order: 32 },
    { key: 'stajKamuKurumuSayisi', label: 'Staj Kamu Kurumu Sayısı', type: 'integer', min: 0, order: 33 },
    { key: 'stajIsletmeIsimleri', label: 'Staj Yapılan İşletme İsimleri', type: 'text', order: 34 },
    { key: 'stajSektoru', label: 'Staj Sektörü', type: 'multiselect', options: MYO_SECTORS_27, order: 35 },
    { key: 'yazStajiSuresi', label: 'Yaz Stajı Süresi (Gün)', type: 'integer', min: 0, order: 36 },
    { key: 'potansiyelIsletmeSayisi', label: 'Potansiyel İşletme Sayısı', type: 'integer', min: 0, order: 37 }
  ]
};

// 12. ODULLER (10 cols, 223 countries)
const ODULLER_TEMPLATE = {
  code: 'ODULLER',
  title: 'Ödüller ve Başarılar',
  category: 'Sosyo-Kültürel ve Bilimsel',
  type: 'DYNAMIC',
  description: 'Öğrenci, akademisyen ve birimlerin ulusal/uluslararası ödülleri',
  dataStartRow: 6,
  excelTemplatePath: 'Oduller (4).xlsx',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'tcKimlikNo', label: 'T.C. Kimlik No', type: 'text', order: 1 },
    { key: 'odulAlanTuru', label: 'Ödül Alanın Statüsü', type: 'select', required: true, options: ['Öğrenci', 'Birim', 'Takım', 'Akademisyen', 'İdari Personel'], order: 2 },
    { key: 'oduluAlan', label: 'Ödülü Alan (Kişi/Birim/Takım)', type: 'text', required: true, order: 3 },
    { key: 'odulAdi', label: 'Ödülün Adı', type: 'text', required: true, order: 4 },
    { key: 'odulVerilisTarihi', label: 'Ödülün Veriliş Tarihi', type: 'date', required: true, order: 5 },
    { key: 'uluslararasiMi', label: 'Uluslararası Mı?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 6 },
    { key: 'odulTemasi', label: 'Ödül Teması', type: 'select', required: true, options: ['Bilim', 'Sanat', 'Spor', 'Kültür', 'Hizmet', 'Kalite'], order: 7 },
    { key: 'oduluVerenKurum', label: 'Ödülü Veren Kurum/Kuruluş', type: 'text', required: true, order: 8 },
    { key: 'odulVerenUlke', label: 'Ödül Veren Ülke', type: 'select', required: true, options: ODULLER_COUNTRIES, order: 9 },
    { key: 'odulAdresBilgisi', label: 'Ödül Kanıt / Web Adresi', type: 'url', order: 10 }
  ]
};

// 13. OGRENCI_TOPLULUKLARI (13 cols)
const OGRENCI_TOPLULUKLARI_TEMPLATE = {
  code: 'OGRENCI_TOPLULUKLARI',
  title: 'Öğrenci Toplulukları ve Kulüpleri',
  category: 'Sosyo-Kültürel ve Bilimsel',
  type: 'DYNAMIC',
  description: 'Öğrenci toplulukları üye sayıları, etkinlikleri ve KVKK kurallı verileri',
  dataStartRow: 8,
  excelTemplatePath: 'OgrenciTopluluklari (3).xlsx',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'kulupAdi', label: 'Kulüp / Topluluk Adı', type: 'text', required: true, order: 1 },
    { key: 'toplulukYapisi', label: 'Topluluk Yapısı', type: 'select', required: true, options: ['Akademik', 'Kültürel', 'Sanatsal', 'Spor', 'Sosyal Sorumluluk', 'Mesleki', 'Diğer'], order: 2 },
    { key: 'toplamUyeSayisi', label: 'Toplam Üye Sayısı', type: 'integer', required: true, min: 0, order: 3 },
    { key: 'aktifOgrenciSayisi', label: 'Aktif Öğrenci Sayısı', type: 'integer', required: true, min: 0, order: 4 },
    { key: 'yeniUyeSayisi', label: 'Yeni Üye Sayısı', type: 'integer', min: 0, order: 5 },
    { key: 'uluslararasiOgrenciSayisi', label: 'Uluslararası Öğrenci Sayısı', type: 'integer', min: 0, order: 6 },
    { key: 'ulusalOgrenciSayisi', label: 'Ulusal Öğrenci Sayısı', type: 'integer', required: true, min: 0, order: 7 },
    { key: 'ulusalYapiyaUyeMi', label: 'Ulusal Bir Yapıya Üye Mi?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 8 },
    { key: 'uluslararasiUyeligiVarMi', label: 'Uluslararası Üyeliği Var Mı?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 9 },
    { key: 'yilIcindekiFaaliyetSayisi', label: 'Yıl İçindeki Faaliyet Sayısı', type: 'integer', required: true, min: 0, order: 10 },
    { key: 'universiteIciOrtakFaaliyetSayisi', label: 'Üniversite İçi Ortak Faaliyet Sayısı', type: 'integer', min: 0, order: 11 },
    { key: 'universiteDisiOrtakFaaliyetSayisi', label: 'Üniversite Dışı Ortak Faaliyet Sayısı', type: 'integer', min: 0, order: 12 },
    { key: 'engelliUyeSayisi', label: 'Engelli Üye Sayısı', type: 'integer', min: 0, order: 13 }
  ]
};

// 14. OZDEGERLENDIRME (2 cols)
const OZDEGERLENDIRME_TEMPLATE = {
  code: 'OZDEGERLENDIRME',
  title: 'Birim Öz Değerlendirme Raporları',
  category: 'Kurumsal İzleme',
  type: 'DYNAMIC',
  description: 'Akademik programların Birim İç Değerlendirme Raporu (BİDR) bağlantıları',
  dataStartRow: 6,
  excelTemplatePath: 'Ozdegerlendirme (3).xlsx',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'programAdi', label: 'Program Adı', type: 'text', required: true, order: 1 },
    { key: 'bidrBaglantiAdresi', label: 'BİDR Raporu Bağlantı Adresi (URL)', type: 'url', required: true, order: 2 }
  ]
};

// 15. PATENT (10 cols)
const PATENT_TEMPLATE = {
  code: 'PATENT',
  title: 'Patent, Faydalı Model ve Tasarımlar',
  category: 'Ar-Ge ve Projeler',
  type: 'DYNAMIC',
  description: 'Üniversite mensuplarının tescilli ve başvuru aşamasındaki fikri ve sınai mülkiyet hakları',
  dataStartRow: 9,
  excelTemplatePath: 'Patent - 2026.xlsx',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'tcKimlikNo', label: 'T.C. Kimlik No', type: 'text', order: 1 },
    { key: 'patentBasvuruNumarasi', label: 'Patent / Başvuru Numarası', type: 'text', required: true, order: 2 },
    { key: 'basvuranTuru', label: 'Başvuranın Statüsü', type: 'select', required: true, options: ['Öğrenci', 'Akademik Personel', 'İdari Personel', 'Kurumsal Kimlik', 'Diğer'], order: 3 },
    { key: 'tur', label: 'Fikri Mülkiyet Türü', type: 'select', required: true, options: ['Patent', 'Faydalı Model', 'Tasarım', 'Marka'], order: 4 },
    { key: 'adi', label: 'Buluş / Tasarım Adı', type: 'text', required: true, order: 5 },
    { key: 'basvuruTarihi', label: 'Başvuru Tarihi', type: 'date', required: true, order: 6 },
    { key: 'tescilTarihi', label: 'Tescil Tarihi', type: 'date', order: 7 },
    { key: 'durum', label: 'Başvuru Durumu', type: 'select', required: true, options: ['Başvuru', 'Ret', 'Kabul'], order: 8 },
    { key: 'uluslararasiIsBirligi', label: 'Uluslararası İş Birliği Var Mı?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 9 },
    { key: 'basvuruMerkezi', label: 'Başvuru Merkezi', type: 'select', required: true, options: ['Ulusal', 'Uluslararası'], order: 10 }
  ]
};

// 16. PAYDAS (5 cols)
const PAYDAS_TEMPLATE = {
  code: 'PAYDAS',
  title: 'Kalite Süreci Paydaş Katılımı',
  category: 'Kurumsal İzleme',
  type: 'DYNAMIC',
  description: 'İç ve dış paydaş toplantıları ve kalite süreçlerine katılım verileri',
  dataStartRow: 7,
  excelTemplatePath: 'Paydas (3).xlsx',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'paydasTuru', label: 'Paydaş Türü', type: 'select', required: true, options: ['İç Paydaş', 'Dış Paydaş'], order: 1 },
    { key: 'toplantiAdi', label: 'Toplantı Adı / Konusu', type: 'text', required: true, order: 2 },
    { key: 'toplantiTarihi', label: 'Toplantı Tarihi', type: 'date', required: true, order: 3 },
    { key: 'toplantiSayisi', label: 'Toplantı Sayısı', type: 'integer', required: true, min: 0, order: 4 },
    { key: 'katilimciSayisi', label: 'Katılımcı Sayısı', type: 'integer', required: true, min: 0, order: 5 }
  ]
};

// 17. PROJELER (40 cols)
const PROJELER_TEMPLATE = {
  code: 'PROJELER',
  title: 'Ar-Ge ve Yenilikçi Projeler Portföyü',
  category: 'Ar-Ge ve Projeler',
  type: 'DYNAMIC',
  description: 'Ulusal ve uluslararası fonlanan Ar-Ge, tasarım ve sosyal sorumluluk projeleri portföyü',
  dataStartRow: 15,
  excelTemplatePath: 'Projeler 2025-2026.xlsm',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'projeKimlikId', label: 'Proje Kimlik No / Kodu', type: 'text', required: true, order: 1 },
    { key: 'projeninAdi', label: 'Projenin Adı', type: 'text', required: true, order: 2 },
    { key: 'projeTuru', label: 'Proje Türü', type: 'select', required: true, options: ['TÜBİTAK', 'BAP', 'Avrupa Birliği (Horizon vb.)', 'Kalkınma Ajansı', 'Sanayi / Sektörel', 'Bakanlık / Kamu', 'Uluslararası Diğer', 'Diğer'], order: 3 },
    { key: 'baslamaTarihi', label: 'Başlama Tarihi', type: 'date', required: true, order: 4 },
    { key: 'bitisTarihi', label: 'Bitiş Tarihi', type: 'date', required: true, order: 5 },
    { key: 'projeTemasi', label: 'Proje Teması', type: 'multiselect', options: PROJELER_THEMES_8, order: 6 },
    { key: 'projeOrtaklari', label: 'Proje Ortakları', type: 'multiselect', options: PROJELER_PARTNERS_4, order: 7 },
    { key: 'bilimAlani', label: 'Bilim Alanı', type: 'text', required: true, order: 8 },
    { key: 'projeDurumu', label: 'Proje Durumu', type: 'select', required: true, options: ['Devam Ediyor', 'Tamamlandı', 'Yeni Başladı', 'İptal Edildi'], order: 9 },
    { key: 'sosyalSorumlulukMu', label: 'Sosyal Sorumluluk Projesi Mi?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 10 },
    { key: 'arGeMi', label: 'Ar-Ge Projesi Mi?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 11 },
    { key: 'ttoTeknokentMi', label: 'TTO/Teknokent Kapsamında Mı?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 12 },
    { key: 'ticarilestiMi', label: 'Ticarileşti Mi?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 13 },
    { key: 'ogrenciEndustriMi', label: 'Öğrenci-Endüstri İş Birliği Mi?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 14 },
    { key: 'ulusalFonVarMi', label: 'Ulusal Fon Var Mı?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 15 },
    { key: 'uluslararasiFonVarMi', label: 'Uluslararası Fon Var Mı?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 16 },
    { key: 'butcesiTl', label: 'Bütçesi (TL)', type: 'integer', required: true, min: 0, order: 17 },
    { key: 'projeYurutucusu', label: 'Proje Yürütücüsü', type: 'text', required: true, order: 18 },
    { key: 'ozButceOrani', label: 'Öz Bütçe Oranı (%)', type: 'decimal', min: 0, max: 100, order: 19 },
    { key: 'protokolNo', label: 'Protokol / Sözleşme No', type: 'text', order: 20 },
    { key: 'paydasIsimleri', label: 'Paydaş İsimleri', type: 'text', order: 21 },
    { key: 'ulusalFonYuzdesi', label: 'Ulusal Fon Yüzdesi (%)', type: 'decimal', min: 0, max: 100, order: 22 },
    { key: 'patentAldiMi', label: 'Patent / FSMH Başvurusu Çıktı Mı?', type: 'select', required: true, options: ['Evet', 'Hayır'], order: 23 },
    { key: 'toplamPersonelSayisi', label: 'Toplam Proje Personel Sayısı', type: 'integer', min: 0, order: 24 },
    { key: 'plansizAyrilanPersonel', label: 'Plansız Ayrılan Personel Sayısı', type: 'integer', min: 0, order: 25 },
    { key: 'toplantiSayisi', label: 'Proje Toplantı Sayısı', type: 'integer', min: 0, order: 26 },
    { key: 'toplantiKatilimciSayisi', label: 'Toplantı Katılımcı Sayısı', type: 'integer', min: 0, order: 27 },
    { key: 'onlineEntegrasyonVarMi', label: 'Çevrim İçi Entegrasyon Var Mı?', type: 'select', options: ['Evet', 'Hayır'], order: 28 },
    { key: 'majorRiskSayisi', label: 'Tespit Edilen Majör Risk Sayısı', type: 'integer', min: 0, order: 29 },
    { key: 'minorRiskSayisi', label: 'Tespit Edilen Minör Risk Sayısı', type: 'integer', min: 0, order: 30 },
    { key: 'merkeziYatirimButcesi', label: 'Merkezi Yatırım Bütçesi (TL)', type: 'decimal', min: 0, order: 31 },
    { key: 'donerSermaye', label: 'Döner Sermaye (TL)', type: 'decimal', min: 0, order: 32 },
    { key: 'digerKurumIci', label: 'Diğer Kurum İçi Kaynaklar (TL)', type: 'decimal', min: 0, order: 33 },
    { key: 'tubitak', label: 'TÜBİTAK Fonu (TL)', type: 'decimal', min: 0, order: 34 },
    { key: 'ulusalKamu', label: 'Ulusal Kamu Kurumları Fonu (TL)', type: 'decimal', min: 0, order: 35 },
    { key: 'ulusalSektorel', label: 'Ulusal Sektörel Kuruluşlar (TL)', type: 'decimal', min: 0, order: 36 },
    { key: 'ulusalStk', label: 'Ulusal STK Fonu (TL)', type: 'decimal', min: 0, order: 37 },
    { key: 'uluslararasiFonlar', label: 'Uluslararası Fonlar (TL)', type: 'decimal', min: 0, order: 38 },
    { key: 'uluslararasiSektorel', label: 'Uluslararası Sektörel Kuruluşlar (TL)', type: 'decimal', min: 0, order: 39 },
    { key: 'butceDurumu', label: 'Bütçe Kontrol Durumu', type: 'formula', order: 40 }
  ]
};

// 18. SEM (10 cols)
const SEM_TEMPLATE = {
  code: 'SEM',
  title: 'Sürekli Eğitim ve Sertifika Programları',
  category: 'Eğitim-Öğretim',
  type: 'DYNAMIC',
  description: 'Sürekli Eğitim Merkezi (SEM), DİLMER ve TÖMER sertifika programı kayıtları',
  dataStartRow: 7,
  excelTemplatePath: 'SEM (3).xlsx',
  isActive: true,
  isOfficialYOK: true,
  columns: [
    { key: 'tcYuNo', label: 'T.C. / Y.U. No', type: 'text', required: true, order: 1 },
    { key: 'kisiProfili', label: 'Kişi Profili', type: 'select', required: true, options: ['Üniversitenin Öğrencisi', 'Üniversitenin Mezunu', 'Akademisyen', 'İdari Personel', 'Dış Katılımcı'], order: 2 },
    { key: 'egitimTuru', label: 'Eğitim Türü', type: 'select', required: true, options: ['Yüz Yüze', 'Uzaktan', 'Hibrit'], order: 3 },
    { key: 'egitimTemasi', label: 'Eğitim Teması', type: 'select', required: true, options: ['Bilişim ve Teknoloji', 'Yabancı Dil', 'Kişisel Gelişim', 'Mesleki ve Teknik', 'Hukuk', 'Sağlık', 'Finans ve Muhasebe', 'Yönetim ve Liderlik', 'Sanat ve Tasarım', 'Diğer'], order: 4 },
    { key: 'sertifikaMerkezi', label: 'Sertifika Merkezi', type: 'select', required: true, options: ['DİLMER', 'SEM', 'TÜMER', 'TÖMER', 'İşletme/Kurum İçi Eğitim Merkezi', '3. Taraf Eğitim Merkezi', 'Diğer'], order: 5 },
    { key: 'sertifikaAdi', label: 'Sertifika / Program Adı', type: 'text', required: true, order: 6 },
    { key: 'sertifikaTarihi', label: 'Sertifika Tarihi', type: 'date', required: true, order: 7 },
    { key: 'sertifikaTuru', label: 'Sertifika Türü', type: 'select', required: true, options: ['Katılım', 'Başarı'], order: 8 },
    { key: 'sertifikaNumarasi', label: 'Sertifika Numarası', type: 'text', order: 9 },
    { key: 'sertifikayiKabulEdenKurumlar', label: 'Sertifikayı Kabul Eden Kurumlar', type: 'text', order: 10 }
  ]
};

module.exports = [
  ALANLAR_TEMPLATE,
  BURSLAR_TEMPLATE,
  DANISMA_KURULU_TEMPLATE,
  DERSLER_TEMPLATE,
  EGITICILERIN_EGITIMI_TEMPLATE,
  ETKINLIK_TEMPLATE,
  FIRMALAR_TEMPLATE,
  HAREKETLILIK_TEMPLATE,
  MEMNUNIYET_ANKETI_TEMPLATE,
  MEZUN_TAKIP_SISTEMI_TEMPLATE,
  MYO_UYGULAMALI_EGITIM_TEMPLATE,
  ODULLER_TEMPLATE,
  OGRENCI_TOPLULUKLARI_TEMPLATE,
  OZDEGERLENDIRME_TEMPLATE,
  PATENT_TEMPLATE,
  PAYDAS_TEMPLATE,
  PROJELER_TEMPLATE,
  SEM_TEMPLATE
];
