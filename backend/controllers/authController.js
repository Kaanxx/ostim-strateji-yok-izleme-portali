const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');

// Helper to sign JWT
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId?._id || user.departmentId
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};

// POST /api/auth/login and legacy POST /login
exports.login = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    const identifier = (email || username || '').toLowerCase().trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'E-posta ve şifre zorunludur'
      });
    }

    // Query user including password field
    const user = await User.findOne({ email: identifier })
      .select('+password')
      .populate('departmentId');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Hatalı kullanıcı adı veya şifre'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Bu kullanıcı hesabı devre dışı bırakılmıştır'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Hatalı kullanıcı adı veya şifre'
      });
    }

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

    // Audit log
    if (req.auditLog) {
      req.auditLog('LOGIN', 'AUTH', user._id, null, {
        departmentId: user.departmentId?._id || user.departmentId
      });
    }

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        departmentScope: user.departmentScope,
        tablePermissions: user.tablePermissions
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('departmentId')
      .populate('departmentScope.departments');

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mevcut şifre ve yeni şifre belirtilmelidir'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Yeni şifre en az 6 karakter olmalıdır'
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mevcut şifreniz hatalı'
      });
    }

    user.password = newPassword;
    await user.save();

    if (req.auditLog) {
      req.auditLog('UPDATE', 'AUTH', user._id, { action: 'changePassword' });
    }

    res.status(200).json({
      success: true,
      message: 'Şifreniz başarıyla değiştirildi'
    });
  } catch (error) {
    next(error);
  }
};
