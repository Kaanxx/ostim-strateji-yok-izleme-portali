# 🏛️ OSTİM Teknik Üniversitesi — Strateji ve YÖK İzleme Portalı

**Veri İzleme ve Değerlendirme Birimi** için geliştirilmiş; üniversite genelindeki tüm fakülte, bölüm, meslek yüksekokulu ve idari birimlerin **YÖK İzleme Kriterleri** ile **Kurumsal Stratejik Plan** verilerini tek merkezden toplamasını, doğrulamasını, onaylamasını ve **1:1 orijinal YÖK Excel şablonları (`.xlsx` / `.xlsm`)** formatında dışa/içe aktarmasını sağlayan tam kapsamlı kurumsal web platformudur.

---

## 🚀 Hızlı Başlangıç (İndir ve Hemen Kullan)

Bu proje **Anahtar Teslim (Turnkey)** mimaride paketlenmiştir:
- Ön yüz üretim derlemesi (`frontend/build/`) ve **24 adet resmi YÖK İzleme Şablonu** (`2025-2026 yök izleme şablonlar/`) proje içerisinde hazır olarak gelir.
- Bilgisayarınızda **MongoDB veya Docker kurulu olmasa bile**, sistem otomatik olarak gömülü veritabanı motorunu devreye alır, 24 YÖK + 17 Kurumsal tabloyu, organizasyon şemasını ve 6 hazır kullanıcı hesabını otomatik yükler (`auto-seed`) ve yaptığınız tüm değişiklikleri `backend/.data/db_snapshot.json` dosyasına kalıcı olarak kaydeder.

### Yöntem 1: Docker Gerektirmeden Tek Tıkla Başlatma (Önerilen)

