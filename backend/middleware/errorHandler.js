/**
 * Global Express 5 Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log in non-test environments
  if (process.env.NODE_ENV !== 'test') {
    console.error('💥 [Unhandled API Error]:', err);
  }

  // 1. Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Geçersiz kaynak kimliği: ${err.value}`
    });
  }

  // 2. Mongoose Duplicate Key (Code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'alan';
    return res.status(409).json({
      success: false,
      message: `Bu ${field} değeri zaten kullanılmaktadır`
    });
  }

  // 3. Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: 'Doğrulama hatası',
      errors: messages
    });
  }

  // 4. JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Geçersiz oturum anahtarı'
    });
  }

  // 5. Default internal server error
  const statusCode = err.statusCode || res.statusCode >= 400 ? res.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    message: error.message || 'Sunucu hatası meydana geldi',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

module.exports = errorHandler;
