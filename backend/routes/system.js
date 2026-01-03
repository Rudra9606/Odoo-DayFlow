const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Payroll = require('../models/Payroll');
const LeaveRequest = require('../models/LeaveRequest');

/**
 * System Status Endpoint
 * Returns counts and sample data from all collections
 * Useful for debugging and verifying data is in MongoDB
 * @route GET /api/system/status
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      database: 'Connected',
      timestamp: new Date().toISOString(),
      collections: {}
    };

    // Users/Employees
    const userCount = await User.countDocuments();
    const userSample = await User.findOne().select('firstName lastName email role department');
    status.collections.users = {
      count: userCount,
      sample: userSample,
      roles: await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ])
    };

    // Attendance
    const attendanceCount = await Attendance.countDocuments();
    const attendanceSample = await Attendance.findOne().populate('employee', 'firstName lastName');
    status.collections.attendance = {
      count: attendanceCount,
      sample: attendanceSample
    };

    // Leaves
    const leaveCount = await Leave.countDocuments();
    const leaveSample = await Leave.findOne().populate('employee', 'firstName lastName');
    status.collections.leaves = {
      count: leaveCount,
      sample: leaveSample
    };

    // Leave Requests
    const leaveRequestCount = await LeaveRequest.countDocuments();
    const leaveRequestSample = await LeaveRequest.findOne();
    status.collections.leaveRequests = {
      count: leaveRequestCount,
      sample: leaveRequestSample
    };

    // Payroll
    const payrollCount = await Payroll.countDocuments();
    const payrollSample = await Payroll.findOne().populate('employee', 'firstName lastName');
    status.collections.payroll = {
      count: payrollCount,
      sample: payrollSample
    };

    res.json({
      success: true,
      message: 'All data is stored in MongoDB - No mock data!',
      data: status
    });

  } catch (error) {
    console.error('System status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system status',
      error: error.message
    });
  }
});

/**
 * Data Summary Endpoint
 * Returns high-level statistics
 * @route GET /api/system/summary
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = {
      totalUsers: await User.countDocuments(),
      activeUsers: await User.countDocuments({ isActive: true }),
      totalAttendance: await Attendance.countDocuments(),
      todayAttendance: await Attendance.countDocuments({
        date: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }),
      pendingLeaves: await Leave.countDocuments({ status: 'pending' }),
      totalPayroll: await Payroll.countDocuments(),
      departments: await User.aggregate([
        { $match: { department: { $ne: null } } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    };

    res.json({
      success: true,
      data: summary,
      message: '100% Dynamic Data from MongoDB'
    });

  } catch (error) {
    console.error('System summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system summary',
      error: error.message
    });
  }
});

module.exports = router;
