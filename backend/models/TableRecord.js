const mongoose = require('mongoose');

const TableRecordSchema = new mongoose.Schema({
  templateCode: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
    index: true
  },
  period: {
    type: String,
    required: true,
    index: true,
    trim: true // e.g. "2025-2026"
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    default: {}
  },
  rowNumber: {
    type: Number,
    index: true
  },
  fixedRowId: {
    type: String,
    default: null
  },
  isApproved: {
    type: Boolean,
    default: false,
    index: true
  },
  status: {
    type: String,
    enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REVISION_REQUESTED'],
    default: 'DRAFT',
    index: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
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
  timestamps: true,
  collection: 'table_records'
});

// Compound indexes for querying and sorting records
TableRecordSchema.index({ templateCode: 1, departmentId: 1, period: 1 });
TableRecordSchema.index({ templateCode: 1, period: 1 });
TableRecordSchema.index({ templateCode: 1, departmentId: 1, period: 1, rowNumber: 1 });

module.exports = mongoose.model('TableRecord', TableRecordSchema);
