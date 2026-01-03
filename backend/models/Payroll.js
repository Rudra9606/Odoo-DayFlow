const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
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

  payPeriod: {
    startDate: {
      type: Date,
      required: [true, 'Pay period start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'Pay period end date is required']
    }
  },

  payDate: {
    type: Date,
    required: [true, 'Pay date is required']
  },

  // Basic Salary Information
  basicSalary: {
    type: Number,
    required: [true, 'Basic salary is required'],
    min: [0, 'Basic salary cannot be negative']
  },

  // Earnings
  earnings: {
    overtime: {
      hours: { type: Number, default: 0 },
      rate: { type: Number, default: 0 },
      amount: { type: Number, default: 0 }
    },
    bonus: {
      type: Number,
      default: 0
    },
    allowances: {
      hra: { type: Number, default: 0 }, // House Rent Allowance
      conveyance: { type: Number, default: 0 },
      medical: { type: Number, default: 0 },
      lta: { type: Number, default: 0 }, // Leave Travel Allowance
      other: { type: Number, default: 0 }
    },
    reimbursements: {
      type: Number,
      default: 0
    }
  },

  // Deductions
  deductions: {
    tax: {
      incomeTax: { type: Number, default: 0 },
      professionalTax: { type: Number, default: 0 }
    },
    providentFund: {
      employee: { type: Number, default: 0 },
      employer: { type: Number, default: 0 }
    },
    insurance: {
      type: Number,
      default: 0
    },
    loanRepayment: {
      type: Number,
      default: 0
    },
    other: {
      type: Number,
      default: 0
    }
  },

  // Calculated Totals
  grossEarnings: {
    type: Number,
    default: 0
  },

  netPay: {
    type: Number,
    default: 0
  },

  // Payment Information
  paymentMethod: {
    type: String,
    enum: ['bank-transfer', 'cheque', 'cash', 'direct-deposit'],
    default: 'bank-transfer'
  },

  paymentStatus: {
    type: String,
    enum: ['pending', 'processed', 'paid', 'failed', 'cancelled'],
    default: 'pending'
  },

  paymentReference: {
    type: String,
    trim: true
  },

  paidAt: Date,

  // Bank Details
  bankDetails: {
    accountNumber: String,
    bankName: String,
    ifscCode: String,
    branch: String
  },

  // Tax Information
  taxDetails: {
    panNumber: String,
    taxSlab: String,
    taxableIncome: Number,
    taxDeducted: Number
  },

  // Attendance Summary for this period
  attendanceSummary: {
    totalDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 }
  },

  // Status and Approval
  status: {
    type: String,
    enum: ['draft', 'pending-approval', 'approved', 'processed', 'paid'],
    default: 'draft'
  },

  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },

  approvedAt: Date,

  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },

  processedAt: Date,

  // Notes and Comments
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },

  // Audit Trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Creator is required']
  },

  // For recurring payroll
  isRecurring: {
    type: Boolean,
    default: true
  },

  frequency: {
    type: String,
    enum: ['weekly', 'bi-weekly', 'monthly', 'quarterly'],
    default: 'monthly'
  }
}, {
  timestamps: true
});

// Indexes
payrollSchema.index({ employee: 1, 'payPeriod.startDate': 1, 'payPeriod.endDate': 1 }, { unique: true });
payrollSchema.index({ payDate: 1 });
payrollSchema.index({ status: 1 });
payrollSchema.index({ paymentStatus: 1 });

// Virtual for total earnings
payrollSchema.virtual('totalEarnings').get(function() {
  return this.grossEarnings + this.earnings.reimbursements;
});

// Virtual for total deductions
payrollSchema.virtual('totalDeductions').get(function() {
  return this.deductions.tax.incomeTax +
         this.deductions.tax.professionalTax +
         this.deductions.providentFund.employee +
         this.deductions.insurance +
         this.deductions.loanRepayment +
         this.deductions.other;
});

// Pre-save middleware to calculate totals
payrollSchema.pre('save', function(next) {
  // Calculate gross earnings
  this.grossEarnings =
    this.basicSalary +
    this.earnings.overtime.amount +
    this.earnings.bonus +
    this.earnings.allowances.hra +
    this.earnings.allowances.conveyance +
    this.earnings.allowances.medical +
    this.earnings.allowances.lta +
    this.earnings.allowances.other;

  // Calculate net pay
  this.netPay = this.grossEarnings - this.totalDeductions;

  next();
});

// Static method to generate payroll for all employees
payrollSchema.statics.generateMonthlyPayroll = async function(payPeriod, payDate) {
  const Employee = mongoose.model('Employee');
  const Attendance = mongoose.model('Attendance');

  const employees = await Employee.find({ isActive: true });

  const payrollRecords = [];

  for (const employee of employees) {
    // Get attendance summary for the period
    const attendanceSummary = await Attendance.aggregate([
      {
        $match: {
          employee: employee._id,
          date: { $gte: payPeriod.startDate, $lte: payPeriod.endDate }
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
          leaveDays: {
            $sum: { $cond: [{ $in: ['$status', ['on-leave', 'half-day']] }, 1, 0] }
          },
          overtimeHours: { $sum: '$overtimeHours' }
        }
      }
    ]);

    const attendance = attendanceSummary[0] || {
      totalDays: 0,
      presentDays: 0,
      absentDays: 0,
      leaveDays: 0,
      overtimeHours: 0
    };

    // Calculate overtime pay (assuming 1.5x rate)
    const overtimeRate = employee.salary / (30 * 8) * 1.5; // Daily rate / 8 hours * 1.5
    const overtimeAmount = attendance.overtimeHours * overtimeRate;

    // Create payroll record
    const payroll = new this({
      employee: employee._id,
      payPeriod,
      payDate,
      basicSalary: employee.salary,
      earnings: {
        overtime: {
          hours: attendance.overtimeHours,
          rate: overtimeRate,
          amount: overtimeAmount
        }
      },
      attendanceSummary: attendance,
      createdBy: employee._id // Assuming HR creates it, but using employee for now
    });

    payrollRecords.push(payroll);
  }

  return payrollRecords;
};

// Static method to get payroll summary
payrollSchema.statics.getPayrollSummary = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        'payPeriod.startDate': { $gte: startDate },
        'payPeriod.endDate': { $lte: endDate },
        status: { $in: ['processed', 'paid'] }
      }
    },
    {
      $group: {
        _id: null,
        totalPayrolls: { $sum: 1 },
        totalGrossPay: { $sum: '$grossEarnings' },
        totalDeductions: { $sum: '$totalDeductions' },
        totalNetPay: { $sum: '$netPay' },
        averageNetPay: { $avg: '$netPay' }
      }
    }
  ]);
};

module.exports = mongoose.model('Payroll', payrollSchema);
