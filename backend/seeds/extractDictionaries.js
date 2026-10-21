const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');

const TEMPLATES_DIR = path.resolve(__dirname, '../../2025-2026 yök izleme şablonlar');

function getSharedStrings(zip) {
  const stringsXml = zip.readAsText('xl/sharedStrings.xml');
  const matches = [];
  // Match <si>...<t>...</t>...</si>
  const siRegex = /<si>(.*?)<\/si>/gs;
  let siMatch;
  while ((siMatch = siRegex.exec(stringsXml)) !== null) {
    const tMatches = [...siMatch[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map(m => m[1]);
    matches.push(tMatches.join(''));
  }
  return matches;
}

function extractColFromSheet(zip, sheetEntryName, colLetter, startRow, endRow) {
  const sheetXml = zip.readAsText(sheetEntryName);
  const strings = getSharedStrings(zip);
  const results = [];
  for (let r = startRow; r <= endRow; r++) {
    const cellRegex = new RegExp(`<c r="${colLetter}${r}"(?: s="\\d+")?(?: t="([sb])")?>.*?<v>([^<]+)<\\/v>`, 's');
    const match = sheetXml.match(cellRegex);
    if (match) {
      const type = match[1];
      const val = match[2];
      if (type === 's') {
        const str = strings[parseInt(val, 10)];
        if (str && str.trim()) results.push(str.trim());
      } else {
        if (val && val.trim()) results.push(val.trim());
      }
    }
  }
  return results;
}

// 1. Hareketlilik (3).xlsx sheet1 Col E (r 8 to 233)
const hZip = new AdmZip(path.join(TEMPLATES_DIR, 'Hareketlilik (3).xlsx'));
const hCountries = extractColFromSheet(hZip, 'xl/worksheets/sheet1.xml', 'E', 8, 233);
console.log('Hareketlilik countries count:', hCountries.length);

// 2. Oduller (4).xlsx sheet1 Col J (r 8 to 230)
const oZip = new AdmZip(path.join(TEMPLATES_DIR, 'Oduller (4).xlsx'));
const oCountries = extractColFromSheet(oZip, 'xl/worksheets/sheet1.xml', 'J', 8, 230);
console.log('Oduller countries count:', oCountries.length);

// 3. SoruSeti (3).xlsx sheet1 Col B (r 6 to 27)
const sZip = new AdmZip(path.join(TEMPLATES_DIR, 'SoruSeti (3).xlsx'));
const sQuestions = extractColFromSheet(sZip, 'xl/worksheets/sheet1.xml', 'B', 6, 27);
console.log('SoruSeti questions count:', sQuestions.length);

// 4. DijitalOlgunlukAnketi.xlsx sheet2 Col B (dimension) & Col C (question) (r 15 to 120)
const dZip = new AdmZip(path.join(TEMPLATES_DIR, 'DijitalOlgunlukAnketi.xlsx'));
const dStrings = getSharedStrings(dZip);
const dSheetXml = dZip.readAsText('xl/worksheets/sheet2.xml');
const dQuestions = [];
for (let r = 15; r <= 120; r++) {
  const matchB = dSheetXml.match(new RegExp(`<c r="B${r}"(?: s="\\d+")?(?: t="([sb])")?>.*?<v>([^<]+)<\\/v>`, 's'));
  const matchC = dSheetXml.match(new RegExp(`<c r="C${r}"(?: s="\\d+")?(?: t="([sb])")?>.*?<v>([^<]+)<\\/v>`, 's'));
  if (matchB && matchC) {
    const dim = matchB[1] === 's' ? dStrings[parseInt(matchB[2], 10)] : matchB[2];
    const q = matchC[1] === 's' ? dStrings[parseInt(matchC[2], 10)] : matchC[2];
    dQuestions.push({
      index: r - 14,
      dimension: dim ? dim.trim() : '',
      question: q ? q.trim() : ''
    });
  }
}
console.log('DijitalOlgunluk questions count:', dQuestions.length);

// Write to JSON for inspection
fs.writeFileSync(path.join(__dirname, 'reference_data.json'), JSON.stringify({
  hareketlilik: hCountries,
  oduller: oCountries,
  soruSeti: sQuestions,
  dijitalOlgunluk: dQuestions
}, null, 2), 'utf8');

console.log('Done extracting reference data!');
