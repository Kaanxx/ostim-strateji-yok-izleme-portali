const mongoose = require('mongoose');

const ColumnTypeEnum = [
  'text',
  'integer',
  'decimal',
  'date',
  'select',
  'multiselect',
  'formula',
  'url'
];

const ColumnSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    trim: true,
    match: [/^[a-zA-Z0-9_]+$/, 'Kolon anahtarı yalnızca harf, rakam ve alt çizgi içerebilir']
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ColumnTypeEnum,
    default: 'text'
  },
  required: {
    type: Boolean,
    default: false
  },
  options: [{
    type: String,
    trim: true
  }],
  min: {
    type: Number,
    default: null
  },
  max: {
    type: Number,
    default: null
  },
  pattern: {
    type: String,
    default: null
  },
  formulaExpression: {
    type: String,
    default: null
  },
  unit: {
    type: String,
    default: '',
    trim: true
  },
  placeholder: {
    type: String,
    default: ''
  },
  order: {
    type: Number,
    default: 0
  }
}, { _id: false });

const FixedRowDefSchema = new mongoose.Schema({
  rowIndex: {
    type: Number,
    required: true
  },
  rowKey: {
    type: String,
    required: true,
    trim: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  isReadonly: {
    type: Boolean,
    default: false
  },
  isSummary: {
    type: Boolean,
    default: false
  },
  formula: {
    type: String,
    default: null
  },
  customRules: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { _id: false });

const TemplateSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Şablon kodu zorunludur'],
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^[A-Z0-9_]+$/, 'Şablon kodu büyük harf, rakam ve alt çizgi içerebilir']
  },
  title: {
    type: String,
    required: [true, 'Şablon başlığı zorunludur'],
    trim: true,
    maxlength: 300
  },
  category: {
    type: String,
    required: [true, 'Kategori zorunludur'],
    trim: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['FIXED', 'DYNAMIC'],
    default: 'DYNAMIC'
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  columns: {
    type: [ColumnSchema],
    required: true,
    validate: {
      validator: (cols) => Array.isArray(cols) && cols.length > 0,
      message: 'Şablon en az bir kolon içermelidir'
    }
  },
  fixedRows: {
    type: [FixedRowDefSchema],
    default: []
  },
  dataStartRow: {
    type: Number,
    default: 1
  },
  excelTemplatePath: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isOfficialYOK: {
    type: Boolean,
    default: false,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

TemplateSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('Template', TemplateSchema);
