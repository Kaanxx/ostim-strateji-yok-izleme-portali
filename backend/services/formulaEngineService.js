/**
 * formulaEngineService.js
 * 
 * Production live formula calculation and custom field validation engine
 * for official YÖK monitoring templates and institutional portal tables.
 */

const {
  MYO_SECTORS_27,
  PROJELER_THEMES_8,
  PROJELER_PARTNERS_4
} = require('../seeds/templates/referenceDictionaries');

// Emission conversion factors (kg CO2e / unit)
const KARBON_FACTORS = Object.freeze({
  dogalgaz: 2.0,    // kg CO2e / m3
  komur: 2460.0,    // kg CO2e / ton
  dizel: 11.5,      // kg CO2e / lt
  benzin: 9.5,      // kg CO2e / lt
  fuelOil: 3150.0   // kg CO2e / ton
});

const DURATION_REGEX = /^\s*(\d+)\s*(Saat|Gün|Hafta|saat|gün|hafta)\s*$/u;

/**
 * Safely parses numbers from various formats (string with comma, numbers, null/undefined)
 */
function safeNumber(val, defaultVal = 0) {
  if (val === null || val === undefined || val === '') return defaultVal;
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
  const cleaned = String(val).replace(/\s+/g, '').replace(',', '.');
  const num = Number(cleaned);
  return isNaN(num) ? defaultVal : num;
}

/**
 * Normalizes template code to clean uppercase alphanumeric representation
 */
