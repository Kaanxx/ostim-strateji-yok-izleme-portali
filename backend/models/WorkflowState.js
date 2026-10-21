const mongoose = require('mongoose');

const WorkflowHistorySchema = new mongoose.Schema({
  fromStatus: {
    type: String,
    enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REVISION_REQUESTED'],
    required: true
  },
  toStatus: {
    type: String,
    enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REVISION_REQUESTED'],
    required: true
  },
  action: {
    type: String,
    enum: ['SUBMIT', 'APPROVE', 'REVISE', 'REOPEN', 'RESET', 'AUTO_INIT'],
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedByName: { type: String, required: true },
  performedByEmail: { type: String, required: true },
  notes: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
}, { _id: true });

const WorkflowStateSchema = new mongoose.Schema({
  templateCode: {
    type: String,
    required: true,
    trim: true,
    index: true
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
    trim: true,
    index: true
  },
  status: {
    type: String,
    enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REVISION_REQUESTED'],
    default: 'DRAFT',
    required: true,
    index: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  submittedAt: {
    type: Date,
    default: null
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewNotes: {
    type: String,
    default: ''
  },
  history: [WorkflowHistorySchema]
}, {
  timestamps: true,
  collection: 'workflow_states'
});

WorkflowStateSchema.index({ templateCode: 1, departmentId: 1, period: 1 }, { unique: true });
WorkflowStateSchema.index({ status: 1, period: 1, departmentId: 1 });

module.exports = mongoose.model('WorkflowState', WorkflowStateSchema);
