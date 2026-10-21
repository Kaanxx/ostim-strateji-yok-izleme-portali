/**
 * formulaEngine.js
 *
 * Client-side reactive calculation & validation engine mirroring
 * backend/services/formulaEngineService.js for zero-latency feedback
 * across all 24 official YÖK monitoring templates.
 */

export const KARBON_FACTORS = Object.freeze({
  dogalgaz: 2.0,    // kg CO2e / m3
  komur: 2460.0,    // kg CO2e / ton
  dizel: 11.5,      // kg CO2e / lt
  benzin: 9.5,      // kg CO2e / lt
  fuelOil: 3150.0   // kg CO2e / ton
});

export const MYO_SECTORS_27 = Object.freeze([
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

export const PROJELER_THEMES_8 = Object.freeze([
  'Yapay Zeka',
  'Savunma Sanayi',
  'Sürdürülebilirlik',
  'Toplumsal Fayda',
  'Afet Yönetimi',
  'Erişilebilirlik',
  'Enerji-Su-Atık',
  'Diğer'
]);

export const PROJELER_PARTNERS_4 = Object.freeze([
  'Kamu',
  'Sanayi',
  'STK',
  'Üniversite'
]);

export const DIJITAL_APPROVAL_ROLES = Object.freeze([
  'İlgili Veri Sahibi',
  'Memur',
  'Müdür-Şef',
  'Daire Başkanı',
  'Genel Sekreter'
]);

export const DIJITAL_ACCESS_TYPES = Object.freeze([
  'İnternet',
  'Yerleşke İçi',
  'Belirli Binalar',
  'Sadece Bilgisayar',
  'Ağ Dışı Ortam'
]);

export const DIJITAL_ACCESS_LEVELS = Object.freeze([
  'Sadece Yetkililer',
  'Bazı Modüllere Sadece Yetkililer',
  'Kullanıcı Adı Alan Herkes',
  'Anonim Herkes'
]);

export const DIJITAL_MATURITY_LEVELS = Object.freeze([
  'Farkındalık',
  'Kısmi Uygulamalar',
  'Stratejik Uygulamalar',
  'Bütünleşik Uygulamalar',
  'Kültüre Dönüşme'
]);

export const SORU_SETI_BOUNDS = [
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

export const FINANS_GREY_EXCLUDED_ROWS = [13, 14, 15, 33];

const DURATION_REGEX = /^\s*(\d+)\s*(Saat|Gün|Hafta|saat|gün|hafta)\s*$/u;

export function safeNumber(val, defaultVal = 0) {
  if (val === null || val === undefined || val === '') return defaultVal;
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
  const cleaned = String(val).replace(/\s+/g, '').replace(',', '.');
  const num = Number(cleaned);
  return isNaN(num) ? defaultVal : num;
}

export function formatTurkishNumber(val, decimals = 2) {
  if (val === null || val === undefined || val === '') return '0';
  const num = safeNumber(val, 0);
  return num.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
}

/**
 * Parses comma-delimited multi-select string preserving options that contain internal commas
 * (such as "Ağaç İşleri, Kağıt ve Kağıt Ürünleri", "Kimya, Petrol, Lastik ve Plastik", etc.)
 */
export function parseMultiSelectValue(value, allowedOptions = []) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((v) => String(v).trim()).filter(Boolean)));
  }
  const str = String(value).trim();
  if (!str) return [];

  if (allowedOptions && allowedOptions.length > 0) {
    const commaOptions = allowedOptions
      .filter((opt) => opt.includes(','))
      .sort((a, b) => b.length - a.length);
    let remaining = str;
    const extracted = [];
    for (const opt of commaOptions) {
      while (remaining.includes(opt)) {
        extracted.push(opt);
        remaining = remaining.replace(opt, '\u0000');
      }
    }
    const simpleParts = remaining
      .split(/[,\u0000]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return Array.from(new Set([...extracted, ...simpleParts]));
  }

  return Array.from(
    new Set(
      str
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
}

export function validateDuration(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return { isValid: false, message: 'Eğitim süresi zorunludur' };
  }
  const str = String(value).trim();
  const match = str.match(DURATION_REGEX);
  if (!match) {
    return {
      isValid: false,
      message: 'Format "<Sayı> Saat|Gün|Hafta" olmalıdır (Örn: "4 Saat", "2 Gün", "1 Hafta")'
    };
  }
  const num = parseInt(match[1], 10);
  const rawUnit = match[2].toLowerCase();
  const unit = rawUnit === 'saat' ? 'Saat' : rawUnit === 'gün' ? 'Gün' : 'Hafta';
  return {
    isValid: true,
    value: num,
    unit,
    normalized: `${num} ${unit}`
  };
}

export function validateKVKKDisabledMember(value) {
  if (value === null || value === undefined || value === '') {
    return { isValid: true, value: null };
  }
  const num = Number(value);
  if (isNaN(num) || !Number.isInteger(num) || num < 0) {
    return { isValid: false, message: 'Engelli üye sayısı 0 veya pozitif bir tamsayı olmalıdır.' };
  }
  if (num === 1 || num === 2) {
    return {
      isValid: false,
      code: 'KVKK_PRIVACY_VIOLATION',
      message:
        "KVKK Anonimleştirme Kuralı: Engelli üye sayısı 3'ten az (1 veya 2) olması halinde ilgili kulüp için Engelli Üye Sayısı paylaşılamaz. Lütfen 0 bırakınız veya 3 ve üzeri bir değer giriniz."
    };
  }
  return { isValid: true, value: num };
}

/**
 * 1. ENERJI (28 Fixed Rows)
 * - Row 8: Toplam = SUM(1..7)
 * - Row 16: Toplam2 = SUM(9..15)
 * - Rows 17..28: Temin kaynakları toplamı
 */
export function calculateEnerjiClient(rows = []) {
  const rowMap = {};
  const updatedRows = rows.map((r, idx) => {
    const rNum = r.rowNumber !== undefined ? r.rowNumber : idx + 1;
    const d = { ...(r.data || r) };
    rowMap[rNum] = d;
    return { ...r, rowNumber: rNum, data: d };
  });

  let unitElektrik = 0;
  let unitSu = 0;
  for (let i = 1; i <= 7; i++) {
    unitElektrik += safeNumber(rowMap[i]?.elektrik);
    unitSu += safeNumber(rowMap[i]?.su);
  }

  let actElektrik = 0;
  let actSu = 0;
  for (let i = 9; i <= 15; i++) {
    actElektrik += safeNumber(rowMap[i]?.elektrik);
    actSu += safeNumber(rowMap[i]?.su);
  }

  let supplyElektrik = 0;
  let supplySu = 0;
  for (let i = 17; i <= 28; i++) {
    supplyElektrik += safeNumber(rowMap[i]?.elektrik);
    supplySu += safeNumber(rowMap[i]?.su);
  }

  unitElektrik = Number(unitElektrik.toFixed(4));
  unitSu = Number(unitSu.toFixed(4));
  actElektrik = Number(actElektrik.toFixed(4));
  actSu = Number(actSu.toFixed(4));
  supplyElektrik = Number(supplyElektrik.toFixed(4));
  supplySu = Number(supplySu.toFixed(4));

  updatedRows.forEach((r) => {
    if (r.rowNumber === 8) {
      r.data.elektrik = unitElektrik;
      r.data.su = unitSu;
      r.data.isCalculated = true;
    } else if (r.rowNumber === 16) {
      r.data.elektrik = actElektrik;
      r.data.su = actSu;
      r.data.isCalculated = true;
    }
  });

  const diffElektrik = Number((unitElektrik - actElektrik).toFixed(4));
  const diffSu = Number((unitSu - actSu).toFixed(4));
  const isEqual = diffElektrik === 0 && diffSu === 0;
  const status = isEqual
    ? 'UYUMLU'
    : 'UYARI: Birim Tüketim Toplamı (Toplam) ile Faaliyet Tüketim Toplamı (Toplam2) Eşit Değil';

  return {
    rows: updatedRows,
    totals: {
      toplamElektrik: unitElektrik,
      toplamSu: unitSu,
      toplam2Elektrik: actElektrik,
      toplam2Su: actSu,
      supplyElektrik,
      supplySu,
      diffElektrik,
      diffSu,
      isEqual,
      status
    }
  };
}

/**
 * 2. FINANS (34 Fixed Rows)
 * - Row 16: Toplam Gelir = SUM(1..12) (excludes grey rows 13, 14, 15)
 * - Row 34: Toplam Gider = SUM(17..32) (row 32 permits negative, excludes grey row 33)
 * - Cash Difference check: "Tamam" vs "Gelir Gider Arasında Kasa Farkı Var"
 */
export function calculateFinansClient(rows = []) {
  const rowMap = {};
  const updatedRows = rows.map((r, idx) => {
    const rNum = r.rowNumber !== undefined ? r.rowNumber : idx + 1;
    const d = { ...(r.data || r) };
    rowMap[rNum] = d;
    return { ...r, rowNumber: rNum, data: d };
  });

  let toplamGelir = 0;
  for (let i = 1; i <= 12; i++) {
    toplamGelir += safeNumber(rowMap[i]?.tutar);
  }

  let toplamGider = 0;
  for (let i = 17; i <= 32; i++) {
    toplamGider += safeNumber(rowMap[i]?.tutar);
  }

  toplamGelir = Number(toplamGelir.toFixed(2));
  toplamGider = Number(toplamGider.toFixed(2));
  const kasaFarki = Number((toplamGelir - toplamGider).toFixed(2));
  const isBalanced = kasaFarki === 0;
  const status = isBalanced ? 'Tamam' : 'Gelir Gider Arasında Kasa Farkı Var';

  updatedRows.forEach((r) => {
    if (r.rowNumber === 16) {
      r.data.tutar = toplamGelir;
      r.data.isCalculated = true;
    } else if (r.rowNumber === 34) {
      r.data.tutar = toplamGider;
      r.data.kasaFarki = kasaFarki;
      r.data.status = status;
      r.data.durum = status;
      r.data.isCalculated = true;
    }
  });

  return {
    rows: updatedRows,
    totals: {
      toplamGelir,
      toplamGider,
      kasaFarki,
      isBalanced,
      status
    }
  };
}

/**
 * 3. KARBON_AYAKIZI (6 Fixed Rows)
 * Formula: 2*Doğalgaz + 2460*Kömür + 11.5*Dizel + 9.5*Benzin + 3150*FuelOil
 */
export function calculateKarbonClient(rows = []) {
  let sumDogalgaz = 0;
  let sumKomur = 0;
  let sumDizel = 0;
  let sumBenzin = 0;
  let sumFuelOil = 0;
  let totalEmissions = 0;

  const updatedRows = rows.map((r, idx) => {
    const rNum = r.rowNumber !== undefined ? r.rowNumber : idx + 1;
    const d = { ...(r.data || r) };

    const dogalgaz = safeNumber(d.dogalgaz);
    const komur = safeNumber(d.komur);
    const dizel = safeNumber(d.dizel);
    const benzin = safeNumber(d.benzin);
    const fuelOil = safeNumber(d.fuelOil !== undefined ? d.fuelOil : d.fueloil);

    sumDogalgaz += dogalgaz;
    sumKomur += komur;
    sumDizel += dizel;
    sumBenzin += benzin;
    sumFuelOil += fuelOil;

    const rowEmission = Number(
      (
        dogalgaz * KARBON_FACTORS.dogalgaz +
        komur * KARBON_FACTORS.komur +
        dizel * KARBON_FACTORS.dizel +
        benzin * KARBON_FACTORS.benzin +
        fuelOil * KARBON_FACTORS.fuelOil
      ).toFixed(2)
    );

    d.karbonAyakiziDegeri = rowEmission;
    totalEmissions += rowEmission;
    return { ...r, rowNumber: rNum, data: d };
  });

  totalEmissions = Number(totalEmissions.toFixed(2));
  return {
    rows: updatedRows,
    totals: {
      sumDogalgaz: Number(sumDogalgaz.toFixed(2)),
      sumKomur: Number(sumKomur.toFixed(2)),
      sumDizel: Number(sumDizel.toFixed(2)),
      sumBenzin: Number(sumBenzin.toFixed(2)),
      sumFuelOil: Number(sumFuelOil.toFixed(2)),
      totalEmissions,
      totalTonnesCO2e: Number((totalEmissions / 1000).toFixed(3))
    }
  };
}

/**
 * 4. ATIK (6 Fixed Rows)
 */
export function calculateAtikClient(rows = []) {
  let totalAtik = 0;
  let totalGeriDonusum = 0;

  const updatedRows = rows.map((r, idx) => {
    const rNum = r.rowNumber !== undefined ? r.rowNumber : idx + 1;
    const d = { ...(r.data || r) };
    const rowAtik =
      safeNumber(d.organikAtik) +
      safeNumber(d.tibbiAtik) +
      safeNumber(d.inorganikAtik) +
      safeNumber(d.elektronikAtik) +
      safeNumber(d.digerAtik);
    const rowGeri =
      safeNumber(d.plastikGeriDonusum) +
      safeNumber(d.camGeriDonusum) +
      safeNumber(d.kagitGeriDonusum) +
      safeNumber(d.evselGeriDonusum) +
      safeNumber(d.digerGeriDonusum);

    totalAtik += rowAtik;
    totalGeriDonusum += rowGeri;
    return { ...r, rowNumber: rNum, data: d };
  });

  return {
    rows: updatedRows,
    totals: {
      totalAtik: Number(totalAtik.toFixed(3)),
      totalGeriDonusum: Number(totalGeriDonusum.toFixed(3))
    }
  };
}

/**
 * 5. SORU_SETI (22 Fixed Rows)
 * Conditional alert on rows 9 & 10 when cevap > 89
 */
export function calculateSoruSetiClient(rows = []) {
  const warnings = [];
  const updatedRows = rows.map((r, idx) => {
    const rNum = r.rowNumber !== undefined ? r.rowNumber : idx + 1;
    const d = { ...(r.data || r) };
    const val = d.cevap !== '' && d.cevap !== null && d.cevap !== undefined ? safeNumber(d.cevap, null) : null;

    if (rNum === 9 || rNum === 10) {
      if (val !== null && val > 89) {
        d.not = `%${val} sağladığınızı nasıl kontrol edebileceğimize dair Açıklama sayfasına Açıklama yapınız.`;
        d.requiresExplanation = true;
        if (!d.aciklama || String(d.aciklama).trim() === '') {
          warnings.push({
            rowNumber: rNum,
            label: d.soru || d.label,
            val,
            message: d.not
          });
        }
      } else {
        d.not = '0-100 arasında olmalıdır.';
        d.requiresExplanation = false;
      }
    }
    return { ...r, rowNumber: rNum, data: d };
  });

  return {
    rows: updatedRows,
    warnings
  };
}

/**
 * 6. MEMNUNIYET_ANKETI (Dynamic Row Calculation)
 */
export function enrichMemnuniyetRow(rowData = {}) {
  const d = { ...rowData };
  const rawScale = d.olcumSkalasi;
  const rawScore = d.ortalamaAnketPuani !== undefined ? d.ortalamaAnketPuani : d.ortalamaPuan;

  let normalized = '';
  if (rawScore !== null && rawScore !== undefined && String(rawScore).trim() !== '') {
    const s = Number(rawScore);
    const sc = Number(rawScale);
    if (!isNaN(s)) {
      if (sc === 5) normalized = Number((s * 20).toFixed(2));
      else if (sc === 10) normalized = Number((s * 10).toFixed(2));
      else if (sc === 100) normalized = Number(s.toFixed(2));
    }
  }
  d.normalizeAnketPuani = normalized;
  return d;
}

/**
 * 7. PROJELER (Dynamic Row Budget Check)
 */
export function enrichProjelerRow(rowData = {}) {
  const d = { ...rowData };
  const totalBudget = d.butcesiTl !== undefined ? d.butcesiTl : d.butcesiTL;

  const breakdownSum = Number(
    (
      safeNumber(d.merkeziYatirimButcesi) +
      safeNumber(d.donerSermaye) +
      safeNumber(d.digerKurumIci !== undefined ? d.digerKurumIci : d.digerKurumIciKaynaklar) +
      safeNumber(d.tubitak) +
      safeNumber(d.ulusalKamu !== undefined ? d.ulusalKamu : d.ulusalKamuKurumlari) +
      safeNumber(d.ulusalSektorel !== undefined ? d.ulusalSektorel : d.ulusalSektorelKuruluslar) +
      safeNumber(d.ulusalStk !== undefined ? d.ulusalStk : d.ulusalStklar) +
      safeNumber(d.uluslararasiFonlar) +
      safeNumber(d.uluslararasiSektorel !== undefined ? d.uluslararasiSektorel : d.uluslararasiSektorelKuruluslar)
    ).toFixed(2)
  );

  let status = '';
  if (totalBudget !== null && totalBudget !== undefined && String(totalBudget).trim() !== '') {
    const q = Number(totalBudget);
    status = Math.abs(q - breakdownSum) < 0.01 ? 'Bütçe Tamam' : 'Bütçeleri Kontrol Et';
  }
  d.butceDurumu = status;
  d.breakdownSum = breakdownSum;
  return d;
}
