const Period = require('../models/Period');
const PeriodDeadline = require('../models/PeriodDeadline');

// GET /api/periods
exports.getPeriods = async (req, res, next) => {
  try {
    const periods = await Period.find().sort({ startDate: -1 });
    res.status(200).json({ success: true, count: periods.length, data: periods });
  } catch (error) {
    next(error);
  }
};

// GET /api/periods/active
exports.getActivePeriod = async (req, res, next) => {
  try {
    const active = await Period.findOne({ isActive: true });
    if (!active) {
      return res.status(404).json({ success: false, message: 'Aktif raporlama dönemi bulunamadı' });
    }
    res.status(200).json({ success: true, data: active });
  } catch (error) {
    next(error);
  }
};

// POST /api/periods (Admin only)
exports.createPeriod = async (req, res, next) => {
  try {
    const { name, code, startDate, endDate, defaultDeadline, isActive = false, description = '' } = req.body;

    if (!name || !startDate || !endDate || !defaultDeadline) {
      return res.status(400).json({ success: false, message: 'Dönem adı ve tarihler zorunludur' });
    }

    const pCode = (code || name).toLowerCase().trim();

    if (isActive) {
      // Deactivate all other periods
      await Period.updateMany({}, { isActive: false });
    }

    const period = await Period.create({
      name: name.trim(),
      code: pCode,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      defaultDeadline: new Date(defaultDeadline),
      isActive,
      description
    });

    if (req.auditLog) {
      req.auditLog('CREATE', 'PERIOD', period._id, { name: period.name });
    }

    res.status(201).json({ success: true, message: 'Dönem başarıyla oluşturuldu', data: period });
  } catch (error) {
    next(error);
  }
};

// PUT /api/periods/:id (Admin only)
exports.updatePeriod = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, startDate, endDate, defaultDeadline, isActive, isArchived, description } = req.body;

    const period = await Period.findById(id);
    if (!period) {
      return res.status(404).json({ success: false, message: 'Dönem bulunamadı' });
    }

    if (name) period.name = name.trim();
    if (code) period.code = code.toLowerCase().trim();
    if (startDate) period.startDate = new Date(startDate);
    if (endDate) period.endDate = new Date(endDate);
    if (defaultDeadline) period.defaultDeadline = new Date(defaultDeadline);
    if (isArchived !== undefined) period.isArchived = isArchived;
    if (description !== undefined) period.description = description;

    if (isActive === true) {
      await Period.updateMany({ _id: { $ne: id } }, { isActive: false });
      period.isActive = true;
    } else if (isActive === false) {
      period.isActive = false;
    }

    await period.save();

    if (req.auditLog) {
      req.auditLog('UPDATE', 'PERIOD', period._id, { name: period.name, isActive: period.isActive });
    }

    res.status(200).json({ success: true, message: 'Dönem güncellendi', data: period });
  } catch (error) {
    next(error);
  }
};

// PUT /api/periods/:id/active (Admin only)
exports.setActivePeriod = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Period.updateMany({}, { isActive: false });
    const period = await Period.findByIdAndUpdate(id, { isActive: true }, { new: true });

    if (!period) {
      return res.status(404).json({ success: false, message: 'Dönem bulunamadı' });
    }

    if (req.auditLog) {
      req.auditLog('UPDATE', 'PERIOD', period._id, { action: 'setActive', name: period.name });
    }

    res.status(200).json({ success: true, message: 'Dönem aktif olarak işaretlendi', data: period });
  } catch (error) {
    next(error);
  }
};

// GET /api/periods/:period/deadlines
exports.getPeriodDeadlines = async (req, res, next) => {
  try {
    const { period } = req.params;
    const deadlines = await PeriodDeadline.find({ period })
      .populate('departmentId', 'name code')
      .populate('updatedBy', 'name email')
      .sort({ deadline: 1 });

    res.status(200).json({ success: true, count: deadlines.length, data: deadlines });
  } catch (error) {
    next(error);
  }
};

// POST /api/periods/:period/deadlines (Admin only)
exports.setPeriodDeadline = async (req, res, next) => {
  try {
    const { period } = req.params;
    const { templateCode, departmentId = null, deadline, remarks = '' } = req.body;

    if (!templateCode || !deadline) {
      return res.status(400).json({ success: false, message: 'Şablon kodu ve teslim tarihi zorunludur' });
    }

    const tCode = templateCode.toUpperCase().trim();
    const query = {
      period,
      templateCode: tCode,
      departmentId: departmentId || null
    };

    const update = {
      deadline: new Date(deadline),
      remarks,
      updatedBy: req.user?._id
    };

    const result = await PeriodDeadline.findOneAndUpdate(
      query,
      { $set: update },
      { upsert: true, new: true }
    );

    if (req.auditLog) {
      req.auditLog('UPDATE', 'PERIOD', result._id, { templateCode: tCode, deadline });
    }

    res.status(200).json({
      success: true,
      message: 'Teslim tarihi başarıyla belirlendi',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/periods/:period/deadlines/:id (Admin only)
exports.deletePeriodDeadline = async (req, res, next) => {
  try {
    const { id } = req.params;
    await PeriodDeadline.findByIdAndDelete(id);

    if (req.auditLog) {
      req.auditLog('DELETE', 'PERIOD', id);
    }

    res.status(200).json({ success: true, message: 'Özel teslim tarihi kaldırıldı' });
  } catch (error) {
    next(error);
  }
};
