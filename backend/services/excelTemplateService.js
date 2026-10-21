/**
 * excelTemplateService.js
 * 
 * 1:1 Original Template Excel/XLSM Export & Validated Import Engine
 * Implements 3-Stage Hybrid AdmZip + ExcelJS Architecture
 */

const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const ExcelJS = require('exceljs');
const { validateDuration, validateKVKKDisabledMember, validateMultiSelectTags } = require('./formulaEngineService');

// Locate authoritative template folder
const candidateDirs = [
  process.env.YOK_TEMPLATES_DIR,
  path.resolve(__dirname, '../../2025-2026 yök izleme şablonlar'),
  path.resolve(process.cwd(), '2025-2026 yök izleme şablonlar'),
  path.resolve(__dirname, '../templates')
];
const TEMPLATES_DIR = candidateDirs.find(d => d && fs.existsSync(d)) || candidateDirs[1];

// 24 YÖK Template Catalog Metadata
const YOK_TEMPLATE_METADATA = {
  ALANLAR: {
    code: 'ALANLAR',
    fileName: 'Alanlar (4).xlsx',
    dataSheetName: 'Alanlar',
    headerRow: 5,
    dataStartRow: 7,
    isFixed: false,
    isXLSM: false
  },
  ATIK: {
    code: 'ATIK',
    fileName: 'Atik (4).xlsx',
    dataSheetName: 'Atik',
    headerRow: 9,
    dataStartRow: 10,
    isFixed: true,
    isXLSM: false
  },
  BURSLAR: {
    code: 'BURSLAR',
    fileName: 'Burslar (3).xlsx',
    dataSheetName: 'Burslar',
    headerRow: 6,
    dataStartRow: 16,
    isFixed: false,
    isXLSM: false
  },
  DANISMA_KURULU: {
    code: 'DANISMA_KURULU',
    fileName: 'DanismaKurulu (3).xlsx',
    dataSheetName: 'DanismaKurulu',
    headerRow: 4,
    dataStartRow: 12,
    isFixed: false,
    isXLSM: false
  },
  DERSLER: {
    code: 'DERSLER',
    fileName: 'Dersler (7).xlsx',
    dataSheetName: 'Dersler',
    headerRow: 7,
    dataStartRow: 9,
    isFixed: false,
    isXLSM: false
  },
  DIJITAL_OLGUNLUK: {
    code: 'DIJITAL_OLGUNLUK',
    fileName: 'DijitalOlgunlukAnketi.xlsx',
    dataSheetName: 'DijitalOlgunlukAnketi',
    headerRow: 10,
    dataStartRow: 15,
    isFixed: true,
    isXLSM: false
  },
  EGITICILERIN_EGITIMI: {
    code: 'EGITICILERIN_EGITIMI',
    fileName: 'EgiticilerinEgitimi (3).xlsx',
    dataSheetName: 'EgiticilerinEgitimi',
    headerRow: 5,
    dataStartRow: 7,
    isFixed: false,
    isXLSM: false
  },
  ENERJI: {
    code: 'ENERJI',
    fileName: 'Enerji - 2026.xlsx',
    dataSheetName: 'Enerji',
    headerRow: 8,
    dataStartRow: 9,
    isFixed: true,
    isXLSM: false
  },
  ETKINLIK: {
    code: 'ETKINLIK',
    fileName: 'Etkinlik 2025-2026.xlsx',
    dataSheetName: 'Etkinlik',
    headerRow: 7,
    dataStartRow: 9,
    isFixed: false,
    isXLSM: false
  },
  FINANS: {
    code: 'FINANS',
    fileName: 'Finans (3).xlsx',
    dataSheetName: 'Finans',
    headerRow: 7,
    dataStartRow: 8,
    isFixed: true,
    isXLSM: false
  },
  FIRMALAR: {
    code: 'FIRMALAR',
    fileName: 'Firmalar (3).xlsx',
    dataSheetName: 'Firmalar',
    headerRow: 6,
    dataStartRow: 8,
    isFixed: false,
    isXLSM: false
  },
  HAREKETLILIK: {
    code: 'HAREKETLILIK',
    fileName: 'Hareketlilik (3).xlsx',
    dataSheetName: 'Hareketlilik',
    headerRow: 6,
    dataStartRow: 8,
    isFixed: false,
    isXLSM: false
  },
  KARBON_AYAKIZI: {
    code: 'KARBON_AYAKIZI',
    fileName: 'KarbonAyakizi 2026.xlsx',
    dataSheetName: 'KarbonAyakizi',
    headerRow: 6,
    dataStartRow: 7,
    isFixed: true,
    isXLSM: false
  },
  MEMNUNIYET_ANKETI: {
    code: 'MEMNUNIYET_ANKETI',
    fileName: 'MemnuniyetAnketi (3).xlsx',
    dataSheetName: 'MemnuniyetAnketleri',
    headerRow: 5,
    dataStartRow: 7,
    isFixed: false,
    isXLSM: false
  },
  MEZUN_TAKIP_SISTEMI: {
    code: 'MEZUN_TAKIP_SISTEMI',
    fileName: 'MezunTakipSistemi 2025-2026.xlsx',
    dataSheetName: 'MezunTS',
    headerRow: 6,
    dataStartRow: 8,
    isFixed: false,
    isXLSM: false
  },
  MYO_UYGULAMALI_EGITIM: {
    code: 'MYO_UYGULAMALI_EGITIM',
    fileName: 'MYOUygulamaliEgitim (2).xlsm',
    dataSheetName: 'Onlisans',
    headerRow: 5,
    dataStartRow: 7,
    isFixed: false,
    isXLSM: true
  },
  ODULLER: {
    code: 'ODULLER',
    fileName: 'Oduller (4).xlsx',
    dataSheetName: 'Oduller',
    headerRow: 4,
    dataStartRow: 6,
    isFixed: false,
    isXLSM: false
  },
  OGRENCI_TOPLULUKLARI: {
    code: 'OGRENCI_TOPLULUKLARI',
    fileName: 'OgrenciTopluluklari (3).xlsx',
    dataSheetName: 'OgrenciTopluluklari',
    headerRow: 6,
    dataStartRow: 8,
    isFixed: false,
    isXLSM: false
  },
  OZDEGERLENDIRME: {
    code: 'OZDEGERLENDIRME',
    fileName: 'Ozdegerlendirme (3).xlsx',
    dataSheetName: 'Ozdegerlendirme',
    headerRow: 5,
    dataStartRow: 6,
    isFixed: false,
    isXLSM: false
  },
  PATENT: {
    code: 'PATENT',
    fileName: 'Patent - 2026.xlsx',
    dataSheetName: 'Patent',
    headerRow: 7,
    dataStartRow: 9,
    isFixed: false,
    isXLSM: false
  },
  PAYDAS: {
    code: 'PAYDAS',
    fileName: 'Paydas (3).xlsx',
    dataSheetName: 'Paydas',
    headerRow: 5,
    dataStartRow: 7,
    isFixed: false,
    isXLSM: false
  },
  PROJELER: {
    code: 'PROJELER',
    fileName: 'Projeler 2025-2026.xlsm',
    dataSheetName: 'Projeler',
    headerRow: 11,
    dataStartRow: 15,
    isFixed: false,
    isXLSM: true
  },
  SEM: {
    code: 'SEM',
    fileName: 'SEM (3).xlsx',
    dataSheetName: 'SEM',
    headerRow: 5,
    dataStartRow: 7,
    isFixed: false,
    isXLSM: false
  },
  SORU_SETI: {
    code: 'SORU_SETI',
    fileName: 'SoruSeti (3).xlsx',
    dataSheetName: 'SoruSeti',
    headerRow: 5,
    dataStartRow: 6,
    isFixed: true,
    isXLSM: false
  }
};

