const mongoose = require('mongoose');

/**
 * LeaveRequest Model
 * Simplified model for leave requests with userId reference
 */
const leaveRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Make optional since we might not always have userId
  },
  
  // Deprecated: employee field kept for backward compatibility
  // Now we use userId which points to User model
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Changed from Employee to User
  },
  
  type: {
    type: String,
    required: [true, 'Leave type is required'],
    enum: ['Vacation', 'Sick Leave', 'Casual Leave', 'Personal', 'Emergency', 'Unpaid'],
    default: 'Vacation'
  },
  
  from: {
    type: Date,
    required: [true, 'Start date is required']
  },
  
  to: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value >= this.from;
      },
      message: 'End date must be after or equal to start date'
    }
  },
  
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
    default: 'Pending'
  },
  
  approverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  comments: {
    type: String,
    maxlength: [500, 'Comments cannot exceed 500 characters']
  },
  
  // Store user email for easy filtering
  email: String,
  userEmail: String,
  
  // Audit fields
  approvedAt: Date,
  rejectedAt: Date
  
}, {
  timestamps: true
});

// Indexes for better performance
leaveRequestSchema.index({ userId: 1, createdAt: -1 });
leaveRequestSchema.index({ status: 1 });
leaveRequestSchema.index({ email: 1 });

// Virtual for duration
leaveRequestSchema.virtual('duration').get(function() {
  if (!this.from || !this.to) return 0;
  const days = Math.ceil((new Date(this.to) - new Date(this.from)) / (1000 * 60 * 60 * 24)) + 1;
  return days;
});

// Ensure virtuals are included when converting to JSON
leaveRequestSchema.set('toJSON', { virtuals: true });
leaveRequestSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
