const Payroll = require('../models/Payroll');
const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');
const User = require('../models/User'); // Changed from Employee to User

/**
 * Generate payroll summary report
 * @route POST /api/reports/payroll-summary
 * @access Protected (Admin, HR Officer, Payroll Officer)
 */
exports.generatePayrollSummary = async (req, res) => {
  try {
    const { startDate, endDate, department } = req.body;

    // Build filter
    const filter = {};
    if (startDate && endDate) {
      filter['payPeriod.startDate'] = { $gte: new Date(startDate) };
      filter['payPeriod.endDate'] = { $lte: new Date(endDate) };
    }

    // Get payroll records
    let payrollRecords = await Payroll.find(filter)
      .populate('employee', 'firstName lastName department employeeId');

    // Filter by department if specified
    if (department) {
      payrollRecords = payrollRecords.filter(p => p.employee?.department === department);
    }

    // Calculate summary
    const summary = {
      totalEmployees: payrollRecords.length,
      totalGrossEarnings: payrollRecords.reduce((sum, p) => sum + (p.grossEarnings || 0), 0),
      totalNetPay: payrollRecords.reduce((sum, p) => sum + (p.netPay || 0), 0),
      totalDeductions: payrollRecords.reduce((sum, p) => {
        const deductions = p.deductions || {};
        const tax = (deductions.tax?.incomeTax || 0) + (deductions.tax?.professionalTax || 0);
        const pf = deductions.providentFund?.employee || 0;
        const other = deductions.insurance || 0 + deductions.loanRepayment || 0 + deductions.other || 0;
        return sum + tax + pf + other;
      }, 0),
      byDepartment: {}
    };

    // Group by department
    payrollRecords.forEach(record => {
      const dept = record.employee?.department || 'Unknown';
      if (!summary.byDepartment[dept]) {
        summary.byDepartment[dept] = {
          count: 0,
          totalGross: 0,
          totalNet: 0
        };
      }
      summary.byDepartment[dept].count++;
      summary.byDepartment[dept].totalGross += record.grossEarnings || 0;
      summary.byDepartment[dept].totalNet += record.netPay || 0;
    });

    res.json({
      success: true,
      report: {
        title: 'Payroll Summary Report',
        type: 'payroll-summary',
        period: { startDate, endDate },
        department,
        generatedAt: new Date(),
        summary,
        records: payrollRecords
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
 * Generate attendance report
 * @route POST /api/reports/attendance
 * @access Protected (Admin, HR Officer)
 */
exports.generateAttendanceReport = async (req, res) => {
  try {
    const { startDate, endDate, department, employeeId } = req.body;

    // Build filter
    const filter = {};
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (employeeId) filter.employee = employeeId;

    // Get attendance records
    let attendanceRecords = await Attendance.find(filter)
      .populate('employee', 'firstName lastName department employeeId');

    // Filter by department if specified
    if (department) {
      attendanceRecords = attendanceRecords.filter(a => a.employee?.department === department);
    }

    // Calculate summary
    const summary = {
      totalRecords: attendanceRecords.length,
      present: attendanceRecords.filter(a => a.status === 'present').length,
      absent: attendanceRecords.filter(a => a.status === 'absent').length,
      late: attendanceRecords.filter(a => a.status === 'late').length,
      halfDay: attendanceRecords.filter(a => a.status === 'half-day').length,
      averageWorkHours: attendanceRecords.reduce((sum, a) => sum + (a.workHours || 0), 0) / (attendanceRecords.length || 1),
      attendanceRate: ((attendanceRecords.filter(a => a.status === 'present').length / (attendanceRecords.length || 1)) * 100).toFixed(2) + '%'
    };

    res.json({
      success: true,
      report: {
        title: 'Attendance Report',
        type: 'attendance',
        period: { startDate, endDate },
        department,
        generatedAt: new Date(),
        summary,
        records: attendanceRecords
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
 * Generate leave report
 * @route POST /api/reports/leave
 * @access Protected (Admin, HR Officer)
 */
exports.generateLeaveReport = async (req, res) => {
  try {
    const { startDate, endDate, department, status } = req.body;

    // Build filter
    const filter = {};
    if (startDate && endDate) {
      filter.startDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (status) filter.status = status;

    // Get leave records
    let leaveRecords = await Leave.find(filter)
      .populate('employee', 'firstName lastName department employeeId')
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName');

    // Filter by department if specified
    if (department) {
      leaveRecords = leaveRecords.filter(l => l.employee?.department === department);
    }

    // Calculate summary
    const summary = {
      totalLeaves: leaveRecords.length,
      totalDays: leaveRecords.reduce((sum, l) => sum + (l.duration || 0), 0),
      approved: leaveRecords.filter(l => l.status === 'approved').length,
      pending: leaveRecords.filter(l => l.status === 'pending').length,
      rejected: leaveRecords.filter(l => l.status === 'rejected').length,
      byType: {}
    };

    // Group by leave type
    leaveRecords.forEach(record => {
      const type = record.leaveType || 'Unknown';
      if (!summary.byType[type]) {
        summary.byType[type] = { count: 0, days: 0 };
      }
      summary.byType[type].count++;
      summary.byType[type].days += record.duration || 0;
    });

    res.json({
      success: true,
      report: {
        title: 'Leave Report',
        type: 'leave',
        period: { startDate, endDate },
        department,
        generatedAt: new Date(),
        summary,
        records: leaveRecords
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
 * Generate employee report
 * @route POST /api/reports/employee
 * @access Protected (Admin, HR Officer)
 */
exports.generateEmployeeReport = async (req, res) => {
  try {
    const { department, status } = req.body;

    // Build filter
    const filter = {};
    if (department) filter.department = department;
    if (status) filter.status = status;

    // Get employees
    const employees = await Employee.find(filter)
      .select('firstName lastName email employeeId department designation status hireDate salary leaveBalance');

    // Calculate summary
    const summary = {
      totalEmployees: employees.length,
      byDepartment: {},
      byStatus: {},
      totalSalary: employees.reduce((sum, e) => sum + (e.salary?.basic || e.basicSalary || 0), 0)
    };

    // Group by department
    employees.forEach(emp => {
      const dept = emp.department || 'Unknown';
      const stat = emp.status || 'Unknown';
      
      summary.byDepartment[dept] = (summary.byDepartment[dept] || 0) + 1;
      summary.byStatus[stat] = (summary.byStatus[stat] || 0) + 1;
    });

    res.json({
      success: true,
      report: {
        title: 'Employee Report',
        type: 'employee',
        generatedAt: new Date(),
        summary,
        records: employees
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
 * Get all reports (for listing)
 * @route GET /api/reports
 * @access Protected
 */
exports.getReports = async (req, res) => {
  try {
    // This is a simple implementation - you could store reports in a Report model
    res.json({
      success: true,
      message: 'Reports endpoint - use specific report generation endpoints',
      availableReports: [
        { type: 'payroll-summary', endpoint: '/api/reports/payroll-summary', method: 'POST' },
        { type: 'attendance', endpoint: '/api/reports/attendance', method: 'POST' },
        { type: 'leave', endpoint: '/api/reports/leave', method: 'POST' },
        { type: 'employee', endpoint: '/api/reports/employee', method: 'POST' }
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};