// Aliases mapping for uppercase alphanumeric codes
const CODE_ALIASES = {
  KARBONAYAKIZI: 'KARBON_AYAKIZI',
  MEMNUNIYET: 'MEMNUNIYET_ANKETI',
  MEMNUNIYETANKETI: 'MEMNUNIYET_ANKETI',
  MEZUNTAKIP: 'MEZUN_TAKIP_SISTEMI',
  MEZUNTAKIPSISTEMI: 'MEZUN_TAKIP_SISTEMI',
  MYOUYGULAMALI: 'MYO_UYGULAMALI_EGITIM',
  MYOUYGULAMALIEGITIM: 'MYO_UYGULAMALI_EGITIM',
  OGRENCITOPLULUKLARI: 'OGRENCI_TOPLULUKLARI',
  SORUSETI: 'SORU_SETI',
  EGITICILERINEGITIMI: 'EGITICILERIN_EGITIMI',
  DANISMAKURULU: 'DANISMA_KURULU'
};

function getTemplateMeta(templateCode) {
  const raw = (templateCode || '').toUpperCase().trim();
  const clean = raw.replace(/[^A-Z0-9_]/g, '');
  if (YOK_TEMPLATE_METADATA[clean]) return YOK_TEMPLATE_METADATA[clean];
  const noUnderscore = clean.replace(/_/g, '');
  if (CODE_ALIASES[noUnderscore]) return YOK_TEMPLATE_METADATA[CODE_ALIASES[noUnderscore]];
  if (YOK_TEMPLATE_METADATA[noUnderscore]) return YOK_TEMPLATE_METADATA[noUnderscore];
  return null;
}

