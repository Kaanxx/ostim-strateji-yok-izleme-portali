const ExcelJS = require('exceljs');

/**
 * Converts Turkish string to clean ASCII identifier key.
 */
function slugifyKey(str) {
  if (!str) return 'kolon';
  const trMap = {
    'ç': 'c', 'Ç': 'c',
    'ğ': 'g', 'Ğ': 'g',
    'ı': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o',
    'ş': 's', 'Ş': 's',
    'ü': 'u', 'Ü': 'u'
  };

  let clean = str.replace(/[çÇğĞıİöÖşŞüÜ]/g, match => trMap[match] || match);
  clean = clean.toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!clean || !/^[a-z]/.test(clean)) {
    clean = 'col_' + clean;
  }
  return clean.substring(0, 50);
}

/**
 * Extracts schema, columns, and data bounds from an uploaded Excel file.
 */
async function extractSchemaFromExcel(bufferOrPath, originalFilename = '') {
  const workbook = new ExcelJS.Workbook();
  if (Buffer.isBuffer(bufferOrPath)) {
    await workbook.xlsx.load(bufferOrPath);
  } else {
    await workbook.xlsx.readFile(bufferOrPath);
  }

  // 1. Identify Data Sheet vs Reference Sheets
  let dataSheet = null;
  const referenceSheets = [];

  workbook.eachSheet((sheet) => {
    const name = sheet.name.toLowerCase();
    if (name.includes('referans') || name.includes('liste') || name.includes('tanim')) {
      referenceSheets.push(sheet);
    } else if (!dataSheet) {
      dataSheet = sheet;
    }
  });

  if (!dataSheet) {
    dataSheet = workbook.worksheets[0];
  }

  if (!dataSheet) {
    throw new Error('Excel dosyasında okunabilir çalışma sayfası bulunamadı.');
  }

  // 2. Identify Reference Dictionaries
  const refOptions = {};
  for (const refSheet of referenceSheets) {
    refSheet.eachRow((row, rowNum) => {
      row.eachCell((cell, colNum) => {
        const val = cell.value ? String(cell.value).trim() : '';
        if (val) {
          const colHeaderCell = refSheet.getRow(1).getCell(colNum);
          const colHeader = colHeaderCell.value ? String(colHeaderCell.value).trim() : `Ref_${colNum}`;
          if (!refOptions[colHeader]) refOptions[colHeader] = new Set();
          if (rowNum > 1 && val) {
            refOptions[colHeader].add(val);
          }
        }
      });
    });
  }

  // 3. Find Header Row in dataSheet
  let bestHeaderRow = 1;
  let maxCols = 0;

  for (let r = 1; r <= Math.min(15, dataSheet.rowCount); r++) {
    const row = dataSheet.getRow(r);
    let strCellCount = 0;
    row.eachCell((cell) => {
      const v = cell.value;
      if (typeof v === 'string' && v.trim().length > 1) {
        strCellCount++;
      }
    });

    if (strCellCount > maxCols) {
      maxCols = strCellCount;
      bestHeaderRow = r;
    }
  }

  const headerRow = dataSheet.getRow(bestHeaderRow);
  const dataStartRow = bestHeaderRow + 1;

  // 4. Extract Columns
  const columns = [];
  const usedKeys = new Set();
  let colIndex = 1;

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const label = cell.value ? String(cell.value).trim() : `Kolon ${colIndex}`;
    let key = slugifyKey(label);

    let counter = 1;
    while (usedKeys.has(key)) {
      key = `${slugifyKey(label)}_${counter++}`;
    }
    usedKeys.add(key);

    // Detect data type by scanning up to 30 data rows
    let detectedType = 'text';
    let hasDecimals = false;
    let allIntegers = true;
    let isDates = true;
    let sampleValues = [];

    const endRow = Math.min(dataStartRow + 30, dataSheet.rowCount);
    let sampledCount = 0;

    for (let r = dataStartRow; r <= endRow; r++) {
      const dataCell = dataSheet.getRow(r).getCell(colNumber);
      const val = dataCell.value;

      if (val !== null && val !== undefined && val !== '') {
        sampledCount++;
        sampleValues.push(val);

        if (typeof val === 'number') {
          isDates = false;
          if (!Number.isInteger(val)) {
            hasDecimals = true;
            allIntegers = false;
          }
        } else if (val instanceof Date) {
          allIntegers = false;
        } else if (typeof val === 'string') {
          allIntegers = false;
          const num = Number(val.replace(',', '.'));
          if (isNaN(num)) {
            isDates = false;
          }
        }
      }
    }

    if (sampledCount > 0) {
      if (isDates && sampleValues.some(v => v instanceof Date)) {
        detectedType = 'date';
      } else if (hasDecimals) {
        detectedType = 'decimal';
      } else if (allIntegers && sampleValues.some(v => typeof v === 'number')) {
        detectedType = 'integer';
      }
    }

    // Match reference options
    let options = [];
    for (const [refName, optSet] of Object.entries(refOptions)) {
      if (label.toLowerCase().includes(refName.toLowerCase()) || refName.toLowerCase().includes(label.toLowerCase())) {
        options = Array.from(optSet);
        detectedType = 'select';
        break;
      }
    }

    columns.push({
      key,
      label,
      type: detectedType,
      required: false,
      options: options.slice(0, 100),
      order: colIndex++
    });
  });

  const baseTitle = originalFilename
    ? originalFilename.replace(/\.[^/.]+$/, '').replace(/[\(\)\d_]/g, ' ').trim()
    : 'İçe Aktarılan Şablon';

  const baseCode = slugifyKey(baseTitle).toUpperCase();

  return {
    title: baseTitle || 'Yeni Şablon',
    code: baseCode || 'YENI_SABLON',
    category: 'Genel',
    type: 'DYNAMIC',
    dataStartRow,
    columns,
    fixedRows: []
  };
}

module.exports = {
  extractSchemaFromExcel,
  slugifyKey
};
