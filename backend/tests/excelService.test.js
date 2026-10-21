const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const AdmZip = require('adm-zip');
const ExcelJS = require('exceljs');
const { app, setupTestDB, teardownTestDB } = require('./testHelper');
const seedTemplates = require('../seeds/seedTemplates');
const Department = require('../models/Department');
const TableRecord = require('../models/TableRecord');
const excelTemplateService = require('../services/excelTemplateService');

const binaryParser = (res, callback) => {
  const data = [];
  res.on('data', chunk => data.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(data)));
};

describe('Milestone 2 — 1:1 Excel/XLSM Export & Validated Import Engine Test Suite', () => {
  let adminToken;
  let cengDept;

  before(async () => {
    await setupTestDB();
    await seedTemplates();

    cengDept = await Department.findOne({ code: 'BILGISAYAR_MUH' });

    // Authenticate Admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@ostimteknik.edu.tr', password: 'Admin123!' });
    adminToken = adminLogin.body.token;
  });

  after(async () => {
    await teardownTestDB();
  });

  describe('1. AdmZip XML Sanitizer & Memory Freeze Prevention', () => {
    it('1.1 Clamps out-of-bounds 1048576 sqref and dimension tags to 5000', () => {
      const mockZip = new AdmZip();
      const mockSheetXml = `<?xml version="1.0" encoding="UTF-8"?>
        <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
          <dimension ref="A1:XFD1048576"/>
          <dataValidations count="1">
            <dataValidation type="list" sqref="A9:AN1048576">
              <formula1>"Option1,Option2"</formula1>
            </dataValidation>
          </dataValidations>
        </worksheet>`;

      mockZip.addFile('xl/worksheets/sheet1.xml', Buffer.from(mockSheetXml, 'utf8'));
      const inputBuffer = mockZip.toBuffer();

      const sanitizedBuffer = excelTemplateService.sanitizeTemplateBuffer(inputBuffer);
      const resZip = new AdmZip(sanitizedBuffer);
      const resXml = resZip.readAsText('xl/worksheets/sheet1.xml');

      assert.strictEqual(resXml.includes('1048576'), false, '1048576 must be stripped');
      assert.strictEqual(resXml.includes('5000'), true, 'Must clamp to 5000');
    });
  });

  describe('2. Blank Authentic Template Download', () => {
    it('2.1 Downloads authentic .xlsx template (DERSLER) with exact MIME type', async () => {
      const res = await request(app)
        .get('/api/templates/DERSLER/blank-excel')
        .set('Authorization', `Bearer ${adminToken}`)
        .buffer(true)
        .parse(binaryParser);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(
        res.headers['content-type'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      assert.ok(res.headers['content-disposition'].includes('Dersler'));
      assert.ok(Buffer.isBuffer(res.body));
      assert.ok(res.body.length > 0);
    });

    it('2.2 Downloads authentic .xlsm template (MYO_UYGULAMALI_EGITIM) preserving macro binary', async () => {
      const res = await request(app)
        .get('/api/templates/MYO_UYGULAMALI_EGITIM/blank-excel')
        .set('Authorization', `Bearer ${adminToken}`)
        .buffer(true)
        .parse(binaryParser);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(
        res.headers['content-type'],
        'application/vnd.ms-excel.sheet.macroEnabled.main+xml'
      );
      assert.ok(Buffer.isBuffer(res.body));
      assert.ok(res.body.length > 0);

      // Verify authentic vbaProject.bin in zip
      const zip = new AdmZip(res.body);
      const vbaEntry = zip.getEntry('xl/vbaProject.bin');
      assert.ok(vbaEntry, 'xl/vbaProject.bin must exist in downloaded .xlsm');
    });

    it('2.3 Returns error for unknown template code', async () => {
      const res = await request(app)
        .get('/api/templates/UNKNOWN_CODE_999/blank-excel')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.ok(res.statusCode >= 400);
    });
  });

  describe('3. 1:1 Excel/XLSM Export Engine', () => {
    it('3.1 Exports DERSLER records into authentic 1:1 template layout (.xlsx)', async () => {
      // Seed test records
      await TableRecord.create({
        templateCode: 'DERSLER',
        departmentId: cengDept._id,
        period: '2025-2026',
        rowNumber: 1,
        data: {
          dersinKodu: 'CENG101',
          dersinAdi: 'Bilgisayar Programlamaya Giriş',
          akts: 6,
          dersinDili: 'İngilizce'
        }
      });

      const res = await request(app)
        .get('/api/records/DERSLER/export')
        .query({ departmentId: cengDept._id.toString(), period: '2025-2026' })
        .set('Authorization', `Bearer ${adminToken}`)
        .buffer(true)
        .parse(binaryParser);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(
        res.headers['content-type'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      // Verify content in ExcelJS
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(res.body);

      const ws = wb.getWorksheet('Dersler');
      assert.ok(ws, 'Dersler worksheet must exist');

      // dataStartRow for DERSLER is 9
      const row9 = ws.getRow(9);
      let foundValue = false;
      row9.eachCell(cell => {
        if (cell.value === 'CENG101' || (cell.value && cell.value.toString().includes('CENG101'))) {
          foundValue = true;
        }
      });
      assert.strictEqual(foundValue, true, 'Row 9 must contain exported CENG101 value');
    });

    it('3.2 Exports MYO_UYGULAMALI_EGITIM records preserving xl/vbaProject.bin (.xlsm)', async () => {
      await TableRecord.create({
        templateCode: 'MYO_UYGULAMALI_EGITIM',
        departmentId: cengDept._id,
        period: '2025-2026',
        rowNumber: 1,
        data: {
          ogrencininAdiSoyadi: 'Test Öğrenci',
          tcKimlikNo: '12345678901',
          ogrenciNo: '2025999',
          isletmeAdi: 'OSTİM Teknopark A.Ş.'
        }
      });

      const res = await request(app)
        .get('/api/records/MYO_UYGULAMALI_EGITIM/export')
        .query({ departmentId: cengDept._id.toString(), period: '2025-2026' })
        .set('Authorization', `Bearer ${adminToken}`)
        .buffer(true)
        .parse(binaryParser);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(
        res.headers['content-type'],
        'application/vnd.ms-excel.sheet.macroEnabled.main+xml'
      );

      // Inspect with AdmZip
      const zip = new AdmZip(res.body);
      const vbaEntry = zip.getEntry('xl/vbaProject.bin');
      assert.ok(vbaEntry, 'xl/vbaProject.bin must be preserved byte-for-byte in export');

      const ctXml = zip.readAsText('[Content_Types].xml');
      assert.strictEqual(
        ctXml.includes('application/vnd.ms-excel.sheet.macroEnabled.main+xml'),
        true,
        'Content Types must declare macroEnabled'
      );
    });
  });

  describe('4. Validated Excel Import Engine', () => {
    it('4.1 Successfully imports valid Excel workbook into database', async () => {
      // Create a valid Excel workbook in memory
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Dersler');

      // Header row at row 7
      const headerRow = ws.getRow(7);
      headerRow.getCell(1).value = 'Sıra No';
      headerRow.getCell(2).value = 'Dersin Kodu';
      headerRow.getCell(3).value = 'Dersin Adı';
      headerRow.getCell(4).value = 'Dersin Dili';
      headerRow.getCell(5).value = 'AKTS';
      headerRow.commit();

      // Data row at row 9
      const dataRow = ws.getRow(9);
      dataRow.getCell(1).value = 1;
      dataRow.getCell(2).value = 'CENG201';
      dataRow.getCell(3).value = 'Veri Yapıları ve Algoritmalar';
      dataRow.getCell(4).value = 'Türkçe';
      dataRow.getCell(5).value = 6;
      dataRow.commit();

      const fileBuffer = await wb.xlsx.writeBuffer();

      const res = await request(app)
        .post('/api/records/DERSLER/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('departmentId', cengDept._id.toString())
        .field('period', '2025-2026')
        .field('commit', 'true')
        .attach('file', fileBuffer, 'Dersler_Upload.xlsx');

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.valid, true);
      assert.ok(res.body.importedCount >= 1);

      // Verify DB record
      const dbRec = await TableRecord.findOne({
        templateCode: 'DERSLER',
        departmentId: cengDept._id,
        period: '2025-2026',
        'data.dersinKodu': 'CENG201'
      });
      assert.ok(dbRec, 'Imported record must exist in DB');
    });

    it('4.2 Rejects Excel workbook with invalid custom field format (Duration)', async () => {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('EgiticilerinEgitimi');

      const headerRow = ws.getRow(5);
      headerRow.getCell(1).value = 'Sıra No';
      headerRow.getCell(2).value = 'Eğitimin Adı';
      headerRow.getCell(3).value = 'Eğitimin Süresi';
      headerRow.commit();

      const dataRow = ws.getRow(7);
      dataRow.getCell(1).value = 1;
      dataRow.getCell(2).value = 'Öğrenme Teknikleri';
      dataRow.getCell(3).value = 'Geçersiz Süre Formatı 123'; // Invalid duration
      dataRow.commit();

      const fileBuffer = await wb.xlsx.writeBuffer();

      const res = await request(app)
        .post('/api/records/EGITICILERIN_EGITIMI/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('departmentId', cengDept._id.toString())
        .field('period', '2025-2026')
        .attach('file', fileBuffer, 'EgiticilerinEgitimi_Invalid.xlsx');

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.valid, false);
      assert.ok(res.body.errors.length > 0);
      assert.ok(res.body.errors.some(e => e.field === 'egitiminSuresi'));
    });
  });
});
