const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
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

  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },

  checkIn: {
    time: {
      type: Date,
      required: [true, 'Check-in time is required']
    },
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    method: {
      type: String,
      enum: ['web', 'mobile', 'biometric', 'manual'],
      default: 'web'
    },
    ipAddress: String,
    deviceInfo: {
      userAgent: String,
      platform: String
    }
  },

  checkOut: {
    time: Date,
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    method: {
      type: String,
      enum: ['web', 'mobile', 'biometric', 'manual']
    },
    ipAddress: String,
    deviceInfo: {
      userAgent: String,
      platform: String
    }
  },

  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day', 'on-leave'],
    required: [true, 'Attendance status is required'],
    default: 'present'
  },

  workHours: {
    type: Number,
    default: 0,
    min: [0, 'Work hours cannot be negative']
  },

  workHoursFormatted: {
    type: String,
    default: '00:00:00'
  },

  overtimeHours: {
    type: Number,
    default: 0,
    min: [0, 'Overtime hours cannot be negative']
  },

  overtimeHoursFormatted: {
    type: String,
    default: '00:00:00'
  },

  breakTime: {
    total: { type: Number, default: 0 }, // in minutes
    breaks: [{
      startTime: Date,
      endTime: Date,
      duration: Number // in minutes
    }]
  },

  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },

  approved: {
    type: Boolean,
    default: false
  },

  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Changed from 'Employee' to 'User'
  },

  approvedAt: Date,

  // For late arrivals or early departures
  lateMinutes: {
    type: Number,
    default: 0,
    min: [0, 'Late minutes cannot be negative']
  },

  earlyDepartureMinutes: {
    type: Number,
    default: 0,
    min: [0, 'Early departure minutes cannot be negative']
  },

  // Remote work indicator
  isRemote: {
    type: Boolean,
    default: false
  },

  // Location verification
  locationVerified: {
    type: Boolean,
    default: false
  },

  // Shift information
  shift: {
    name: String,
    startTime: String, // HH:MM format
    endTime: String,   // HH:MM format
    timezone: String
  }
}, {
  timestamps: true
});

// Compound indexes for better performance
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ approved: 1 });

// Virtual for total hours worked including overtime
attendanceSchema.virtual('totalHours').get(function() {
  return this.workHours + this.overtimeHours;
});

// Virtual for attendance percentage (for reporting)
attendanceSchema.virtual('attendancePercentage').get(function() {
  if (this.status === 'present') return 100;
  if (this.status === 'half-day') return 50;
  if (this.status === 'absent' || this.status === 'on-leave') return 0;
  return 0;
});

// Pre-save middleware to calculate work hours
attendanceSchema.pre('save', function(next) {
  if (this.checkIn && this.checkIn.time && this.checkOut && this.checkOut.time) {
    const checkInTime = new Date(this.checkIn.time);
    const checkOutTime = new Date(this.checkOut.time);

    // Calculate total time in milliseconds
    const totalTimeMs = checkOutTime - checkInTime;

    // Convert to hours
    const totalHours = totalTimeMs / (1000 * 60 * 60);

    // Subtract break time (convert minutes to hours)
    const breakHours = (this.breakTime?.total || 0) / 60;

    this.workHours = Math.max(0, totalHours - breakHours);

    // Calculate overtime (assuming 8 hours is standard)
    const standardHours = 8;
    this.overtimeHours = Math.max(0, this.workHours - standardHours);

    // Helper function to convert decimal hours to HH:MM:SS
    const formatHours = (hours) => {
      if (!hours || hours <= 0) return '00:00:00';
      const h = Math.floor(hours);
      const m = Math.floor((hours - h) * 60);
      const s = Math.floor(((hours - h) * 60 - m) * 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Store formatted time strings
    this.workHoursFormatted = formatHours(this.workHours);
    this.overtimeHoursFormatted = formatHours(this.overtimeHours);
  }

  next();
});

// Static method to get attendance summary for an employee
attendanceSchema.statics.getEmployeeAttendanceSummary = function(employeeId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        employee: mongoose.Types.ObjectId(employeeId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalDays: { $sum: 1 },
        presentDays: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
        },
        absentDays: {
          $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
        },
        lateDays: {
          $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
        },
        totalWorkHours: { $sum: '$workHours' },
        totalOvertimeHours: { $sum: '$overtimeHours' },
        averageWorkHours: { $avg: '$workHours' }
      }
    }
  ]);
};

// Static method to get department attendance
attendanceSchema.statics.getDepartmentAttendance = function(department, startDate, endDate) {
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
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$employeeInfo._id',
        employeeName: { $first: '$employeeInfo.fullName' },
        totalDays: { $sum: 1 },
        presentDays: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
        },
        absentDays: {
          $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
        },
        lateDays: {
          $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        employeeName: 1,
        totalDays: 1,
        presentDays: 1,
        absentDays: 1,
        lateDays: 1,
        attendancePercentage: {
          $multiply: [{ $divide: ['$presentDays', '$totalDays'] }, 100]
        }
      }
    },
    { $sort: { attendancePercentage: -1 } }
  ]);
};

module.exports = mongoose.model('Attendance', attendanceSchema);
