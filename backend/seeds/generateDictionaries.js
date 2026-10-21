const fs = require('fs');
const path = require('path');

const refData = require('./reference_data.json');

const content = `/**
 * referenceDictionaries.js
 * 
 * Official reference dictionaries extracted directly from YÖK templates.
 */

// 226 Countries for Hareketlilik
const HAREKETLILIK_COUNTRIES = Object.freeze(${JSON.stringify(refData.hareketlilik, null, 2)});

// 223 Countries for Oduller (omits UK constituent entities)
const ODULLER_COUNTRIES = Object.freeze(${JSON.stringify(refData.oduller, null, 2)});

// 22 Indicator Questions for SoruSeti
const SORU_SETI_QUESTIONS = Object.freeze(${JSON.stringify(refData.soruSeti, null, 2)});

// 106 Questions across 5 Dimensions for DijitalOlgunlukAnketi
const DIJITAL_OLGUNLUK_QUESTIONS = Object.freeze(${JSON.stringify(refData.dijitalOlgunluk, null, 2)});

// 27 Sectors for MYOUygulamaliEgitim (listeler!E2:E28)
const MYO_SECTORS_27 = Object.freeze([
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
]);

// 8 Themes for Projeler (Referans Değerler!$G$8:$G$15)
const PROJELER_THEMES_8 = Object.freeze([
  'Yapay Zeka',
  'Savunma Sanayi',
  'Sürdürülebilirlik',
  'Toplumsal Fayda',
  'Afet Yönetimi',
  'Erişilebilirlik',
  'Enerji-Su-Atık',
  'Diğer'
]);

// 4 Partners for Projeler (Referans Değerler!$H$8:$H$11)
const PROJELER_PARTNERS_4 = Object.freeze([
  'Kamu',
  'Sanayi',
  'STK',
  'Üniversite'
]);

// 18 Themes for Bologna Dersler
const DERSLER_THEMES_18 = Object.freeze([
  'Biyoteknoloji ve Genetik',
  'Çevre ve İklim Değişikliği',
  'Enerji Teknolojileri',
  'Havacılık ve Uzay',
  'İleri Malzeme ve Nanoteknoloji',
  'Kültürel Miras ve Sanat',
  'Medya ve İletişim',
  'Sağlık ve Yaşam Bilimleri',
  'Siber Güvenlik',
  'Sosyal Politikalar ve Toplumsal Cinsiyet',
  'Tarım ve Gıda Teknolojileri',
  'Toplumsal Gelişim ve Sosyal İnovasyon',
  'Ulaştırma ve Akıllı Şehirler',
  'Veri Bilimi',
  'Yapay Zeka',
  'Yenilenebilir Enerji',
  'Ziraat',
  'Diğer'
]);

// Dijital Olgunluk Dropdown Lookups
const DIJITAL_APPROVAL_ROLES = Object.freeze([
  'İlgili Veri Sahibi',
  'Memur',
  'Müdür-Şef',
  'Daire Başkanı',
  'Genel Sekreter'
]);

const DIJITAL_ACCESS_TYPES = Object.freeze([
  'İnternet',
  'Yerleşke İçi',
  'Belirli Binalar',
  'Sadece Bilgisayar',
  'Ağ Dışı Ortam'
]);

const DIJITAL_ACCESS_LEVELS = Object.freeze([
  'Sadece Yetkililer',
  'Bazı Modüllere Sadece Yetkililer',
  'Kullanıcı Adı Alan Herkes',
  'Anonim Herkes'
]);

const DIJITAL_MATURITY_LEVELS = Object.freeze([
  'Farkındalık',
  'Kısmi Uygulamalar',
  'Stratejik Uygulamalar',
  'Bütünleşik Uygulamalar',
  'Kültüre Dönüşme'
]);

module.exports = {
  HAREKETLILIK_COUNTRIES,
  ODULLER_COUNTRIES,
  SORU_SETI_QUESTIONS,
  DIJITAL_OLGUNLUK_QUESTIONS,
  MYO_SECTORS_27,
  PROJELER_THEMES_8,
  PROJELER_PARTNERS_4,
  DERSLER_THEMES_18,
  DIJITAL_APPROVAL_ROLES,
  DIJITAL_ACCESS_TYPES,
  DIJITAL_ACCESS_LEVELS,
  DIJITAL_MATURITY_LEVELS
};
`;

const dir = path.join(__dirname, 'templates');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'referenceDictionaries.js'), content, 'utf8');
console.log('Created backend/seeds/templates/referenceDictionaries.js successfully!');
