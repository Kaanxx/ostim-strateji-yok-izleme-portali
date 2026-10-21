const { logAuditEvent } = require('../services/auditService');
const { scheduleSnapshotSave } = require('../services/dbPersistenceService');

/**
 * Middleware: Attaches helper req.auditLog for easy forensic audit logging within routes/controllers,
 * and schedules disk snapshot persistence after mutating requests complete.
 */
function auditLoggerMiddleware(req, res, next) {
  req.auditLog = (action, entityType, entityId, changes = null, extraContext = {}) => {
    const user = req.user || {};
    const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip;
    const userAgent = req.headers['user-agent'];

    logAuditEvent({
      userId: user._id || null,
      userEmail: user.email || 'anonymous',
      userName: user.name || 'Sistem',
      role: user.role || 'GUEST',
      action,
      entityType,
      entityId,
      departmentId: extraContext.departmentId || req.body?.departmentId || req.query?.departmentId || user.departmentId || null,
      templateCode: extraContext.templateCode || req.params?.templateCode || req.body?.templateCode || null,
      period: extraContext.period || req.body?.period || req.query?.period || null,
      changes,
      ipAddress,
      userAgent
    });

    scheduleSnapshotSave(200);
  };

  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        scheduleSnapshotSave(200);
      }
    });
  }

  next();
}

module.exports = auditLoggerMiddleware;
