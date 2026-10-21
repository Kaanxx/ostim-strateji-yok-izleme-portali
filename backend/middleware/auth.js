const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

/**
 * Middleware: Authenticates JWT token from Authorization header.
 * Attaches authenticated User document to req.user.
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Yetkilendirme başlığı (Authorization header) eksik'
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Yetkilendirme biçimi geçersiz. "Bearer <token>" formatında olmalıdır'
      });
    }

    const token = parts[1];
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          code: 'TOKEN_EXPIRED',
          message: 'Oturum süreniz doldu, lütfen tekrar giriş yapınız'
        });
      }
      return res.status(401).json({
        success: false,
        code: 'TOKEN_INVALID',
        message: 'Geçersiz oturum anahtarı (token)'
      });
    }

    const user = await User.findById(decoded.id).populate('departmentId');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı hesabı bulunamadı'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Kullanıcı hesabı devre dışı bırakılmıştır'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Restricts access to specific roles. ADMIN always has access.
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Kimlik doğrulanmadı'
      });
    }

    if (req.user.role === 'ADMIN') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için gerekli role sahip değilsiniz'
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};
