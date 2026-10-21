/**
 * excelController.js
 * 
 * Controller for 1:1 Template Excel Export, Validated Import, and Blank Download
 */

const excelTemplateService = require('../services/excelTemplateService');
const TableRecord = require('../models/TableRecord');
const Template = require('../models/Template');

// GET /api/records/:templateCode/export or /api/excel/export/:templateCode
exports.exportRecords = async (req, res, next) => {
  try {
    const templateCode = req.params.templateCode.toUpperCase().trim();
    const { departmentId, period, format = 'template' } = req.query;

    if (!departmentId || !period) {
      return res.status(400).json({
        success: false,
        message: 'Birim (departmentId) ve dönem (period) sorgu parametreleri zorunludur'
      });
    }

    // Enforce department scope for non-admin users
    if (req.user && req.user.role !== 'ADMIN') {
      const isAuthorized = Array.isArray(req.authorizedDepartmentIds)
        ? req.authorizedDepartmentIds.includes(departmentId.toString())
        : req.authorizedDepartmentIds === 'ALL';

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Bu birime ait verileri dışa aktarma yetkiniz bulunmamaktadır'
        });
      }
    }

    const records = await TableRecord.find({
      templateCode,
      departmentId,
      period
    }).sort({ rowNumber: 1, createdAt: 1 });

    const result = await excelTemplateService.exportToTemplate(templateCode, records, { format });

    if (req.auditLog) {
      req.auditLog('EXPORT', 'RECORD', null, { templateCode, departmentId, period, count: records.length }, {
        departmentId,
        templateCode,
        period
      });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`);
    res.setHeader('Content-Type', result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    next(error);
  }
};

// POST /api/records/:templateCode/import or /api/excel/import/:templateCode
exports.importRecords = async (req, res, next) => {
  try {
    const templateCode = req.params.templateCode.toUpperCase().trim();
    const { departmentId, period, commit = 'true' } = req.body || {};

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen yüklenecek Excel dosyasını seçiniz (.xlsx veya .xlsm).'
      });
    }

    if (!departmentId || !period) {
      return res.status(400).json({
        success: false,
        message: 'Birim (departmentId) ve dönem (period) parametreleri zorunludur'
      });
    }

    const template = await Template.findOne({ code: templateCode, isActive: true });
    if (!template) {
      return res.status(404).json({
        success: false,
        message: `Şablon bulunamadı: ${templateCode}`
      });
    }

    // Validate and parse workbook
    const parseResult = await excelTemplateService.validateAndParseExcel(
      template,
      req.file.buffer
    );

    // If validation failed, return structured error report
    if (!parseResult.valid) {
      return res.status(400).json({
        success: false,
        valid: false,
        totalRows: parseResult.totalRows,
        validRows: parseResult.validRows,
        invalidRows: parseResult.errors.length,
        errors: parseResult.errors
      });
    }

    const shouldCommit = commit === true || commit === 'true';
    let importedCount = 0;

    if (shouldCommit && parseResult.parsedRecords.length > 0) {
      await TableRecord.deleteMany({ templateCode, departmentId, period });

      const recordsToInsert = parseResult.parsedRecords.map((item, index) => ({
        templateCode,
        departmentId,
        period,
        data: item.cleanData,
        rowNumber: item.rowNumber || (index + 1),
        fixedRowId: item.fixedRowId || null,
        status: 'DRAFT',
        isApproved: false,
        createdBy: req.user?._id || null,
        updatedBy: req.user?._id || null,
        lastModifiedBy: req.user?._id || null
      }));

      await TableRecord.insertMany(recordsToInsert);
      importedCount = recordsToInsert.length;

      if (req.auditLog) {
        req.auditLog('IMPORT', 'RECORD', null, { templateCode, departmentId, period, importedCount }, {
          departmentId,
          templateCode,
          period
        });
      }
    }

    return res.status(200).json({
      success: true,
      valid: true,
      totalRows: parseResult.totalRows,
      validRows: parseResult.validRows,
      importedCount,
      errors: []
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/templates/:code/blank-excel or /api/excel/blank/:templateCode
exports.getBlankExcel = async (req, res, next) => {
  try {
    const rawCode = req.params.templateCode || req.params.code;
    if (!rawCode) {
      return res.status(400).json({
        success: false,
        message: 'Şablon kodu (code veya templateCode) zorunludur'
      });
    }
    const code = rawCode.toUpperCase().trim();
    const result = await excelTemplateService.getBlankTemplate(code);

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`);
    res.setHeader('Content-Type', result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    next(error);
  }
};
