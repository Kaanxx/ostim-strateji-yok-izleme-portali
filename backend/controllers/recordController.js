const TableRecord = require('../models/TableRecord');
const WorkflowState = require('../models/WorkflowState');
const Template = require('../models/Template');
const { resolveEffectiveDeadline } = require('../services/deadlineService');
const formulaEngineService = require('../services/formulaEngineService');

/**
 * Validates non-empty field values in rows against template.columns definitions
 * (integer/decimal min/max bounds and select options).
 */
function validateRowsAgainstTemplateColumns(template, rowsToValidate = []) {
  if (!template || !Array.isArray(template.columns) || template.columns.length === 0) {
    return [];
  }

  const errors = [];
  const fixedRowMap = new Map(
    (template.fixedRows || []).map((fr) => [fr.rowIndex, fr])
  );

  rowsToValidate.forEach((r, idx) => {
    const rowNum = r.rowNumber !== undefined ? r.rowNumber : idx + 1;
    const rowData = r.data || r || {};
    const fixedDef = fixedRowMap.get(rowNum);

    if (
      rowData.isSummary ||
      rowData.isReadonly ||
      (fixedDef && (fixedDef.isSummary || fixedDef.isReadonly))
    ) {
      return;
    }

    for (const col of template.columns) {
      if (!col || col.type === 'formula') continue;
      const val = rowData[col.key];
      if (val === undefined || val === null || String(val).trim() === '') {
        continue;
      }

      if (col.type === 'integer') {
        const num = typeof val === 'number' ? val : Number(String(val).trim());
        if (isNaN(num) || !Number.isInteger(num)) {
          errors.push({
            row: rowNum,
            field: col.key,
            column: col.label,
            value: val,
            message: `Satır ${rowNum} - ${col.label}: Tam sayı olmalıdır.`
          });
          continue;
        }
        const allowNegativeFinans =
          template.code === 'FINANS' && (rowNum === 32 || rowNum === 34);
        if (
          col.min !== null &&
          col.min !== undefined &&
          !(allowNegativeFinans && col.min === 0) &&
          num < col.min
        ) {
          errors.push({
            row: rowNum,
            field: col.key,
            column: col.label,
            value: val,
            message: `Satır ${rowNum} - ${col.label}: Değer en az ${col.min} olmalıdır.`
          });
        }
        if (col.max !== null && col.max !== undefined && num > col.max) {
          errors.push({
            row: rowNum,
            field: col.key,
            column: col.label,
            value: val,
            message: `Satır ${rowNum} - ${col.label}: Değer en fazla ${col.max} olmalıdır.`
          });
        }
      } else if (col.type === 'decimal') {
        const num =
          typeof val === 'number'
            ? val
            : Number(String(val).trim().replace(',', '.'));
        if (isNaN(num)) {
          errors.push({
            row: rowNum,
            field: col.key,
            column: col.label,
            value: val,
            message: `Satır ${rowNum} - ${col.label}: Geçerli bir sayı olmalıdır.`
          });
          continue;
        }
        const allowNegativeFinans =
          template.code === 'FINANS' && (rowNum === 32 || rowNum === 34);
        if (
          col.min !== null &&
          col.min !== undefined &&
          !(allowNegativeFinans && col.min === 0) &&
          num < col.min
        ) {
          errors.push({
            row: rowNum,
            field: col.key,
            column: col.label,
            value: val,
            message: `Satır ${rowNum} - ${col.label}: Değer en az ${col.min} olmalıdır.`
          });
        }
        if (col.max !== null && col.max !== undefined && num > col.max) {
          errors.push({
            row: rowNum,
            field: col.key,
            column: col.label,
            value: val,
            message: `Satır ${rowNum} - ${col.label}: Değer en fazla ${col.max} olmalıdır.`
          });
        }
      } else if (
        col.type === 'select' &&
        Array.isArray(col.options) &&
        col.options.length > 0
      ) {
        const strVal = String(val).trim();
        const allowed = col.options.map((o) => String(o).trim());
        if (!allowed.includes(strVal)) {
          errors.push({
            row: rowNum,
            field: col.key,
            column: col.label,
            value: val,
            message: `Satır ${rowNum} - ${col.label}: "${strVal}" geçerli seçenekler arasında değil.`
          });
        }
      }
    }
  });

  return errors;
}