function normalizeCode(code) {
  return (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Validates duration format for EgiticilerinEgitimi: <Sayı> Saat|Gün|Hafta
 */
function validateDuration(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return { isValid: false, message: 'Eğitim süresi zorunludur' };
  }
  const str = String(value).trim();
  const match = str.match(DURATION_REGEX);
  if (!match) {
    return {
      isValid: false,
      message: 'Eğitim süresi "<Sayı> Saat|Gün|Hafta" formatında olmalıdır (Örnek: "3 Saat", "2 Gün", "1 Hafta")'
    };
  }
  const num = parseInt(match[1], 10);
  const rawUnit = match[2].toLowerCase();
  const unit = rawUnit === 'saat' ? 'Saat' : (rawUnit === 'gün' ? 'Gün' : 'Hafta');
  return {
    isValid: true,
    value: num,
    unit,
    normalized: `${num} ${unit}`
  };
}

/**
 * KVKK Privacy validation for OgrenciTopluluklari:
 * Disabled member count cannot be 1 or 2 (must be 0, null/blank, or >= 3).
 */
function validateKVKKDisabledMember(value) {
  if (value === null || value === undefined || value === '') {
    return { isValid: true, value: null };
  }
  const num = Number(value);
  if (isNaN(num) || !Number.isInteger(num) || num < 0) {
    return { isValid: false, message: 'Engelli üye sayısı pozitif bir tamsayı veya 0 olmalıdır' };
  }
  if (num === 1 || num === 2) {
    return {
      isValid: false,
      code: 'KVKK_PRIVACY_VIOLATION',
      message: "Engelli üye sayısı 3'ten az olması halinde ilgili kulüp için Engelli Üye Sayısı değeri paylaşılamaz (KVKK anonimleştirme kuralı). Lütfen 0 bırakınız veya 3 ve üzeri bir değer giriniz."
    };
  }
  return { isValid: true, value: num };
}

/**
 * Multi-Select tag picker validation with deduplication and token checking.
 */
function validateMultiSelectTags(value, allowedOptions = [], options = {}) {
  const { required = false, allowDuplicates = false } = options;
  if (value === null || value === undefined || (Array.isArray(value) && value.length === 0) || String(value).trim() === '') {
    if (required) {
      return { isValid: false, message: 'En az bir seçenek seçilmelidir', tags: [], commaSeparated: '' };
    }
    return { isValid: true, tags: [], commaSeparated: '' };
  }

  let tokens = [];
  if (Array.isArray(value)) {
    tokens = value.map(v => String(v).trim()).filter(Boolean);
  } else if (typeof value === 'string') {
    const trimmedVal = value.trim();
    if (allowedOptions && allowedOptions.length > 0) {
      // Sort options with commas longest-first so embedded commas in official sector names are preserved
      const commaOptions = allowedOptions
        .filter(opt => opt.includes(','))
        .sort((a, b) => b.length - a.length);
      let remaining = trimmedVal;
      const extracted = [];
      for (const opt of commaOptions) {
        while (remaining.includes(opt)) {
          extracted.push(opt);
          remaining = remaining.replace(opt, '\u0000');
        }
      }
      const simpleParts = remaining
        .split(/[,\u0000]/)
        .map(s => s.trim())
        .filter(Boolean);
      tokens = [...extracted, ...simpleParts];
    } else {
      tokens = trimmedVal.split(',').map(s => s.trim()).filter(Boolean);
    }
  } else {
    return { isValid: false, message: 'Geçersiz çoklu seçim veri formatı', tags: [], commaSeparated: '' };
  }

  const uniqueTags = allowDuplicates ? tokens : Array.from(new Set(tokens));

  if (allowedOptions && allowedOptions.length > 0) {
    const allowedSet = new Set(allowedOptions);
    const invalidTokens = uniqueTags.filter(t => !allowedSet.has(t));
    if (invalidTokens.length > 0) {
      return {
        isValid: false,
        invalidTokens,
        tags: uniqueTags,
        commaSeparated: uniqueTags.join(','),
        message: `Geçersiz seçenek(ler): "${invalidTokens.join(', ')}". İzin verilen seçenekler: ${allowedOptions.slice(0, 5).join(', ')}...`
      };
    }
  }

  return {
    isValid: true,
    tags: uniqueTags,
    commaSeparated: uniqueTags.join(',')
  };
}

// -------------------------------------------------------------
// TEMPLATE FORMULA CALCULATIONS
// -------------------------------------------------------------

/**
 * Enerji Calculation Engine:
 * - Row 8: Auto-sum rows 1-7 (Unit Consumption)
 * - Row 16: Auto-sum rows 9-15 (Activity Consumption)
 * - Rows 17-28: Supply sources sum
 * - Equality check warning
 */
function calculateEnerji(rows = []) {
  const rowMap = {};
  const normalizedRows = [];

  rows.forEach((r, idx) => {
    const rowNum = r.rowNumber !== undefined ? r.rowNumber : (idx + 1);
    const rowData = { ...(r.data || r) };
    rowMap[rowNum] = rowData;
    normalizedRows.push({ ...r, rowNumber: rowNum, data: rowData });
  });

  // 1. Sum Unit Consumption (Rows 1..7)
  let unitElektrik = 0;
  let unitSu = 0;
  for (let i = 1; i <= 7; i++) {
    const d = rowMap[i] || {};
    unitElektrik += safeNumber(d.elektrik);
    unitSu += safeNumber(d.su);
  }

  // 2. Sum Activity Consumption (Rows 9..15)
  let actElektrik = 0;
  let actSu = 0;
  for (let i = 9; i <= 15; i++) {
    const d = rowMap[i] || {};
    actElektrik += safeNumber(d.elektrik);
    actSu += safeNumber(d.su);
  }

  // 3. Sum Supply Sources (Rows 17..28)
  let supplyElektrik = 0;
  let supplySu = 0;
  for (let i = 17; i <= 28; i++) {
    const d = rowMap[i] || {};
    supplyElektrik += safeNumber(d.elektrik);
    supplySu += safeNumber(d.su);
  }

  unitElektrik = Number(unitElektrik.toFixed(4));
  unitSu = Number(unitSu.toFixed(4));
  actElektrik = Number(actElektrik.toFixed(4));
  actSu = Number(actSu.toFixed(4));
  supplyElektrik = Number(supplyElektrik.toFixed(4));
  supplySu = Number(supplySu.toFixed(4));

  // Populate Row 8 (Toplam) and Row 16 (Toplam2)
  normalizedRows.forEach(r => {
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
  const isEqual = (diffElektrik === 0) && (diffSu === 0);
  const status = isEqual ? 'UYUMLU' : 'UYARI: Birim Tüketim Toplamı (Toplam) ile Faaliyet Tüketim Toplamı (Toplam2) Eşit Değil';

  const warnings = [];
  if (!isEqual) {
    if (diffElektrik !== 0) {
      warnings.push({
        field: 'elektrik',
        type: 'WARNING',
        message: `Elektrik birim tüketimleri (Toplam: ${unitElektrik} kW-saat) ile faaliyet tüketimleri (Toplam2: ${actElektrik} kW-saat) uyuşmuyor. Fark: ${diffElektrik} kW-saat.`
      });
    }
    if (diffSu !== 0) {
      warnings.push({
        field: 'su',
        type: 'WARNING',
        message: `Su birim tüketimleri (Toplam: ${unitSu} m3) ile faaliyet tüketimleri (Toplam2: ${actSu} m3) uyuşmuyor. Fark: ${diffSu} m3.`
      });
    }
  }

  return {
    calculated: true,
    rows: normalizedRows,
    totals: {
      toplamElektrik: unitElektrik,
      toplamSu: unitSu,
      toplam2Elektrik: actElektrik,
      toplam2Su: actSu,
      supplyElektrik,
      supplySu,
      isEqual,
      status
    },
    warnings,
    summary: {
      isEqual,
      status,
      authoritativeTotal: { elektrik: unitElektrik, su: unitSu }
    }
  };
}

/**
 * Finans Calculation Engine:
 * - Row 16: Toplam Gelir = SUM(rows 1..12), excludes grey rows 13, 14, 15
 * - Row 34: Toplam Gider = SUM(rows 17..32), row 32 permits negative values, excludes grey row 33
 * - Cash difference check
 */
function calculateFinans(rows = []) {
  const rowMap = {};
  const normalizedRows = [];

  rows.forEach((r, idx) => {
    const rowNum = r.rowNumber !== undefined ? r.rowNumber : (idx + 1);
    const rowData = { ...(r.data || r) };
    rowMap[rowNum] = rowData;
    normalizedRows.push({ ...r, rowNumber: rowNum, data: rowData });
  });

  // Toplam Gelir: Sum rows 1..12 (strictly excludes 13, 14, 15)
  let toplamGelir = 0;
  for (let i = 1; i <= 12; i++) {
    const d = rowMap[i] || {};
    toplamGelir += safeNumber(d.tutar);
  }

  // Toplam Gider: Sum rows 17..32 (strictly excludes row 33)
  let toplamGider = 0;
  for (let i = 17; i <= 32; i++) {
    const d = rowMap[i] || {};
    toplamGider += safeNumber(d.tutar);
  }

  toplamGelir = Number(toplamGelir.toFixed(2));
  toplamGider = Number(toplamGider.toFixed(2));

  const kasaFarki = Number((toplamGelir - toplamGider).toFixed(2));
  const isBalanced = kasaFarki === 0;
  const status = isBalanced ? 'Tamam' : 'Gelir Gider Arasında Kasa Farkı Var';

  normalizedRows.forEach(r => {
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

  const warnings = [];
  if (!isBalanced) {
    warnings.push({
      field: 'kasaFarki',
      type: 'WARNING',
      message: `Gelir Gider Arasında Kasa Farkı Var! Toplam Gelir: ${toplamGelir} TL, Toplam Gider: ${toplamGider} TL, Fark: ${kasaFarki} TL.`
    });
  }

  return {
    calculated: true,
    rows: normalizedRows,
    totals: {
      toplamGelir,
      toplamGider,
      kasaFarki,
      status,
      isBalanced
    },
    warnings,
    summary: {
      toplamGelir,
      toplamGider,
      kasaFarki,
      status,
      isBalanced
    }
  };
}

/**
 * KarbonAyakizi Calculation Engine:
 * Formula: 2*Doğalgaz + 2460*Kömür + 11.5*Dizel + 9.5*Benzin + 3150*FuelOil
 */
function calculateKarbonAyakizi(rows = []) {
  const normalizedRows = [];
  let sumDogalgaz = 0;
  let sumKomur = 0;
  let sumDizel = 0;
  let sumBenzin = 0;
  let sumFuelOil = 0;
  let totalEmissions = 0;

  rows.forEach((r, idx) => {
    const rowNum = r.rowNumber !== undefined ? r.rowNumber : (idx + 1);
    const rowData = { ...(r.data || r) };

    const dogalgaz = safeNumber(rowData.dogalgaz);
    const komur = safeNumber(rowData.komur);
    const dizel = safeNumber(rowData.dizel);
    const benzin = safeNumber(rowData.benzin);
    const fueloil = safeNumber(rowData.fueloil !== undefined ? rowData.fueloil : rowData.fuelOil);

    sumDogalgaz += dogalgaz;
    sumKomur += komur;
    sumDizel += dizel;
    sumBenzin += benzin;
    sumFuelOil += fueloil;

    const rowEmission = Number((
      dogalgaz * KARBON_FACTORS.dogalgaz +
      komur * KARBON_FACTORS.komur +
      dizel * KARBON_FACTORS.dizel +
      benzin * KARBON_FACTORS.benzin +
      fueloil * KARBON_FACTORS.fuelOil
    ).toFixed(2));

    rowData.karbonAyakiziDegeri = rowEmission;
    totalEmissions += rowEmission;
    normalizedRows.push({ ...r, rowNumber: rowNum, data: rowData });
  });

  totalEmissions = Number(totalEmissions.toFixed(2));

  return {
    calculated: true,
    rows: normalizedRows,
    totals: {
      sumDogalgaz,
      sumKomur,
      sumDizel,
      sumBenzin,
      sumFuelOil,
      totalEmissions,
      totalTonnesCO2e: Number((totalEmissions / 1000).toFixed(3))
    },
    warnings: [],
    summary: {
      totalEmissions,
      sumDogalgaz,
      sumKomur,
      sumDizel,
      sumBenzin,
      sumFuelOil
    }
  };
}

/**
 * MemnuniyetAnketi Calculation Engine:
 * - Scale 5: score * 20
 * - Scale 10: score * 10
 * - Scale 100: score
 */
function calculateMemnuniyetAnketi(rowsOrRow) {
  const isArray = Array.isArray(rowsOrRow);
  const rows = isArray ? rowsOrRow : [rowsOrRow];
  const normalizedRows = [];

  rows.forEach((r, idx) => {
    const rowNum = r.rowNumber !== undefined ? r.rowNumber : (idx + 1);
    const rowData = { ...(r.data || r) };

    const rawScale = rowData.olcumSkalasi;
    const rawScore = rowData.ortalamaAnketPuani !== undefined ? rowData.ortalamaAnketPuani : rowData.ortalamaPuan;

    let normalized = null;
    if (rawScore !== null && rawScore !== undefined && rawScore !== '') {
      const s = Number(rawScore);
      const sc = Number(rawScale);
      if (sc === 5) normalized = s * 20;
      else if (sc === 10) normalized = s * 10;
      else if (sc === 100) normalized = s;
    }

    rowData.normalizeAnketPuani = normalized;
    normalizedRows.push({ ...r, rowNumber: rowNum, data: rowData });
  });

  return {
    calculated: true,
    rows: isArray ? normalizedRows : normalizedRows[0],
    summary: {
      rowCount: normalizedRows.length
    }
  };
}

/**
 * Projeler Calculation Engine:
 * - Compares Column Q (butcesiTl) against sum of columns AE..AM (9 breakdown sources)
 * - Returns "Bütçe Tamam" or "Bütçeleri Kontrol Et"
 */
function calculateProjeler(rowsOrRow) {
  const isArray = Array.isArray(rowsOrRow);
  const rows = isArray ? rowsOrRow : [rowsOrRow];
  const normalizedRows = [];

  rows.forEach((r, idx) => {
    const rowNum = r.rowNumber !== undefined ? r.rowNumber : (idx + 1);
    const rowData = { ...(r.data || r) };

    const totalBudget = rowData.butcesiTl !== undefined ? rowData.butcesiTl : rowData.butcesiTL;

    const breakdownSum = Number((
      safeNumber(rowData.merkeziYatirimButcesi) +
      safeNumber(rowData.donerSermaye) +
      safeNumber(rowData.digerKurumIci !== undefined ? rowData.digerKurumIci : rowData.digerKurumIciKaynaklar) +
      safeNumber(rowData.tubitak) +
      safeNumber(rowData.ulusalKamu !== undefined ? rowData.ulusalKamu : rowData.ulusalKamuKurumlari) +
      safeNumber(rowData.ulusalSektorel !== undefined ? rowData.ulusalSektorel : rowData.ulusalSektorelKuruluslar) +
      safeNumber(rowData.ulusalStk !== undefined ? rowData.ulusalStk : rowData.ulusalStklar) +
      safeNumber(rowData.uluslararasiFonlar) +
      safeNumber(rowData.uluslararasiSektorel !== undefined ? rowData.uluslararasiSektorel : rowData.uluslararasiSektorelKuruluslar)
    ).toFixed(2));

    let status = '';
    if (totalBudget !== null && totalBudget !== undefined && String(totalBudget).trim() !== '') {
      const q = Number(totalBudget);
      status = Math.abs(q - breakdownSum) < 0.01 ? 'Bütçe Tamam' : 'Bütçeleri Kontrol Et';
    }

    rowData.butceDurumu = status;
    rowData.breakdownSum = breakdownSum;
    normalizedRows.push({ ...r, rowNumber: rowNum, data: rowData });
  });

  return {
    calculated: true,
    rows: isArray ? normalizedRows : normalizedRows[0],
    summary: {
      rowCount: normalizedRows.length
    }
  };
}

/**
 * SoruSeti Calculation Engine:
 * - Rows 9 & 10 conditional prompt note when score > 89
 */
function calculateSoruSeti(rows = []) {
  const normalizedRows = [];

  rows.forEach((r, idx) => {
    const rowNum = r.rowNumber !== undefined ? r.rowNumber : (idx + 1);
    const rowData = { ...(r.data || r) };
    const val = safeNumber(rowData.cevap, null);

    if (rowNum === 9 || rowNum === 10) {
      if (val !== null && val > 89) {
        rowData.not = `%${val} sağladığınızı nasıl kontrol edebileceğimize dair Açıklama sayfasına Açıklama yapınız.`;
        rowData.requiresExplanation = true;
      } else {
        rowData.not = '0-100 arasında olmalıdır.';
        rowData.requiresExplanation = false;
      }
    }

    normalizedRows.push({ ...r, rowNumber: rowNum, data: rowData });
  });

  return {
    calculated: true,
    rows: normalizedRows,
    summary: {
      rowCount: normalizedRows.length
    }
  };
}

/**
 * Master calculation dispatcher
 */
function calculate(templateCode, payload = {}) {
  const norm = normalizeCode(templateCode);
  const rows = Array.isArray(payload.rows)
    ? payload.rows
    : (Array.isArray(payload) ? payload : (payload.data ? [payload.data] : []));

  if (norm === 'ENERJI') {
    return calculateEnerji(rows);
  }
  if (norm === 'FINANS') {
    return calculateFinans(rows);
  }
  if (norm === 'KARBONAYAKIZI') {
    return calculateKarbonAyakizi(rows);
  }
  if (norm.startsWith('MEMNUNIYET')) {
    return calculateMemnuniyetAnketi(rows);
  }
  if (norm === 'PROJELER') {
    return calculateProjeler(rows);
  }
  if (norm === 'SORUSETI') {
    return calculateSoruSeti(rows);
  }

  return {
    calculated: false,
    message: `Şablon (${templateCode}) için live formül kuralı tanımlı değildir`,
    rows
  };
}

/**
 * Pre-Save Hook:
 * Runs custom validations, throws or returns structured errors,
 * then enriches rows with live calculated values.
 */
function preSaveHook(templateCode, payload = {}) {
  const norm = normalizeCode(templateCode);
  const isArray = Array.isArray(payload.rows) ? true : (Array.isArray(payload) ? true : false);
  const rawRows = isArray ? (payload.rows || payload) : [payload.data || payload];

  const errors = [];
  const normalizedRows = [];

  rawRows.forEach((r, idx) => {
    const rowNum = r.rowNumber !== undefined ? r.rowNumber : (idx + 1);
    const rowData = { ...(r.data || r) };

    // 1. Duration regex on EgiticilerinEgitimi
    if (norm === 'EGITICILERINEGITIMI') {
      const dur = rowData.egitiminSuresi;
      if (dur !== undefined && dur !== null && dur !== '') {
        const durRes = validateDuration(dur);
        if (!durRes.isValid) {
          errors.push({
            row: rowNum,
            field: 'egitiminSuresi',
            value: dur,
            message: durRes.message
          });
        } else {
          rowData.egitiminSuresi = durRes.normalized;
        }
      }
    }

    // 2. KVKK Privacy on OgrenciTopluluklari
    if (norm === 'OGRENCITOPLULUKLARI') {
      const disabledVal = rowData.engelliUyeSayisi;
      const kvkkRes = validateKVKKDisabledMember(disabledVal);
      if (!kvkkRes.isValid) {
        errors.push({
          row: rowNum,
          field: 'engelliUyeSayisi',
          value: disabledVal,
          code: kvkkRes.code,
          message: kvkkRes.message
        });
      }
    }

    // 3. Multi-Select Tags on MYOUygulamaliEgitim
    if (norm === 'MYOUYGULAMALIEGITIM' || norm === 'MYOUYGULAMALI') {
      if (rowData.isletmeSektoru !== undefined) {
        const tagRes = validateMultiSelectTags(rowData.isletmeSektoru, MYO_SECTORS_27);
        if (!tagRes.isValid) {
          errors.push({
            row: rowNum,
            field: 'isletmeSektoru',
            message: tagRes.message
          });
        } else {
          rowData.isletmeSektoru = tagRes.commaSeparated;
        }
      }
      if (rowData.stajSektoru !== undefined) {
        const tagRes = validateMultiSelectTags(rowData.stajSektoru, MYO_SECTORS_27);
        if (!tagRes.isValid) {
          errors.push({
            row: rowNum,
            field: 'stajSektoru',
            message: tagRes.message
          });
        } else {
          rowData.stajSektoru = tagRes.commaSeparated;
        }
      }
    }

    // 4. Multi-Select Tags on Projeler
    if (norm === 'PROJELER') {
      if (rowData.projeTemasi !== undefined) {
        const tagRes = validateMultiSelectTags(rowData.projeTemasi, PROJELER_THEMES_8);
        if (!tagRes.isValid) {
          errors.push({
            row: rowNum,
            field: 'projeTemasi',
            message: tagRes.message
          });
        } else {
          rowData.projeTemasi = tagRes.commaSeparated;
        }
      }
      if (rowData.projeOrtaklari !== undefined) {
        const tagRes = validateMultiSelectTags(rowData.projeOrtaklari, PROJELER_PARTNERS_4);
        if (!tagRes.isValid) {
          errors.push({
            row: rowNum,
            field: 'projeOrtaklari',
            message: tagRes.message
          });
        } else {
          rowData.projeOrtaklari = tagRes.commaSeparated;
        }
      }
    }

    // 5. SoruSeti explanation check on rows 9 & 10
    if (norm === 'SORUSETI') {
      if (rowNum === 9 || rowNum === 10) {
        const val = safeNumber(rowData.cevap, null);
        if (val !== null && val > 89) {
          const aciklama = rowData.aciklama;
          if (!aciklama || String(aciklama).trim().length === 0) {
            errors.push({
              row: rowNum,
              field: 'aciklama',
              message: `Sıra No ${rowNum} değeri %${val} > %89 olduğu için Açıklama yapılması zorunludur.`
            });
          }
        }
      }
    }

    // 6. Finans negative value check (only row 32 Mali Yıl Sonu Kasası and calculated row 34 allow negative values)
    if (norm === 'FINANS') {
      if (rowNum !== 32 && rowNum !== 34 && rowData.tutar !== undefined && rowData.tutar !== null && rowData.tutar !== '') {
        const numVal = safeNumber(rowData.tutar, 0);
        if (numVal < 0) {
          errors.push({
            row: rowNum,
            field: 'tutar',
            value: rowData.tutar,
            message: `Satır ${rowNum}: Mali Yıl Sonu Kasası (Satır 32) dışındaki gelir/gider kalemleri negatif olamaz.`
          });
        }
      }
    }

    // 7. MemnuniyetAnketi score bounds check (0 <= ortalamaAnketPuani <= olcumSkalasi)
    if (norm.startsWith('MEMNUNIYET')) {
      const rawScore = rowData.ortalamaAnketPuani !== undefined ? rowData.ortalamaAnketPuani : rowData.ortalamaPuan;
      const rawScale = rowData.olcumSkalasi;
      if (rawScore !== undefined && rawScore !== null && rawScore !== '') {
        const s = Number(rawScore);
        const sc = Number(rawScale);
        if (isNaN(s) || s < 0) {
          errors.push({
            row: rowNum,
            field: 'ortalamaAnketPuani',
            value: rawScore,
            message: 'Ortalama anket puanı 0 veya pozitif bir sayı olmalıdır.'
          });
        } else if (!isNaN(sc) && sc > 0 && s > sc) {
          errors.push({
            row: rowNum,
            field: 'ortalamaAnketPuani',
            value: rawScore,
            message: `Ortalama anket puanı (${s}), seçilen ölçüm skalasını (${sc}) aşamaz.`
          });
        }
      }
    }

    normalizedRows.push({ ...r, rowNumber: rowNum, data: rowData });
  });

  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      rows: normalizedRows
    };
  }

  // Run calculation formulas to enrich values
  const calcResult = calculate(templateCode, { rows: normalizedRows });

  return {
    isValid: true,
    errors: [],
    rows: calcResult.rows,
    calcResult
  };
}

module.exports = {
  safeNumber,
  validateDuration,
  validateKVKKDisabledMember,
  validateMultiSelectTags,
  calculateEnerji,
  calculateFinans,
  calculateKarbonAyakizi,
  calculateMemnuniyetAnketi,
  calculateProjeler,
  calculateSoruSeti,
  calculate,
  preSaveHook
};
