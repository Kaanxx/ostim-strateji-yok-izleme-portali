const Template = require('../models/Template');
const { extractSchemaFromExcel } = require('../services/excelExtractService');

// GET /api/templates
exports.getTemplates = async (req, res, next) => {
  try {
    const { category, type, isOfficialYOK, search } = req.query;
    const filter = { isActive: true };

    if (category) filter.category = category;
    if (type) filter.type = type;
    if (isOfficialYOK !== undefined) filter.isOfficialYOK = isOfficialYOK === 'true';
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const templates = await Template.find(filter)
      .sort({ category: 1, title: 1 })
      .select('-__v');

    res.status(200).json({ success: true, count: templates.length, data: templates });
  } catch (error) {
    next(error);
  }
};

// GET /api/templates/:code
exports.getTemplateByCode = async (req, res, next) => {
  try {
    const code = req.params.code.toUpperCase().trim();
    const template = await Template.findOne({ code, isActive: true });

    if (!template) {
      return res.status(404).json({ success: false, message: `Şablon bulunamadı: ${code}` });
    }

    res.status(200).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

// POST /api/templates (Admin only)
exports.createTemplate = async (req, res, next) => {
  try {
    const {
      code,
      title,
      category,
      type = 'DYNAMIC',
      description = '',
      columns,
      fixedRows = [],
      dataStartRow = 1,
      excelTemplatePath = null,
      isOfficialYOK = false
    } = req.body;

    if (!code || !title || !category) {
      return res.status(400).json({
        success: false,
        message: 'Şablon kodu, başlığı ve kategorisi zorunludur'
      });
    }

    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Şablon en az bir kolon içermelidir'
      });
    }

    const upperCode = code.toUpperCase().trim();
    const existing = await Template.findOne({ code: upperCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Bu şablon kodu (${upperCode}) zaten kayıtlıdır`
      });
    }

    // Validate unique column keys
    const seenKeys = new Set();
    for (const col of columns) {
      if (!col.key || !col.label) {
        return res.status(400).json({
          success: false,
          message: 'Tüm kolonlar için anahtar (key) ve başlık (label) zorunludur'
        });
      }
      if (seenKeys.has(col.key)) {
        return res.status(400).json({
          success: false,
          message: `Mükerrer kolon anahtarı tespit edildi: ${col.key}`
        });
      }
      seenKeys.add(col.key);
    }

    const template = await Template.create({
      code: upperCode,
      title: title.trim(),
      category: category.trim(),
      type,
      description: description.trim(),
      columns,
      fixedRows,
      dataStartRow,
      excelTemplatePath,
      isOfficialYOK,
      createdBy: req.user?._id || null
    });

    if (req.auditLog) {
      req.auditLog('CREATE', 'TEMPLATE', template._id, { code: template.code, title: template.title }, {
        templateCode: template.code
      });
    }

    res.status(201).json({
      success: true,
      message: 'Şablon başarıyla oluşturuldu',
      data: template
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/templates/:code (Admin only)
exports.updateTemplate = async (req, res, next) => {
  try {
    const code = req.params.code.toUpperCase().trim();
    const template = await Template.findOne({ code });

    if (!template) {
      return res.status(404).json({ success: false, message: `Şablon bulunamadı: ${code}` });
    }

    const {
      title,
      category,
      type,
      description,
      columns,
      fixedRows,
      dataStartRow,
      excelTemplatePath,
      isActive
    } = req.body;

    if (title) template.title = title.trim();
    if (category) template.category = category.trim();
    if (type) template.type = type;
    if (description !== undefined) template.description = description.trim();
    if (dataStartRow !== undefined) template.dataStartRow = dataStartRow;
    if (excelTemplatePath !== undefined) template.excelTemplatePath = excelTemplatePath;
    if (isActive !== undefined) template.isActive = isActive;
    if (fixedRows) template.fixedRows = fixedRows;

    if (columns && Array.isArray(columns) && columns.length > 0) {
      const seenKeys = new Set();
      for (const col of columns) {
        if (!col.key || !col.label) {
          return res.status(400).json({
            success: false,
            message: 'Tüm kolonlar için anahtar (key) ve başlık (label) zorunludur'
          });
        }
        if (seenKeys.has(col.key)) {
          return res.status(400).json({
            success: false,
            message: `Mükerrer kolon anahtarı tespit edildi: ${col.key}`
          });
        }
        seenKeys.add(col.key);
      }
      template.columns = columns;
    }

    template.updatedBy = req.user?._id || null;
    await template.save();

    if (req.auditLog) {
      req.auditLog('UPDATE', 'TEMPLATE', template._id, { code: template.code, title: template.title }, {
        templateCode: template.code
      });
    }

    res.status(200).json({
      success: true,
      message: 'Şablon güncellendi',
      data: template
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/templates/:code (Admin only)
exports.deleteTemplate = async (req, res, next) => {
  try {
    const code = req.params.code.toUpperCase().trim();
    const template = await Template.findOne({ code });

    if (!template) {
      return res.status(404).json({ success: false, message: `Şablon bulunamadı: ${code}` });
    }

    if (template.isOfficialYOK) {
      return res.status(403).json({
        success: false,
        message: 'Resmi YÖK izleme şablonları silinemez.'
      });
    }

    template.isActive = false;
    await template.save();

    if (req.auditLog) {
      req.auditLog('DELETE', 'TEMPLATE', template._id, { code: template.code }, {
        templateCode: template.code
      });
    }

    res.status(200).json({ success: true, message: 'Şablon devre dışı bırakıldı' });
  } catch (error) {
    next(error);
  }
};

// POST /api/templates/extract-from-excel (Admin only)
exports.extractFromExcel = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Lütfen bir Excel (.xlsx, .xlsm) dosyası yükleyiniz' });
    }

    const originalName = req.file.originalname;
    const buffer = req.file.buffer;

    const extractedSchema = await extractSchemaFromExcel(buffer, originalName);

    res.status(200).json({
      success: true,
      message: 'Excel şeması başarıyla çıkarıldı',
      data: extractedSchema
    });
  } catch (error) {
    next(error);
  }
};
