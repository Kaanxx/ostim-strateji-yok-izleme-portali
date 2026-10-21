const mongoose = require('mongoose');

const PeriodDeadlineSchema = new mongoose.Schema({
  period: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  templateCode: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null,
    index: true
  },
  deadline: {
    type: Date,
    required: true
  },
  remarks: {
    type: String,
    default: ''
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  collection: 'period_deadlines'
});

PeriodDeadlineSchema.index(
  { period: 1, templateCode: 1, departmentId: 1 },
  { unique: true }
);

module.exports = mongoose.model('PeriodDeadline', PeriodDeadlineSchema);
