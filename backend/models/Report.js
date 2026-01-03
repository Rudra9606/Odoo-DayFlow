const mongoose = require('mongoose');

/**
 * Report Model
 * Stores generated reports for historical reference
 */
const reportSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Report name is required'],
    trim: true
  },
  
  type: {
    type: String,
    required: [true, 'Report type is required'],
    enum: ['payroll', 'leave', 'attendance', 'employee', 'custom'],
    lowercase: true
  },
  
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Filters used to generate the report
  filters: {
    startDate: Date,
    endDate: Date,
    department: String,
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    status: String,
    leaveType: String,
    customFilters: mongoose.Schema.Types.Mixed
  },
  
  // Report data (stored as JSON)
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Report data is required']
  },
  
  // Summary statistics
  summary: {
    totalRecords: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    averageValue: { type: Number, default: 0 },
    customMetrics: mongoose.Schema.Types.Mixed
  },
  
  // Report metadata
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Report creator is required']
  },
  
  generatedAt: {
    type: Date,
    default: Date.now
  },
  
  format: {
    type: String,
    enum: ['json', 'pdf', 'excel', 'csv'],
    default: 'json'
  },
  
  // File storage (if exported)
  fileUrl: String,
  fileSize: Number,
  
  // Access control
  isPublic: {
    type: Boolean,
    default: false
  },
  
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    accessLevel: {
      type: String,
      enum: ['view', 'edit'],
      default: 'view'
    }
  }],
  
  // Report status
  status: {
    type: String,
    enum: ['draft', 'generated', 'archived', 'expired'],
    default: 'generated'
  },
  
  expiresAt: Date,
  
  // Audit trail
  lastAccessedAt: Date,
  accessCount: {
    type: Number,
    default: 0
  }
  
}, {
  timestamps: true
});

// Indexes for better query performance
reportSchema.index({ type: 1, generatedAt: -1 });
reportSchema.index({ generatedBy: 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ 'filters.startDate': 1, 'filters.endDate': 1 });

// Virtual for report age
reportSchema.virtual('age').get(function() {
  const now = new Date();
  const diff = now - this.generatedAt;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return days;
});

// Method to check if report is expired
reportSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return this.expiresAt < new Date();
};

// Method to record access
reportSchema.methods.recordAccess = function() {
  this.lastAccessedAt = new Date();
  this.accessCount += 1;
  return this.save();
};

// Ensure virtuals are included
reportSchema.set('toJSON', { virtuals: true });
reportSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Report', reportSchema);
