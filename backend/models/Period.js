const mongoose = require('mongoose');

const PeriodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    example: '2025-2026'
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    example: '2025-2026'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  defaultDeadline: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false,
    index: true
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  collection: 'periods'
});

module.exports = mongoose.model('Period', PeriodSchema);