/**
 * Stage 1: AdmZip XML Sanitizer
 * Clamps unbounded 1048576 sqref limits to 5000 and fixes column 16385 bounds
 */
function sanitizeTemplateBuffer(buffer) {
  const zip = new AdmZip(buffer);
  let modified = false;

  for (const entry of zip.getEntries()) {
    if (entry.entryName.includes('sheet') && entry.entryName.endsWith('.xml')) {
      let xml = zip.readAsText(entry);
      let changed = false;

      if (xml.includes('1048576')) {
        xml = xml.replace(/1048576/g, '5000');
        changed = true;
      }
      if (xml.includes('XFD')) {
        xml = xml.replace(/:XFD\d+/g, ':AN5000').replace(/XFD\d+/g, 'AN5000');
        changed = true;
      }

      if (changed) {
        zip.updateFile(entry.entryName, Buffer.from(xml, 'utf8'));
        modified = true;
      }
    }
  }

  return modified ? zip.toBuffer() : buffer;
}

/**
 * Stage 3: AdmZip Post-Processor for XLSM
 * Injects original xl/vbaProject.bin byte-for-byte and sets macro content types
 */
function postProcessXLSM(excelJsBuffer, originalTemplateBuffer) {
  const origZip = new AdmZip(originalTemplateBuffer);
  const outZip = new AdmZip(excelJsBuffer);

  // 1. Inject authentic vbaProject.bin
  const vbaBin = origZip.readFile('xl/vbaProject.bin');
  if (vbaBin) {
    outZip.addFile('xl/vbaProject.bin', vbaBin);
  }

  // 2. Declare macroEnabled workbook in [Content_Types].xml
  let ctXml = outZip.readAsText('[Content_Types].xml');
  ctXml = ctXml.replace(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml',
    'application/vnd.ms-excel.sheet.macroEnabled.main+xml'
  );
  if (!ctXml.includes('vbaProject')) {
    ctXml = ctXml.replace(
      '</Types>',
      '<Override PartName="/xl/vbaProject.bin" ContentType="application/vnd.ms-office.vbaProject"/></Types>'
    );
  }
  outZip.updateFile('[Content_Types].xml', Buffer.from(ctXml, 'utf8'));

  // 3. Declare relationship in xl/_rels/workbook.xml.rels
  let relsXml = outZip.readAsText('xl/_rels/workbook.xml.rels');
  if (!relsXml.includes('vbaProject.bin')) {
    const rIdMatches = relsXml.match(/Id="rId(\d+)"/g) || [];
    let maxId = 0;
    rIdMatches.forEach(m => {
      const num = parseInt(m.replace(/\D/g, ''), 10);
      if (num > maxId) maxId = num;
    });
    const newRId = `rId${maxId + 1}`;
    const vbaRel = `<Relationship Id="${newRId}" Type="http://schemas.microsoft.com/office/2006/relationships/vbaProject" Target="vbaProject.bin"/>`;
    relsXml = relsXml.replace('</Relationships>', `${vbaRel}</Relationships>`);
    outZip.updateFile('xl/_rels/workbook.xml.rels', Buffer.from(relsXml, 'utf8'));
  }

  // 4. Restore original worksheet relationships if stripped
  for (const entry of origZip.getEntries()) {
    if (entry.entryName.startsWith('xl/worksheets/_rels/')) {
      if (!outZip.getEntry(entry.entryName)) {
        outZip.addFile(entry.entryName, origZip.readFile(entry));
      }
    }
  }

  return outZip.toBuffer();
}

/**
 * 1:1 Export to Authentic Template File
 */