// GET /api/records/:templateCode
exports.getRecords = async (req, res, next) => {
  try {
    const templateCode = req.params.templateCode.toUpperCase().trim();
    const { departmentId, period, rowNumber } = req.query;

    const filter = { templateCode };

    if (departmentId) {
      filter.departmentId = departmentId;
    } else if (req.departmentFilter) {
      filter.departmentId = req.departmentFilter;
    }

    if (period) {
      filter.period = period;
    }

    if (rowNumber !== undefined) {
      filter.rowNumber = parseInt(rowNumber, 10);
    }

    let records = await TableRecord.find(filter)
      .populate('departmentId', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ rowNumber: 1, createdAt: 1 });

    // On-demand auto-initialization check for FIXED templates
    if (records.length === 0 && departmentId && period && rowNumber === undefined) {
      const template = await Template.findOne({ code: templateCode, isActive: true });

      if (template && template.type === 'FIXED' && Array.isArray(template.fixedRows) && template.fixedRows.length > 0) {
        const initDocs = template.fixedRows.map(rowDef => ({
          templateCode,
          departmentId,
          period,
          rowNumber: rowDef.rowIndex,
          fixedRowId: rowDef.rowKey,
          data: {
            siraNo: rowDef.rowIndex,
            label: rowDef.label,
            birim: rowDef.label,
            birimler: rowDef.label,
            kalem: rowDef.label,
            soru: rowDef.label,
            dimension: rowDef.customRules?.dimension || '',
            questionId: rowDef.rowIndex,
            isSummary: rowDef.isSummary || false,
            isReadonly: rowDef.isReadonly || false,
            formula: rowDef.formula || null
          },
          status: 'DRAFT',
          isApproved: false,
          createdBy: req.user?._id || null,
          lastModifiedBy: req.user?._id || null
        }));

        try {
          await TableRecord.insertMany(initDocs, { ordered: false });
        } catch (insertErr) {
          if (insertErr.code !== 11000) throw insertErr;
        }

        records = await TableRecord.find(filter)
          .populate('departmentId', 'name code')
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email')
          .sort({ rowNumber: 1, createdAt: 1 });
      }
    }

    // Fetch workflow state if departmentId and period are specified
    let workflow = null;
    let deadline = null;

    if (departmentId && period) {
      workflow = await WorkflowState.findOne({
        templateCode,
        departmentId,
        period
      }).lean();

      deadline = await resolveEffectiveDeadline(period, templateCode, departmentId);
    }

    res.status(200).json({
      success: true,
      count: records.length,
      data: records,
      workflow: workflow || { status: 'DRAFT', history: [] },
      deadline
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/records/:templateCode/calculate
exports.calculateRecords = async (req, res, next) => {
  try {
    const templateCode = req.params.templateCode;
    const body = req.body || {};
    const result = formulaEngineService.calculate(templateCode, body);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/records/:templateCode
exports.saveRecords = async (req, res, next) => {
  try {
    const templateCode = req.params.templateCode.toUpperCase().trim();
    const { departmentId, period, rows, data, rowNumber } = req.body || {};

    if (!departmentId || !period) {
      return res.status(400).json({
        success: false,
        message: 'Birim (departmentId) ve dönem (period) zorunludur'
      });
    }

    const template = await Template.findOne({ code: templateCode, isActive: true });
    if (!template) {
      return res.status(404).json({
        success: false,
        message: `Şablon bulunamadı: ${templateCode}`
      });
    }

    if (!Array.isArray(rows) && !data) {
      return res.status(400).json({
        success: false,
        message: 'Kaydedilecek veri satırları (rows veya data) belirtilmelidir'
      });
    }

    // Validate non-empty fields against template column definitions
    const rowsForValidation = Array.isArray(rows)
      ? rows
      : [{ data, rowNumber: rowNumber !== undefined ? rowNumber : 1 }];
    const colErrors = validateRowsAgainstTemplateColumns(template, rowsForValidation);
    if (colErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Veri doğrulama hatası',
        errors: colErrors
      });
    }

    // Run formula engine validations and calculations
    const hookResult = formulaEngineService.preSaveHook(
      templateCode,
      Array.isArray(rows) ? { rows } : { data, rowNumber }
    );
    if (!hookResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Veri doğrulama hatası',
        errors: hookResult.errors
      });
    }

    const savedRecords = [];

    // Support both batch rows array and single record payload
    if (Array.isArray(rows)) {
      const processedRows = hookResult.rows || rows;
      for (let i = 0; i < processedRows.length; i++) {
        const item = processedRows[i];
        const originalItem = rows[i] || {};
        const rNum = item.rowNumber !== undefined ? item.rowNumber : (i + 1);
        const rowData = item.data || item;
        const itemId = originalItem._id || originalItem.id || item._id || item.id;
        const fixedRowId = originalItem.fixedRowId || item.fixedRowId || null;

        let record;
        if (template.type === 'FIXED') {
          record = await TableRecord.findOneAndUpdate(
            { templateCode, departmentId, period, rowNumber: rNum },
            {
              $set: {
                data: rowData,
                fixedRowId,
                lastModifiedBy: req.user._id,
                updatedBy: req.user._id,
                status: 'DRAFT'
              },
              $setOnInsert: {
                createdBy: req.user._id,
                submittedBy: null,
                isApproved: false
              }
            },
            { upsert: true, returnDocument: 'after' }
          );
        } else {
          // Dynamic row: if has _id or id update it, else create new
          if (itemId) {
            record = await TableRecord.findOneAndUpdate(
              {
                _id: itemId,
                departmentId,
                templateCode,
                period
              },
              {
                $set: {
                  data: rowData,
                  rowNumber: rNum,
                  lastModifiedBy: req.user._id,
                  updatedBy: req.user._id
                }
              },
              { returnDocument: 'after' }
            );
          } else {
            record = await TableRecord.create({
              templateCode,
              departmentId,
              period,
              rowNumber: rNum,
              data: rowData,
              createdBy: req.user._id,
              lastModifiedBy: req.user._id,
              status: 'DRAFT'
            });
          }
        }
        if (record) savedRecords.push(record);
      }

      // If syncAll is requested for a DYNAMIC template, remove records omitted from the submitted rows list
      if (template.type === 'DYNAMIC' && req.body?.syncAll === true) {
        const keptIds = savedRecords.map((r) => r._id).filter(Boolean);
        await TableRecord.deleteMany({
          templateCode,
          departmentId,
          period,
          _id: { $nin: keptIds }
        });
      }
    } else if (data) {
      // Single record insertion/update
      const enrichedData = (hookResult.rows && hookResult.rows[0] && hookResult.rows[0].data)
        ? hookResult.rows[0].data
        : data;
      const targetRowNum = rowNumber ? parseInt(rowNumber, 10) : (hookResult.rows && hookResult.rows[0] && hookResult.rows[0].rowNumber ? hookResult.rows[0].rowNumber : undefined);

      let record;
      if (template.type === 'FIXED' && targetRowNum !== undefined) {
        record = await TableRecord.findOneAndUpdate(
          { templateCode, departmentId, period, rowNumber: targetRowNum },
          {
            $set: {
              data: enrichedData,
              lastModifiedBy: req.user._id,
              updatedBy: req.user._id
            },
            $setOnInsert: {
              createdBy: req.user._id
            }
          },
          { upsert: true, returnDocument: 'after' }
        );
      } else {
        record = await TableRecord.create({
          templateCode,
          departmentId,
          period,
          rowNumber: targetRowNum,
          data: enrichedData,
          createdBy: req.user._id,
          lastModifiedBy: req.user._id
        });
      }
      savedRecords.push(record);
    }

    if (req.auditLog) {
      req.auditLog('CREATE', 'RECORD', null, { count: savedRecords.length }, {
        departmentId,
        templateCode,
        period
      });
    }

    res.status(200).json({
      success: true,
      message: 'Veriler başarıyla kaydedildi',
      count: savedRecords.length,
      data: savedRecords
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/records/:templateCode/:id
exports.updateRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, rowNumber } = req.body || {};

    const record = req.targetRecord || await TableRecord.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Kayıt bulunamadı' });
    }

    // Verify templateCode matches target record
    const templateCode = (req.params.templateCode || '').toUpperCase().trim();
    if (templateCode && record.templateCode !== templateCode) {
      return res.status(404).json({ success: false, message: 'Kayıt bulunamadı' });
    }

    // Enforce department ownership and scope for non-admin users
    if (req.user && req.user.role !== 'ADMIN') {
      const isAuthorized = Array.isArray(req.authorizedDepartmentIds)
        ? req.authorizedDepartmentIds.includes(record.departmentId.toString())
        : req.authorizedDepartmentIds === 'ALL';

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Bu birime ait kaydı güncelleme yetkiniz bulunmamaktadır'
        });
      }
    }

    if (data) {
      const template = await Template.findOne({ code: record.templateCode, isActive: true });
      const targetRowNum = rowNumber !== undefined ? rowNumber : record.rowNumber;
      if (template) {
        const colErrors = validateRowsAgainstTemplateColumns(template, [
          { data, rowNumber: targetRowNum }
        ]);
        if (colErrors.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Veri doğrulama hatası',
            errors: colErrors
          });
        }
      }

      const hookResult = formulaEngineService.preSaveHook(record.templateCode, {
        data,
        rowNumber: targetRowNum
      });
      if (!hookResult.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Veri doğrulama hatası',
          errors: hookResult.errors
        });
      }
      record.data = (hookResult.rows && hookResult.rows[0] && hookResult.rows[0].data)
        ? hookResult.rows[0].data
        : data;
    }
    if (rowNumber !== undefined) record.rowNumber = rowNumber;
    record.lastModifiedBy = req.user._id;
    record.updatedBy = req.user._id;

    await record.save();

    if (req.auditLog) {
      req.auditLog('UPDATE', 'RECORD', record._id, { data: record.data }, {
        departmentId: record.departmentId,
        templateCode: record.templateCode,
        period: record.period
      });
    }

    res.status(200).json({
      success: true,
      message: 'Kayıt başarıyla güncellendi',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/records/:templateCode/:id
exports.deleteRecord = async (req, res, next) => {
  try {
    const { id } = req.params;

    const record = req.targetRecord || await TableRecord.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Kayıt bulunamadı' });
    }

    // Verify templateCode matches target record
    const templateCode = (req.params.templateCode || '').toUpperCase().trim();
    if (templateCode && record.templateCode !== templateCode) {
      return res.status(404).json({ success: false, message: 'Kayıt bulunamadı' });
    }

    // Enforce department ownership and scope for non-admin users
    if (req.user && req.user.role !== 'ADMIN') {
      const isAuthorized = Array.isArray(req.authorizedDepartmentIds)
        ? req.authorizedDepartmentIds.includes(record.departmentId.toString())
        : req.authorizedDepartmentIds === 'ALL';

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Bu birime ait kaydı silme yetkiniz bulunmamaktadır'
        });
      }
    }

    await TableRecord.findByIdAndDelete(id);

    if (req.auditLog) {
      req.auditLog('DELETE', 'RECORD', id, { rowNumber: record.rowNumber }, {
        departmentId: record.departmentId,
        templateCode: record.templateCode,
        period: record.period
      });
    }

    res.status(200).json({
      success: true,
      message: 'Kayıt başarıyla silindi'
    });
  } catch (error) {
    next(error);
  }
};
