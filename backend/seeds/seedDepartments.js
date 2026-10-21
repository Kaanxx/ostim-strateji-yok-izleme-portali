const Department = require('../models/Department');

const seedDepartments = async () => {
  console.log('🌱 Seeding OSTİM Teknik Üniversitesi department hierarchy...');

  // Helper to ensure department exists and updates ancestors if needed
  const ensureDept = async (data, parentDoc = null) => {
    let dept = await Department.findOne({ code: data.code });
    const ancestors = parentDoc ? [...parentDoc.ancestors, parentDoc._id] : [];
    const parentId = parentDoc ? parentDoc._id : null;

    if (!dept) {
      dept = await Department.create({
        ...data,
        parentId,
        ancestors
      });
      console.log(`  + Created: ${data.name} [${data.code}]`);
    } else {
      dept.name = data.name;
      dept.type = data.type;
      dept.parentId = parentId;
      dept.ancestors = ancestors;
      dept.order = data.order || 0;
      await dept.save();
    }
    return dept;
  };

  // 1. Root: Rektörlük
  const rektorluk = await ensureDept({
    name: 'OSTİM Teknik Üniversitesi Rektörlüğü',
    code: 'REKTORLUK',
    type: 'RECTORATE',
    order: 1
  }, null);

  // 2. Faculties
  const muhFak = await ensureDept({
    name: 'Mühendislik Fakültesi',
    code: 'MUH_FAK',
    type: 'FACULTY',
    order: 10
  }, rektorluk);

  const iibf = await ensureDept({
    name: 'İktisadi ve İdari Bilimler Fakültesi',
    code: 'IIBF',
    type: 'FACULTY',
    order: 20
  }, rektorluk);

  const mimarlikFak = await ensureDept({
    name: 'Mimarlık ve Tasarım Fakültesi',
    code: 'MIMARLIK_TASARIM_FAK',
    type: 'FACULTY',
    order: 30
  }, rektorluk);

  // 3. Vocational School & Institute
  const myo = await ensureDept({
    name: 'Meslek Yüksekokulu',
    code: 'MYO',
    type: 'MYO',
    order: 40
  }, rektorluk);

  const enstitu = await ensureDept({
    name: 'Lisansüstü Eğitim Enstitüsü',
    code: 'LISANSUSTU_ENSTITU',
    type: 'INSTITUTE',
    order: 50
  }, rektorluk);

  // 4. Engineering Departments
  const engDepts = [
    { name: 'Bilgisayar Mühendisliği', code: 'BILGISAYAR_MUH', order: 11 },
    { name: 'Yazılım Mühendisliği', code: 'YAZILIM_MUH', order: 12 },
    { name: 'Elektrik-Elektronik Mühendisliği', code: 'ELEKTRIK_ELEKTRONIK_MUH', order: 13 },
    { name: 'Makine Mühendisliği', code: 'MAKINE_MUH', order: 14 },
    { name: 'Endüstri Mühendisliği', code: 'ENDUSTRI_MUH', order: 15 },
    { name: 'Havacılık ve Uzay Mühendisliği', code: 'HAVACILIK_UZAY_MUH', order: 16 },
    { name: 'Siber Güvenlik Mühendisliği', code: 'SIBER_GUVENLIK_MUH', order: 17 },
    { name: 'Yapay Zeka Mühendisliği', code: 'YAPAY_ZEKA_MUH', order: 18 }
  ];

  for (const d of engDepts) {
    await ensureDept({ ...d, type: 'DEPARTMENT' }, muhFak);
  }

  // 5. İİBF Departments
  const iibfDepts = [
    { name: 'İşletme', code: 'ISLETME', order: 21 },
    { name: 'İktisat', code: 'IKTISAT', order: 22 },
    { name: 'Uluslararası Ticaret ve Finansman', code: 'ULUSLARARASI_TICARET', order: 23 },
    { name: 'Yönetim Bilişim Sistemleri', code: 'YBS', order: 24 },
    { name: 'Pazarlama', code: 'PAZARLAMA', order: 25 }
  ];

  for (const d of iibfDepts) {
    await ensureDept({ ...d, type: 'DEPARTMENT' }, iibf);
  }

  // 6. Mimarlık ve Tasarım Departments
  const mimarlikDepts = [
    { name: 'Mimarlık', code: 'MIMARLIK', order: 31 },
    { name: 'İç Mimarlık ve Çevre Tasarımı', code: 'IC_MIMARLIK', order: 32 },
    { name: 'Endüstriyel Tasarım', code: 'ENDUSTRIYEL_TASARIM', order: 33 }
  ];

  for (const d of mimarlikDepts) {
    await ensureDept({ ...d, type: 'DEPARTMENT' }, mimarlikFak);
  }

  // 7. MYO Programs
  const myoPrograms = [
    { name: 'Bilgisayar Programcılığı', code: 'BILGISAYAR_PROG', order: 41 },
    { name: 'Bilişim Güvenliği Teknolojisi', code: 'BILISIM_GUVENLIGI', order: 42 },
    { name: 'Elektronik Teknolojisi', code: 'ELEKTRONIK_TEK', order: 43 },
    { name: 'Makine (MYO)', code: 'MYO_MAKINE', order: 44 },
    { name: 'Mekatronik', code: 'MEKATRONIK', order: 45 },
    { name: 'Hibrid ve Elektrikli Taşıtlar Teknolojisi', code: 'HIBRID_ELEKTRIKLI_TASITLAR', order: 46 },
    { name: 'İnsansız Hava Aracı (İHA) Teknolojisi ve Operatörlüğü', code: 'IHA_TEKNOLOJISI', order: 47 },
    { name: 'E-Ticaret ve Pazarlama', code: 'E_TICARET', order: 48 }
  ];

  for (const p of myoPrograms) {
    await ensureDept({ ...p, type: 'DEPARTMENT' }, myo);
  }

  // 8. Institute Branches
  await ensureDept({ name: 'Fen Bilimleri Anabilim Dalı', code: 'FEN_BILIMLERI', type: 'DEPARTMENT', order: 51 }, enstitu);
  await ensureDept({ name: 'Sosyal Bilimler Anabilim Dalı', code: 'SOSYAL_BILIMLER', type: 'DEPARTMENT', order: 52 }, enstitu);

  // 9. Administrative Units
  const adminUnits = [
    { name: 'Genel Sekreterlik', code: 'GENEL_SEKRETERLIK', order: 61 },
    { name: 'Strateji Geliştirme Daire Başkanlığı', code: 'STRATEJI_GELISTIRME', order: 62 },
    { name: 'Öğrenci İşleri Daire Başkanlığı', code: 'OGRENCI_ISLERI', order: 63 },
    { name: 'Personel Daire Başkanlığı', code: 'PERSONEL_DAIRE', order: 64 },
    { name: 'Bilgi İşlem Daire Başkanlığı', code: 'BILGI_ISLEM', order: 65 },
    { name: 'Kütüphane ve Dokümantasyon Daire Başkanlığı', code: 'KUTUPHANE', order: 66 },
    { name: 'İdari ve Mali İşler Daire Başkanlığı', code: 'IDARI_MALI_ISLER', order: 67 },
    { name: 'Sağlık, Kültür ve Spor Daire Başkanlığı (SKS)', code: 'SKS', order: 68 }
  ];

  for (const u of adminUnits) {
    await ensureDept({ ...u, type: 'ADMIN_UNIT' }, rektorluk);
  }

  // 10. Research Centers
  const researchCenters = [
    { name: 'OSTİM DİJİTAL (Dijital Dönüşüm UAM)', code: 'OSTIM_DIJITAL', order: 71 },
    { name: 'Bilimsel Araştırma Projeleri (BAP) Koordinatörlüğü', code: 'BAP_KOORDINATORLUK', order: 72 },
    { name: 'Teknoloji Transfer Ofisi (TTO)', code: 'TTO', order: 73 },
    { name: 'Sürekli Eğitim Merkezi (SEM)', code: 'SEM_MERKEZ', order: 74 },
    { name: 'Ahi Evran Anadolu Müteşebbisliği UAM', code: 'AHI_EVRAN_UAM', order: 75 },
    { name: 'Enerji Teknolojileri UAM', code: 'ENERJI_TEKNOLOJILERI_UAM', order: 76 },
    { name: 'Girişimcilik ve Liderlik UAM', code: 'GIRISIMCILIK_UAM', order: 77 }
  ];

  for (const rc of researchCenters) {
    await ensureDept({ ...rc, type: 'RESEARCH_CENTER' }, rektorluk);
  }

  console.log('✅ Department hierarchy seeded successfully.');
};

module.exports = seedDepartments;