async function exportToTemplate(templateCode, records = [], options = {}) {
  const meta = getTemplateMeta(templateCode);
  if (!meta) {
    throw new Error(`Bilinmeyen veya desteklenmeyen YÖK şablon kodu: ${templateCode}`);
  }

  const templateFilePath = path.join(TEMPLATES_DIR, meta.fileName);
  if (!fs.existsSync(templateFilePath)) {
    throw new Error(`Orijinal şablon dosyası bulunamadı: ${meta.fileName} (${templateFilePath})`);
  }

  const originalBuffer = fs.readFileSync(templateFilePath);
  const sanitizedBuffer = sanitizeTemplateBuffer(originalBuffer);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(sanitizedBuffer);

  let ws = wb.getWorksheet(meta.dataSheetName);
  if (!ws) {
    ws = wb.worksheets[0];
  }

  // Read header map from template's headerRow
  const headerMap = {};
  const headerRow = ws.getRow(meta.headerRow);
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    if (cell.value) {
      const text = String(cell.value).trim().toLowerCase();
      headerMap[text] = colNumber;
    }
  });

  if (meta.isFixed) {
    // Populate Fixed Rows
    records.forEach(rec => {
      const rNum = rec.rowNumber;
      if (!rNum) return;
      const targetRow = meta.dataStartRow + (rNum - 1);
      const row = ws.getRow(targetRow);
      const data = rec.data || rec;

      Object.entries(data).forEach(([key, val]) => {
        if (val === undefined || val === null) return;
        // Find column index
        const colKey = key.toLowerCase();
        let targetCol = headerMap[colKey];
        if (!targetCol) {
          // Check common column position by key in fixed templates
          if (meta.code === 'ENERJI') {
            if (key === 'elektrik') targetCol = 4;
            if (key === 'su') targetCol = 5;
          } else if (meta.code === 'FINANS') {
            if (key === 'tutar') targetCol = 4;
          } else if (meta.code === 'KARBON_AYAKIZI') {
            if (key === 'dogalgaz') targetCol = 3;
            if (key === 'komur') targetCol = 4;
            if (key === 'dizel') targetCol = 5;
            if (key === 'benzin') targetCol = 6;
            if (key === 'fueloil' || key === 'fuelOil') targetCol = 7;
          } else if (meta.code === 'ATIK') {
            const atikCols = {
              organikatik: 3, tibbiatik: 4, inorganikatik: 5, elektronikatik: 6, digeratik: 7,
              plastikgeridonusum: 8, camgeridonusum: 9, kagitgeridonusum: 10, evselgeridonusum: 11, digergeridonusum: 12
            };
            if (atikCols[colKey]) targetCol = atikCols[colKey];
          } else if (meta.code === 'SORU_SETI') {
            if (key === 'cevap') targetCol = 3;
            if (key === 'aciklama') targetCol = 5;
          }
        }

        if (targetCol) {
          row.getCell(targetCol).value = typeof val === 'number' ? val : String(val);
        }
      });
      row.commit();
    });
  } else {
    // Populate Dynamic Rows starting at dataStartRow
    records.forEach((rec, idx) => {
      const targetRowIndex = meta.dataStartRow + idx;
      const row = ws.getRow(targetRowIndex);
      const data = rec.data || rec;

      // Extract keys and write sequentially or by header
      const entries = Object.entries(data);
      let colIdx = 1;
      entries.forEach(([key, val]) => {
        if (key === '_id' || key === 'id' || key === 'createdAt' || key === 'updatedAt' || key === 'rowNumber') return;
        const colKey = key.toLowerCase();
        const designatedCol = headerMap[colKey] || colIdx;
        if (val !== undefined && val !== null) {
          row.getCell(designatedCol).value = typeof val === 'number' ? val : String(val);
        }
        colIdx++;
      });
      row.commit();
    });
  }

  const generatedBuffer = await wb.xlsx.writeBuffer();

  let finalBuffer = generatedBuffer;
  if (meta.isXLSM) {
    finalBuffer = postProcessXLSM(generatedBuffer, originalBuffer);
  }

  const contentType = meta.isXLSM
    ? 'application/vnd.ms-excel.sheet.macroEnabled.main+xml'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  return {
    buffer: finalBuffer,
    fileName: meta.fileName,
    contentType
  };
}

