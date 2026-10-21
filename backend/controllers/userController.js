const User = require('../models/User');

// GET /api/users
exports.getUsers = async (req, res, next) => {
  try {
    const { role, departmentId, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (departmentId) filter.departmentId = departmentId;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .populate('departmentId', 'name code type')
      .populate('departmentScope.departments', 'name code type')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:id
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('departmentId')
      .populate('departmentScope.departments');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// POST /api/users
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, departmentId, departmentScope, tablePermissions } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Ad, e-posta ve şifre zorunludur' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Bu e-posta adresi zaten kayıtlı' });
    }

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role || 'DEPT_USER',
      departmentId: departmentId || null,
      departmentScope: departmentScope || { type: 'OWN_DEPT', departments: [] },
      tablePermissions: tablePermissions || []
    });

    if (req.auditLog) {
      req.auditLog('CREATE', 'USER', newUser._id, { email: newUser.email, role: newUser.role });
    }

    res.status(201).json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      data: newUser
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/:id
exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, departmentId, departmentScope, tablePermissions, isActive, password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    if (name) user.name = name.trim();
    if (email && email.toLowerCase().trim() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Bu e-posta adresi kullanımda' });
      }
      user.email = email.toLowerCase().trim();
    }
    if (role) user.role = role;
    if (departmentId !== undefined) user.departmentId = departmentId || null;
    if (departmentScope) user.departmentScope = departmentScope;
    if (tablePermissions) user.tablePermissions = tablePermissions;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password; // triggers bcrypt pre-save hook

    await user.save();

    if (req.auditLog) {
      req.auditLog('UPDATE', 'USER', user._id, { email: user.email, role: user.role });
    }

    res.status(200).json({
      success: true,
      message: 'Kullanıcı başarıyla güncellendi',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/:id/permissions
exports.updateUserPermissions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tablePermissions, departmentScope } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    if (tablePermissions) user.tablePermissions = tablePermissions;
    if (departmentScope) user.departmentScope = departmentScope;

    await user.save();

    if (req.auditLog) {
      req.auditLog('PERMISSION_CHANGE', 'USER', user._id, { tablePermissions, departmentScope });
    }

    res.status(200).json({
      success: true,
      message: 'Kullanıcı yetkileri güncellendi',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/:id/scope
exports.updateUserScope = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { departmentScope } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    user.departmentScope = departmentScope;
    await user.save();

    if (req.auditLog) {
      req.auditLog('PERMISSION_CHANGE', 'USER', user._id, { departmentScope });
    }

    res.status(200).json({
      success: true,
      message: 'Birim görünürlük kapsamı güncellendi',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    user.isActive = false;
    await user.save();

    if (req.auditLog) {
      req.auditLog('DELETE', 'USER', user._id, { email: user.email });
    }

    res.status(200).json({
      success: true,
      message: 'Kullanıcı devre dışı bırakıldı'
    });
  } catch (error) {
    next(error);
  }
};
