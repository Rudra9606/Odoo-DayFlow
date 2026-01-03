const Payroll = require('../models/Payroll');
const User = require('../models/User'); // Changed from Employee to User
const Attendance = require('../models/Attendance');

/**
 * Get all payroll records with filters
 * @route GET /api/payroll
 * @access Protected (Admin, Payroll Officer)
 */
exports.getPayroll = async (req, res) => {
  try {
    const {
      employeeId,
      month,
      year,
      status,
      page = 1,
      limit = 50,
      sortBy = 'payDate',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    
    if (employeeId) filter.employee = employeeId;
    if (status) filter.paymentStatus = status;
    
    if (month || year) {
      filter.payPeriod = filter.payPeriod || {};
      if (month) {
        const monthNum = parseInt(month) - 1;
        filter.payPeriod.startDate = {
          $gte: new Date(year || new Date().getFullYear(), monthNum, 1),
          $lt: new Date(year || new Date().getFullYear(), monthNum + 1, 1)
        };
      }
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query
    const payrolls = await Payroll.find(filter)
      .populate('employee', 'firstName lastName email department employeeId')
      .populate('processedBy', 'firstName lastName')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Payroll.countDocuments(filter);

    // Calculate summary stats
    const summary = await Payroll.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          totalGross: { $sum: '$grossEarnings' },
          totalNet: { $sum: '$netPay' },
          paid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] } },
          processing: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'processing'] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      count: payrolls.length,
      total,
      payrolls,
      summary: summary[0] || {},
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

/**
 * Get payroll by ID
 * @route GET /api/payroll/:id
 * @access Protected
 */
exports.getPayrollById = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employee', 'firstName lastName email department employeeId basicSalary')
      .populate('processedBy', 'firstName lastName');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    res.json({
      success: true,
      payroll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

/**
 * Generate payroll for employee(s)
 * @route POST /api/payroll/generate
 * @access Protected (Admin, Payroll Officer)
 */
exports.processPayroll = async (req, res) => {
  try {
    const { employee, startDate, endDate } = req.body;

    // Validate required fields
    if (!employee || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'User, start date, and end date are required'
      });
    }

    // Get user (employee) details
    const emp = await User.findById(employee);
    if (!emp) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if payroll already exists for this period
    const existingPayroll = await Payroll.findOne({
      employee,
      'payPeriod.startDate': new Date(startDate),
      'payPeriod.endDate': new Date(endDate)
    });

    if (existingPayroll) {
      return res.status(400).json({
        success: false,
        message: 'Payroll already processed for this period'
      });
    }

    // Calculate payroll
    const basicSalary = emp.salary?.basic || emp.basicSalary || 0;
    const hra = (basicSalary * 0.4); // 40% HRA
    const conveyance = 1600;
    const medical = 1250;
    
    // Calculate deductions
    const pfEmployee = (basicSalary * 0.12); // 12% PF
    const pfEmployer = (basicSalary * 0.12);
    const incomeTax = (basicSalary * 0.1); // 10% tax (simplified)
    
    const grossEarnings = basicSalary + hra + conveyance + medical;
    const totalDeductions = pfEmployee + incomeTax;
    const netPay = grossEarnings - totalDeductions;

    // Create payroll record
    const payroll = await Payroll.create({
      employee,
      payPeriod: {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      },
      payDate: new Date(endDate),
      basicSalary,
      earnings: {
        allowances: {
          hra,
          conveyance,
          medical
        }
      },
      deductions: {
        providentFund: {
          employee: pfEmployee,
          employer: pfEmployer
        },
        tax: {
          incomeTax
        }
      },
      grossEarnings,
      netPay,
      paymentStatus: 'processing',
      processedBy: req.user._id
    });

    const populatedPayroll = await Payroll.findById(payroll._id)
      .populate('employee', 'firstName lastName email employeeId');

    res.status(201).json({
      success: true,
      message: 'Payroll generated successfully',
      payroll: populatedPayroll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

/**
 * Update payroll record
 * @route PUT /api/payroll/:id
 * @access Protected (Admin, Payroll Officer)
 */
exports.updatePayroll = async (req, res) => {
  try {
    const { netPay, paymentStatus, notes } = req.body;

    const payroll = await Payroll.findById(req.params.id);

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    // Update fields
    if (netPay !== undefined) payroll.netPay = netPay;
    if (paymentStatus) payroll.paymentStatus = paymentStatus;
    if (notes) payroll.notes = notes;

    if (paymentStatus === 'paid') {
      payroll.paidDate = new Date();
    }

    await payroll.save();

    const updatedPayroll = await Payroll.findById(payroll._id)
      .populate('employee', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Payroll updated successfully',
      payroll: updatedPayroll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

/**
 * Delete payroll record
 * @route DELETE /api/payroll/:id
 * @access Protected (Admin only)
 */
exports.deletePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }

    await payroll.deleteOne();

    res.json({
      success: true,
      message: 'Payroll record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

/**
 * Get payslips for an employee
 * @route GET /api/payroll/payslips/:employeeId
 * @access Protected
 */
exports.getPayslips = async (req, res) => {
  try {
    const payslips = await Payroll.find({ employee: req.params.employeeId })
      .sort({ payDate: -1 })
      .populate('employee', 'firstName lastName email employeeId');

    res.json({
      success: true,
      count: payslips.length,
      payslips
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

/**
 * Get payroll statistics for dashboard
 * @route GET /api/payroll/stats
 * @access Protected (Payroll Officer, Admin)
 */
exports.getPayrollStats = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    // Total employees
    const totalEmployees = await User.countDocuments({ role: { $in: ['Employee', 'HR Officer', 'Payroll Officer', 'Admin'] } });

    // Payruns completed (processed payrolls in current month)
    const payruns = await Payroll.countDocuments({
      paymentStatus: { $in: ['processed', 'paid'] },
      payDate: {
        $gte: new Date(currentYear, currentMonth, 1),
        $lt: new Date(currentYear, currentMonth + 1, 1)
      }
    });

    // Pending leave approvals
    const Leave = require('../models/LeaveRequest');
    const pendingLeaves = await Leave.countDocuments({ status: 'pending' });

    // Current month payroll (sum of all net pay for current month)
    const payrollSum = await Payroll.aggregate([
      {
        $match: {
          payDate: {
            $gte: new Date(currentYear, currentMonth, 1),
            $lt: new Date(currentYear, currentMonth + 1, 1)
          }
        }
      },
      {
        $group: {
          _id: null,
          totalNetPay: { $sum: '$netPay' },
          totalGross: { $sum: '$grossEarnings' }
        }
      }
    ]);

    const currentMonthPayroll = payrollSum[0]?.totalNetPay || 0;

    res.json({
      success: true,
      stats: {
        totalEmployees,
        payruns,
        pendingLeaves,
        currentMonthPayroll: Math.round(currentMonthPayroll)
      }
    });
  } catch (error) {
    console.error('Error fetching payroll stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};