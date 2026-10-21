const AuditLog = require('../models/AuditLog');

/**
 * Non-blocking forensic audit logger service.
 * Dispatches database write via setImmediate so HTTP latency is never impacted.
 */
function logAuditEvent({
  userId = null,
  userEmail = 'anonymous',
  userName = 'Sistem',
  role = 'SYSTEM',
  action,
  entityType,
  entityId = null,
  departmentId = null,
  templateCode = null,
  period = null,
  changes = null,
  ipAddress = null,
  userAgent = null
}) {
  setImmediate(async () => {
    try {
      await AuditLog.create({
        userId,
        userEmail,
        userName,
        role,
        action,
        entityType,
        entityId: entityId ? entityId.toString() : null,
        departmentId: departmentId ? departmentId : null,
        templateCode: templateCode ? templateCode.toUpperCase().trim() : null,
        period,
        changes,
        ipAddress,
        userAgent,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('⚠️ [AuditLog Error] Failed to write audit event:', err.message);
    }
  });
}

module.exports = { logAuditEvent };
