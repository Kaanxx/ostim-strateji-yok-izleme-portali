const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  userEmail: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  userName: {
    type: String,
    default: 'Sistem'
  },
  role: {
    type: String,
    default: 'SYSTEM'
  },
  action: {
    type: String,
    required: true,
    enum: [
      'CREATE',
      'UPDATE',
      'DELETE',
      'APPROVE',
      'REVISE',
      'SUBMIT',
      'REOPEN',
      'RESET',
      'PERMISSION_CHANGE',
      'IMPORT',
      'EXPORT',
      'LOGIN',
      'LOGOUT'
    ],
    index: true
  },
  entityType: {
    type: String,
    required: true,
    enum: [
      'RECORD',
      'USER',
      'DEPARTMENT',
      'TEMPLATE',
      'WORKFLOW',
      'PERIOD',
      'AUTH'
    ],
    index: true
  },
  entityId: {
    type: String,
    default: null
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null,
    index: true
  },
  templateCode: {
    type: String,
    default: null,
    index: true
  },
  period: {
    type: String,
    default: null,
    index: true
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false,
  collection: 'audit_logs'
});

AuditLogSchema.index({ templateCode: 1, departmentId: 1, period: 1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
