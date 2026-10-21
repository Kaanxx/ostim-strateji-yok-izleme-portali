const Department = require('../models/Department');
const departmentService = require('../services/departmentService');

// GET /api/departments
exports.getDepartments = async (req, res, next) => {
  try {
    const { format = 'tree', flat, type, search } = req.query;

    if (format === 'tree' && flat !== 'true' && flat !== true) {
      const tree = await departmentService.getDepartmentTree();
      return res.status(200).json({ success: true, count: tree.length, data: tree });
    }

    const filter = { isActive: true };
    if (type) filter.type = type;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const departments = await departmentService.getFlatDepartments(filter);
    res.status(200).json({ success: true, count: departments.length, data: departments });
  } catch (error) {
    next(error);
  }
};

// GET /api/departments/:id
exports.getDepartmentById = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('parentId', 'name code type')
      .populate('children', 'name code type');

    if (!department) {
      return res.status(404).json({ success: false, message: 'Birim bulunamadı' });
    }

    res.status(200).json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
};

// GET /api/departments/:id/descendants
exports.getDepartmentDescendants = async (req, res, next) => {
  try {
    const descendantIds = await departmentService.getDescendantIds(req.params.id);
    const departments = await Department.find({ _id: { $in: descendantIds } })
      .select('name code type parentId');

    res.status(200).json({ success: true, count: departments.length, data: departments });
  } catch (error) {
    next(error);
  }
};

// POST /api/departments (Admin only)
exports.createDepartment = async (req, res, next) => {
  try {
    const { name, code, type, parentId, description, order } = req.body;

    if (!name || !code || !type) {
      return res.status(400).json({ success: false, message: 'Birim adı, kodu ve türü zorunludur' });
    }

    const existing = await Department.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Bu birim kodu zaten kullanımda' });
    }

    let ancestors = [];
    if (parentId) {
      const parent = await Department.findById(parentId);
      if (!parent) {
        return res.status(400).json({ success: false, message: 'Belirtilen üst birim bulunamadı' });
      }
      ancestors = [...parent.ancestors, parent._id];
    }

    const newDept = await Department.create({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      type,
      parentId: parentId || null,
      ancestors,
      description: description ? description.trim() : '',
      order: order || 0
    });

    if (req.auditLog) {
      req.auditLog('CREATE', 'DEPARTMENT', newDept._id, { code: newDept.code, name: newDept.name });
    }

    res.status(201).json({ success: true, message: 'Birim başarıyla oluşturuldu', data: newDept });
  } catch (error) {
    next(error);
  }
};

// PUT /api/departments/:id (Admin only)
exports.updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, type, parentId, description, order, isActive } = req.body;

    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Birim bulunamadı' });
    }

    if (code && code.toUpperCase().trim() !== dept.code) {
      const existing = await Department.findOne({ code: code.toUpperCase().trim() });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Bu birim kodu başka bir birim tarafından kullanılıyor' });
      }
      dept.code = code.toUpperCase().trim();
    }

    if (name) dept.name = name.trim();
    if (type) dept.type = type;
    if (description !== undefined) dept.description = description.trim();
    if (order !== undefined) dept.order = order;
    if (isActive !== undefined) dept.isActive = isActive;

    if (parentId !== undefined && String(parentId) !== String(dept.parentId)) {
      await departmentService.updateDepartmentAncestors(dept._id, parentId);
    } else {
      await dept.save();
    }

    if (req.auditLog) {
      req.auditLog('UPDATE', 'DEPARTMENT', dept._id, { code: dept.code, name: dept.name });
    }

    res.status(200).json({ success: true, message: 'Birim güncellendi', data: dept });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/departments/:id (Admin only)
exports.deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const hasChildren = await Department.countDocuments({ parentId: id, isActive: true });
    if (hasChildren > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu birime bağlı aktif alt birimler var. Önce alt birimleri taşıyınız veya siliniz.'
      });
    }

    const dept = await Department.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Birim bulunamadı' });
    }

    if (req.auditLog) {
      req.auditLog('DELETE', 'DEPARTMENT', dept._id, { code: dept.code });
    }

    res.status(200).json({ success: true, message: 'Birim devre dışı bırakıldı' });
  } catch (error) {
    next(error);
  }
};