> **Tek Gereksinim:** [Node.js](https://nodejs.org/) (v18 veya üzeri)

- **Windows Kullanıcıları:**
  Proje klasöründeki **`KURULUM_VE_BASLAT.bat`** dosyasına çift tıklayın.
  *(Eksik paket varsa otomatik kurulur, Backend `5000` ve Frontend `3000` portunda başlatılır ve tarayıcınızda otomatik olarak `http://localhost:3000` açılır.)*

- **macOS / Linux veya Terminal Kullanıcıları:**
  ```bash
  npm start
  # veya
  ./start.sh
  ```

### Yöntem 2: Docker Compose ile Başlatma

Bilgisayarınızda **Docker Desktop** kuruluysa tüm sistemi (`mongodb`, `backend`, `frontend` konteynerleri ile) izole olarak başlatabilirsiniz:

- **Windows Kullanıcıları:**
  Proje klasöründeki **`DOCKER_ILE_BASLAT.bat`** dosyasına çift tıklayın.

- **Terminal Kullanıcıları:**
  ```bash
  docker compose up -d --build
  ```
  Durdurmak için:
  ```bash
  docker compose down
  ```

### 🌐 Erişim Adresleri

| Servis | Adres | Açıklama |
| :--- | :--- | :--- |
| **Web Portalı (Frontend)** | [http://localhost:3000](http://localhost:3000) | Kullanıcı arayüzü ve yönetim ekranı |
| **REST API (Backend)** | [http://localhost:5000](http://localhost:5000) | Express 5 API sunucusu |
| **Sağlık Kontrolü (Health)** | [http://localhost:5000/health](http://localhost:5000/health) | Veritabanı ve servis durum kontrolü |

---

## 🔐 Hazır Kullanıcı Hesapları (Demo Giriş Bilgileri)

Sistem ilk kez çalıştığında aşağıdaki **6 kurumsal kullanıcı hesabı** otomatik olarak oluşturulur. Giriş ekranındaki **"Hızlı Demo Girişi"** butonlarına tıklayarak veya aşağıdaki bilgilerle doğrudan giriş yapabilirsiniz:

| Rol / Görev | E-Posta Adresi | Şifre | Sistem Rolü | Birim Kapsamı (`departmentScope`) | Yetki Özeti |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Sistem Yöneticisi** | `admin@ostimteknik.edu.tr` | `Admin123!` | `ADMIN` | **Tüm Üniversite (`ALL`)** | Tam yetki: Kullanıcı/Birim yönetimi, Dinamik Tablo Oluşturucu, Dönem yönetimi, veri girişi ve onay |
| **Mühendislik Fakültesi Dekanı** | `dekan.muhendislik@ostimteknik.edu.tr` | `Dekan123!` | `REVIEWER` | **Hiyerarşik (`OWN_DEPT`)** *(Fakülte + Alt Bölümler)* | Mühendislik Fakültesi ve bağlı tüm bölümlerin (Bilgisayar, Yazılım vb.) verilerini inceleme, onaylama/revizyon isteme ve Excel dışa aktarım |
| **Bilgisayar Müh. Sorumlusu** | `ceng@ostimteknik.edu.tr` | `Ceng123!` | `DEPT_USER` | **Sadece Kendi Bölümü (`OWN_DEPT`)** | Sadece Bilgisayar Mühendisliği verilerini görüntüleme, veri girişi, Excel içe/dışa aktarım ve onaya gönderme |
| **Yazılım Müh. Sorumlusu** | `seng@ostimteknik.edu.tr` | `Seng123!` | `DEPT_USER` | **Sadece Kendi Bölümü (`OWN_DEPT`)** | Sadece Yazılım Mühendisliği verilerini görüntüleme, veri girişi, Excel içe/dışa aktarım ve onaya gönderme |
| **Mühendislik Koordinatörü** | `muhendislik.koordinator@ostimteknik.edu.tr` | `Koord123!` | `DEPT_USER` | **Çapraz Yetkili (`CUSTOM`)** *(Bilgisayar Müh. + Yazılım Müh.)* | Birden fazla seçili bölüm (Bilgisayar Müh. ve Yazılım Müh.) adına veri girişi ve yönetimi |
| **Strateji Geliştirme Daire Bşk.** | `strateji@ostimteknik.edu.tr` | `Strateji123!` | `REVIEWER` | **Tüm Üniversite (`ALL`)** | Üniversite genelindeki tüm birimlerin verilerini izleme, onaylama, revizyon talep etme ve toplu raporlama |

---

## ✨ Sistem Özellikleri

### 1. 24 Resmi YÖK İzleme Şablonu + 17 Kurumsal Tablo (Toplam 41 Hazır Şablon)
- **`FIXED_MATRIX` (6 Sabit Satırlı Matris / Anket Tablosu):**
  YÖK'ün satır başlıklarını sabit tuttuğu matris ve değerlendirme tabloları (Örn. *Dezavantajlı Gruplar*, *Memnuniyet Anketi*, *Ar-Ge Harcamaları*, *Kurum İçi Eğitimler*, *Kütüphane Kaynakları*, *Staj Başarı Oranları*). Kullanıcılar satır ekleyip silemez, yalnızca izin verilen veri hücrelerini doldurur.
- **`DYNAMIC_LIST` (18 Dinamik Satırlı ve `.xlsm` Makrolu YÖK Tablosu + 17 Kurumsal Tablo):**
  Birimlerin istediği kadar satır ekleyebildiği, düzenleyebildiği ve Excel'den toplu yükleyebildiği dinamik tablolar (Örn. *Teknoloji Transfer Ofisi Projeleri*, *Fikri Mülkiyet / Patent*, *Ödüller*, *Sertifika Programları*, *Endüstriyel Projeler*, *Sosyal Sorumluluk Projeleri*, *Yayınlar* vb.).

### 2. İki Katmanlı Kurumsal Yetkilendirme (Two-Tier RBAC + ABAC)
- **Katman 1 — Tablo Bazlı Yetki Matrisi (`tablePermissions`):**
  Her kullanıcı için tablo bazında veya genel (`*`) olarak 7 ayrı işlem yetkisi tanımlanabilir:
  - `canView` (Görüntüleme)
  - `canCreate` (Yeni Kayıt Ekleme)
  - `canUpdate` (Düzenleme)
  - `canDelete` (Silme)
  - `canImport` (Excel'den İçe Aktarma)
  - `canExport` (Excel'e Dışa Aktarma)
  - `canApprove` (Onaylama / Revizyon İsteme)
- **Katman 2 — Hiyerarşik ve Çapraz Birim Kapsamı (`departmentScope`):**
  - `ALL`: Üniversite genelindeki tüm birimlere erişim.
  - `OWN_DEPT`: Kullanıcının kendi birimi ve organizasyon ağacındaki tüm alt birimleri (Örn. Dekan kendi fakültesini ve fakülteye bağlı tüm bölümleri otomatik görür).
  - `CUSTOM`: Organizasyon şemasından bağımsız olarak seçilen birden fazla birime çapraz erişim (Örn. Mühendislik Koordinatörü hem Bilgisayar hem Yazılım Mühendisliği verilerini yönetebilir).

### 3. Dinamik Tablo ve Şablon Oluşturucu (No-Code Table Builder)
Yöneticiler (`ADMIN`), hiçbir kod değişikliği yapmadan arayüz üzerinden yeni veri toplama tabloları oluşturabilir:
- **Sıfırdan Sütun Tasarımı:** Metin (`text`), Sayı (`number`), Tarih (`date`), Seçim Listesi (`select`) ve Mantıksal (`boolean`) sütun tipleri, zorunluluk (`required`), min/max ve seçenek tanımları.
- **Örnek Excel'den Otomatik Sütun Çıkarma (`parse-columns`):** Mevcut bir `.xlsx` veya `.xlsm` dosyasını yükleyerek başlık satırını ve veri tiplerini otomatik algılatıp saniyeler içinde canlı tabloya dönüştürme.

### 4. 1:1 Orijinal YÖK Excel Dışa/İçe Aktarım ve `.xlsm` Makro Koruma
- **Birebir Şablon Dışa Aktarım (Export):** Veriler dışa aktarılırken `2025-2026 yök izleme şablonlar/` klasöründeki orijinal YÖK Excel dosyası açılır; birleştirilmiş hücreler, renkler, kenarlıklar ve formüller bozulmadan ilgili hücrelere (`dataStartRow`) veriler işlenir.
- **`.xlsm` VBA Makro Koruma:** Makro içeren YÖK şablonlarında (`xl/vbaProject.bin` ve `[Content_Types].xml`) ikili makro yapısı ZIP katmanında korunarak dışa aktarılır; Excel'de açıldığında makrolar eksiksiz çalışır.
- **Hücre Bazlı Doğrulamalı İçe Aktarım (Import):** Yüklenen Excel dosyalarındaki her satır ve sütun, şablonun veri şemasına göre doğrulanır. Hatalı hücreler **tam Excel koordinatıyla** (Örn. `Hücre D12 (Başlangıç Tarihi): Geçerli bir tarih giriniz`) raporlanır.

### 5. Raporlama Dönemleri, Son Teslim Tarihleri ve Onay İş Akışı
- **Raporlama Dönemleri (`ReportingPeriod`):** `2025-2026` (Aktif), `2024-2025` (Salt Okunur / Arşiv) gibi dönemler ve her dönem için son veri giriş tarihi (`deadline`) yönetimi.
- **Kurumsal Onay İş Akışı (Approval Workflow):**
  - `DRAFT` (**Taslak**) → Birim kullanıcısı veri girer ve düzenler.
  - `SUBMITTED` (**Onaya Gönderildi**) → Kayıt kilitlenir ve üst birimin / dekanlığın incelemesine sunulur.
  - `APPROVED` (**Onaylandı**) → İnceleyici (`REVIEWER` / `ADMIN`) tarafından onaylanır ve resmi raporlamaya dahil edilir.
  - `REVISION_REQUESTED` (**Revizyon İsteniyor**) → İnceleyici gerekçe (`rejectionReason`) yazarak kaydı düzeltilmek üzere birime geri gönderir; tüm adımlar `workflowHistory` ve `AuditLog` üzerinde kayıt altına alınır.

---

## 🧪 Otomatik Testleri Çalıştırma

Projede birim testleri, RBAC/ABAC güvenlik testleri, Excel `.xlsx`/`.xlsm` şablon motoru testleri, onay iş akışı testleri ve uçtan uca (E2E) entegrasyon testlerinden oluşan **334+ otomatik test** bulunmaktadır.

Tüm test paketini çalıştırmak için:

```bash
npm test
```

Yardımcı NPM komutları:
```bash
npm run setup        # Backend + Frontend bağımlılıklarını kurar ve Frontend'i derler
npm run setup:quick  # Sadece Backend bağımlılıklarını kurar (hazır build ile hızlı başlatma için)
npm start            # Tüm sistemi (Backend + Frontend) başlatır ve tarayıcıyı açar
npm run seed         # Veritabanını başlangıç verileriyle yeniden besler
npm test             # Tüm Backend ve E2E testlerini çalıştırır
npm run docker:up    # Docker Compose ile tüm konteynerleri derler ve başlatır
npm run docker:down  # Docker Compose konteynerlerini durdurur
```

---

## 📁 Proje Dizin Yapısı

```text
├── 2025-2026 yök izleme şablonlar/   # 24 adet orijinal YÖK .xlsx ve .xlsm şablon dosyası
├── backend/                          # Express 5 + Mongoose REST API ve Excel Şablon Motoru
│   ├── config/                       # Veritabanı ve kalıcı yerel depolama (db_snapshot.json) yapılandırması
│   ├── controllers/                  # Yetkilendirme, Şablon, Veri Girişi, İş Akışı, Dönem ve Denetim İzi
│   ├── middleware/                   # JWT kimlik doğrulama ve 2 katmanlı RBAC/ABAC güvenlik katmanı
│   ├── models/                       # User, Department, TableTemplate, DataSubmission, ReportingPeriod, AuditLog
│   ├── seeds/                        # 41 şablon, organizasyon şeması ve 6 demo kullanıcısı tohumlama betikleri
│   ├── services/                     # ExcelJS + AdmZip (.xlsm VBA makro korumalı) dışa/içe aktarım servisi
│   └── tests/                        # Backend birim ve entegrasyon testleri
├── frontend/                         # React 19 kurumsal web arayüzü
│   ├── build/                        # Hazır üretim derlemesi (klonlandığında doğrudan çalışır)
│   ├── src/                          # Sayfalar, bileşenler, yetki korumalı rotalar ve API istemcisi
│   └── server.js                     # Sıfır bağımlılıklı statik dosya ve API ters vekil (reverse proxy) sunucusu
├── tests/                            # Uçtan uca (E2E) sistem doğrulama test paketi
├── KURULUM_VE_BASLAT.bat             # Windows için Docker gerektirmeyen tek tıkla başlatıcı
├── DOCKER_ILE_BASLAT.bat             # Windows için Docker Compose tek tıkla başlatıcı
├── start.sh                          # macOS / Linux için başlatıcı betik
├── start-all.js                      # Platform bağımsız Node.js anahtar teslim sistem başlatıcı
├── docker-compose.yml                # MongoDB 7 + Backend + Frontend Nginx konteyner orkestrasyonu
└── package.json                      # Kök proje komutları
```
