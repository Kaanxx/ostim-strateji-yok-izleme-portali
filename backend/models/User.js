const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const TablePermissionSchema = new mongoose.Schema({
  templateCode: {
    type: String,
    required: true,
    trim: true
  }, // e.g., "Dersler", "Projeler", "Finans", or "*" for wildcard
  canView: { type: Boolean, default: true },
  canCreate: { type: Boolean, default: false },
  canUpdate: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: false },
  canImport: { type: Boolean, default: false },
  canExport: { type: Boolean, default: false },
  canApprove: { type: Boolean, default: false }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Kullanıcı adı ve soyadı zorunludur'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'E-posta adresi zorunludur'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Lütfen geçerli bir e-posta adresi giriniz']
  },
  password: {
    type: String,
    required: [true, 'Şifre zorunludur'],
    minlength: [6, 'Şifre en az 6 karakter olmalıdır'],
    select: false
  },
  role: {
    type: String,
    enum: {
      values: ['ADMIN', 'DEPT_USER', 'REVIEWER'],
      message: 'Geçersiz rol: {VALUE}'
    },
    default: 'DEPT_USER'
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: function() {
      return this.role !== 'ADMIN';
    }
  },
  departmentScope: {
    type: {
      type: String,
      enum: ['OWN_DEPT', 'CUSTOM', 'ALL'],
      default: 'OWN_DEPT'
    },
    departments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    }]
  },
  tablePermissions: {
    type: [TablePermissionSchema],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

UserSchema.index({ role: 1 });
UserSchema.index({ departmentId: 1 });

// Hash password before saving if modified (skip if already a valid bcrypt hash)
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  if (typeof this.password === 'string' && /^\$2[aby]\$\d{2}\$/.test(this.password)) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method: compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    throw new Error('Password field not selected in query');
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method: verify table permission
UserSchema.methods.hasTablePermission = function(templateCode, action) {
  if (this.role === 'ADMIN') return true;

  const targetCode = (templateCode || '').toUpperCase().trim();

  // 1. Wildcard check
  const wildcardPerm = this.tablePermissions.find(p => p.templateCode === '*');
  if (wildcardPerm && wildcardPerm[action] === true) return true;

  // 2. Specific table check
  const specificPerm = this.tablePermissions.find(p => (p.templateCode || '').toUpperCase().trim() === targetCode);
  if (specificPerm && specificPerm[action] === true) return true;

  return false;
};

module.exports = mongoose.model('User', UserSchema);
