const mongoose = require('mongoose');

const DepartmentTypeEnum = [
  'RECTORATE',
  'FACULTY',
  'MYO',
  'INSTITUTE',
  'ADMIN_UNIT',
  'RESEARCH_CENTER',
  'DEPARTMENT'
];

const DepartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Birim adı zorunludur'],
    trim: true,
    maxlength: 250
  },
  code: {
    type: String,
    required: [true, 'Birim kodu zorunludur'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 60,
    match: [/^[A-Z0-9_]+$/, 'Birim kodu yalnızca büyük harf, rakam ve alt çizgi içerebilir']
  },
  type: {
    type: String,
    required: [true, 'Birim türü zorunludur'],
    enum: {
      values: DepartmentTypeEnum,
      message: 'Geçersiz birim türü: {VALUE}'
    }
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  ancestors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    index: true
  }],
  description: {
    type: String,
    default: '',
    trim: true
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for fast lookup
DepartmentSchema.index({ parentId: 1, isActive: 1 });
DepartmentSchema.index({ type: 1, isActive: 1 });
DepartmentSchema.index({ ancestors: 1, isActive: 1 });

// Virtual populate for immediate children
DepartmentSchema.virtual('children', {
  ref: 'Department',
  localField: '_id',
  foreignField: 'parentId'
});

module.exports = mongoose.model('Department', DepartmentSchema);