/**
 * Validates and parses an uploaded Excel/XLSM file buffer against a Template model
 */
async function validateAndParseExcel(template, fileBuffer) {
  const meta = getTemplateMeta(template.code);
  const dataStartRow = meta ? meta.dataStartRow : (template.dataStartRow || 2);
  const headerRowIndex = meta ? meta.headerRow : 1;
  const sheetName = meta ? meta.dataSheetName : null;

  const sanitized = sanitizeTemplateBuffer(fileBuffer);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(sanitized);

  let ws = sheetName ? wb.getWorksheet(sheetName) : null;
  if (!ws) {
    ws = wb.worksheets[0];
  }

  // 1. Read and map headers
  const headerMap = {};
  const headerRow = ws.getRow(headerRowIndex);
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    if (cell.value) {
      const label = String(cell.value).trim();
      headerMap[colNumber] = label;
    }
  });

  // Map template columns to column numbers in worksheet
  const colIndexToDef = {};
  const templateColumns = template.columns || [];

  for (const [colNumberStr, headerLabel] of Object.entries(headerMap)) {
    const colNumber = parseInt(colNumberStr, 10);
    const cleanHeader = headerLabel.toLowerCase().replace(/[^a-z0-9ğüşıöç]/gu, '');

    const foundDef = templateColumns.find(c => {
      const cleanColLabel = c.label.toLowerCase().replace(/[^a-z0-9ğüşıöç]/gu, '');
      const cleanColKey = c.key.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanHeader === cleanColLabel || cleanHeader === cleanColKey || cleanHeader.includes(cleanColKey);
    });

    if (foundDef) {
      colIndexToDef[colNumber] = foundDef;
    }
  }

  // Fallback: If header mapping matched fewer than 30% of columns, map sequentially
  if (Object.keys(colIndexToDef).length < Math.min(3, templateColumns.length)) {
    templateColumns.forEach((c, idx) => {
      colIndexToDef[idx + 1] = c;
    });
  }

  const errors = [];
  const parsedRecords = [];
  const totalRows = ws.rowCount;

  for (let r = dataStartRow; r <= totalRows; r++) {
    const row = ws.getRow(r);
    // Check if row is completely empty
    let hasAnyValue = false;
    row.eachCell({ includeEmpty: false }, () => { hasAnyValue = true; });
    if (!hasAnyValue) continue;

    const rowData = {};

    for (let c = 1; c <= templateColumns.length + 5; c++) {
      const colDef = colIndexToDef[c];
      if (!colDef) continue;

      const cell = row.getCell(c);
      let rawVal = cell.value;
      if (rawVal && typeof rawVal === 'object') {
        if (rawVal.result !== undefined) rawVal = rawVal.result;
        else if (rawVal.text !== undefined) rawVal = rawVal.text;
      }

      const isEmpty = rawVal === null || rawVal === undefined || String(rawVal).trim() === '';

      // Mandatory check
      if (colDef.required && isEmpty) {
        errors.push({
          row: r,
          column: colDef.label,
          field: colDef.key,
          value: rawVal,
          message: `${colDef.label} alanı zorunludur.`
        });
        continue;
      }

      if (isEmpty) {
        rowData[colDef.key] = null;
        continue;
      }

      const valStr = String(rawVal).trim();

      // Type validations
      if (colDef.type === 'integer') {
        const num = Number(valStr);
        if (!Number.isInteger(num)) {
          errors.push({
            row: r,
            column: colDef.label,
            field: colDef.key,
            value: rawVal,
            message: `${colDef.label} bir tam sayı olmalıdır.`
          });
        } else {
          if (colDef.min !== null && colDef.min !== undefined && num < colDef.min) {
            errors.push({
              row: r,
              column: colDef.label,
              field: colDef.key,
              value: rawVal,
              message: `${colDef.label} en az ${colDef.min} olmalıdır.`
            });
          }
          if (colDef.max !== null && colDef.max !== undefined && num > colDef.max) {
            errors.push({
              row: r,
              column: colDef.label,
              field: colDef.key,
              value: rawVal,
              message: `${colDef.label} en fazla ${colDef.max} olmalıdır.`
            });
          }
          rowData[colDef.key] = num;
        }
      } else if (colDef.type === 'decimal') {
        const num = Number(valStr.replace(',', '.'));
        if (isNaN(num)) {
          errors.push({
            row: r,
            column: colDef.label,
            field: colDef.key,
            value: rawVal,
            message: `${colDef.label} geçerli bir sayı olmalıdır.`
          });
        } else {
          if (colDef.min !== null && colDef.min !== undefined && num < colDef.min) {
            errors.push({
              row: r,
              column: colDef.label,
              field: colDef.key,
              value: rawVal,
              message: `${colDef.label} en az ${colDef.min} olmalıdır.`
            });
          }
          if (colDef.max !== null && colDef.max !== undefined && num > colDef.max) {
            errors.push({
              row: r,
              column: colDef.label,
              field: colDef.key,
              value: rawVal,
              message: `${colDef.label} en fazla ${colDef.max} olmalıdır.`
            });
          }
          rowData[colDef.key] = num;
        }
      } else if (colDef.type === 'select') {
        if (colDef.options && colDef.options.length > 0) {
          if (!colDef.options.includes(valStr)) {
            errors.push({
              row: r,
              column: colDef.label,
              field: colDef.key,
              value: valStr,
              message: `${colDef.label} değeri referans listede bulunamadı ('${valStr}').`
            });
          } else {
            rowData[colDef.key] = valStr;
          }
        } else {
          rowData[colDef.key] = valStr;
        }
      } else if (colDef.type === 'multiselect') {
        const tagRes = validateMultiSelectTags(valStr, colDef.options);
        if (!tagRes.isValid) {
          errors.push({
            row: r,
            column: colDef.label,
            field: colDef.key,
            value: valStr,
            message: tagRes.message
          });
        } else {
          rowData[colDef.key] = tagRes.commaSeparated;
        }
      } else if (colDef.type === 'date') {
        const d = new Date(rawVal);
        if (isNaN(d.getTime())) {
          errors.push({
            row: r,
            column: colDef.label,
            field: colDef.key,
            value: rawVal,
            message: `${colDef.label} geçerli bir tarih olmalıdır.`
          });
        } else {
          rowData[colDef.key] = d.toISOString().split('T')[0];
        }
      } else {
        rowData[colDef.key] = valStr;
      }
    }

    // Custom Rules: KVKK Privacy & Duration
    if (template.code === 'OGRENCI_TOPLULUKLARI') {
      const disabledCount = rowData.engelliUyeSayisi;
      const kvkkRes = validateKVKKDisabledMember(disabledCount);
      if (!kvkkRes.isValid) {
        errors.push({
          row: r,
          column: 'Engelli Üye Sayısı',
          field: 'engelliUyeSayisi',
          value: disabledCount,
          message: kvkkRes.message
        });
      }
    }

    if (template.code === 'EGITICILERIN_EGITIMI') {
      const duration = rowData.egitiminSuresi;
      if (duration) {
        const durRes = validateDuration(duration);
        if (!durRes.isValid) {
          errors.push({
            row: r,
            column: 'Eğitimin Süresi',
            field: 'egitiminSuresi',
            value: duration,
            message: durRes.message
          });
        }
      }
    }

    parsedRecords.push({
      rowNumber: parsedRecords.length + 1,
      cleanData: rowData
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    totalRows: parsedRecords.length,
    validRows: errors.length === 0 ? parsedRecords.length : (parsedRecords.length - new Set(errors.map(e => e.row)).size),
    parsedRecords
  };
}

/**
 * Return Blank Authentic Template File Buffer
 */
async function getBlankTemplate(templateCode) {
  const meta = getTemplateMeta(templateCode);
  if (!meta) {
    throw new Error(`Bilinmeyen YÖK şablon kodu: ${templateCode}`);
  }

  const templateFilePath = path.join(TEMPLATES_DIR, meta.fileName);
  if (!fs.existsSync(templateFilePath)) {
    throw new Error(`Şablon dosyası bulunamadı: ${meta.fileName}`);
  }

  const buffer = fs.readFileSync(templateFilePath);
  const contentType = meta.isXLSM
    ? 'application/vnd.ms-excel.sheet.macroEnabled.main+xml'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  return {
    buffer,
    fileName: meta.fileName,
    contentType
  };
}

module.exports = {
  TEMPLATES_DIR,
  YOK_TEMPLATE_METADATA,
  getTemplateMeta,
  sanitizeTemplateBuffer,
  postProcessXLSM,
  exportToTemplate,
  validateAndParseExcel,
  getBlankTemplate
};
