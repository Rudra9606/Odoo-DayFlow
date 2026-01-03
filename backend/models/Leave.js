const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  // Reference to User (which contains employee data)
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Changed from 'Employee' to 'User'
    required: [true, 'User reference is required']
  },
  // Alternate field name for clarity
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  leaveType: {
    type: String,
    required: [true, 'Leave type is required'],
    enum: ['annual', 'sick', 'personal', 'maternity', 'paternity', 'emergency', 'unpaid', 'other'],
    default: 'annual'
  },

  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },

  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value >= this.startDate;
      },
      message: 'End date must be after or equal to start date'
    }
  },

  duration: {
    type: Number,
    required: [true, 'Leave duration is required'],
    min: [0.5, 'Minimum leave duration is 0.5 days']
  },

  reason: {
    type: String,
    required: [true, 'Leave reason is required'],
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },

  appliedDate: {
    type: Date,
    default: Date.now
  },

  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Changed from 'Employee' to 'User'
  },

  approvedAt: Date,

  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Changed from 'Employee' to 'User'
  },

  rejectedAt: Date,

  rejectionReason: {
    type: String,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },

  // For half-day leaves
  isHalfDay: {
    type: Boolean,
    default: false
  },

  halfDayType: {
    type: String,
    enum: ['first-half', 'second-half'],
    required: function() {
      return this.isHalfDay;
    }
  },

  // Emergency leave indicator
  isEmergency: {
    type: Boolean,
    default: false
  },

  // Supporting documents
  documents: [{
    name: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Comments and notes
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Work handover information
  handover: {
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    notes: String,
    completed: {
      type: Boolean,
      default: false
    }
  },

  // Auto-approval for certain leave types
  autoApproved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
leaveSchema.index({ employee: 1, startDate: 1 });
leaveSchema.index({ status: 1 });
leaveSchema.index({ leaveType: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });

// Virtual for leave period
leaveSchema.virtual('leavePeriod').get(function() {
  return `${this.startDate.toDateString()} - ${this.endDate.toDateString()}`;
});

// Pre-save middleware to calculate duration
leaveSchema.pre('save', function(next) {
  if (this.startDate && this.endDate) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);

    // Calculate business days (excluding weekends)
    let businessDays = 0;
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Saturday or Sunday
        businessDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    this.duration = this.isHalfDay ? 0.5 : businessDays;
  }

  next();
});

// Static method to check leave balance
leaveSchema.statics.checkLeaveBalance = async function(employeeId, leaveType, requestedDays) {
  const Employee = mongoose.model('Employee');

  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw new Error('Employee not found');
  }

  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear, 11, 31);

  // Calculate used leave days for this year
  const usedLeave = await this.aggregate([
    {
      $match: {
        employee: mongoose.Types.ObjectId(employeeId),
        leaveType: leaveType,
        status: 'approved',
        startDate: { $gte: yearStart, $lte: yearEnd }
      }
    },
    {
      $group: {
        _id: null,
        totalUsed: { $sum: '$duration' }
      }
    }
  ]);

  const usedDays = usedLeave.length > 0 ? usedLeave[0].totalUsed : 0;
  const availableBalance = employee.leaveBalance[leaveType] || 0;
  const remainingBalance = availableBalance - usedDays;

  return {
    availableBalance,
    usedDays,
    remainingBalance,
    sufficient: remainingBalance >= requestedDays
  };
};

// Static method to get leave summary for employee
leaveSchema.statics.getEmployeeLeaveSummary = function(employeeId, year = new Date().getFullYear()) {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  return this.aggregate([
    {
      $match: {
        employee: mongoose.Types.ObjectId(employeeId),
        startDate: { $gte: yearStart, $lte: yearEnd }
      }
    },
    {
      $group: {
        _id: '$leaveType',
        totalDays: { $sum: '$duration' },
        approvedDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'approved'] }, '$duration', 0]
          }
        },
        pendingDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'pending'] }, '$duration', 0]
          }
        },
        rejectedDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'rejected'] }, '$duration', 0]
          }
        }
      }
    }
  ]);
};

// Static method to get department leave overview
leaveSchema.statics.getDepartmentLeaveOverview = function(department, startDate, endDate) {
  return this.aggregate([
    {
      $lookup: {
        from: 'employees',
        localField: 'employee',
        foreignField: '_id',
        as: 'employeeInfo'
      }
    },
    {
      $unwind: '$employeeInfo'
    },
    {
      $match: {
        'employeeInfo.department': department,
        'employeeInfo.isActive': true,
        startDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalDays: { $sum: '$duration' }
      }
    }
  ]);
};

module.exports = mongoose.model('Leave', leaveSchema);
