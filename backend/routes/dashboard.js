const express = require('express');
const User = require('../models/User'); // Changed from Employee to User
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Payroll = require('../models/Payroll');

const router = express.Router();

// @route   GET /api/dashboard/overview
// @desc    Get dashboard overview statistics
// @access  Private
router.get('/overview', async (req, res) => {
  try {
    // Employee statistics (from User model)
    const totalEmployees = await User.countDocuments({ isActive: true });
    const departmentStats = await User.getDepartmentStats();

    // Attendance statistics (current month)
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: currentMonth, $lt: nextMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          presentCount: {
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
          },
          absentCount: {
            $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
          },
          lateCount: {
            $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
          }
        }
      }
    ]);

    // Leave statistics (current month)
    const leaveStats = await Leave.aggregate([
      {
        $match: {
          startDate: { $gte: currentMonth, $lt: nextMonth }
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

    // Recent activities (last 10)
    const recentAttendance = await Attendance.find()
      .populate('employee', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .limit(10);

    const recentLeaves = await Leave.find()
      .populate('employee', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .limit(10);

    // Combine and sort recent activities
    const recentActivities = [
      ...recentAttendance.map(attendance => ({
        type: 'attendance',
        action: attendance.checkOut ? 'checked out' : 'checked in',
        employee: attendance.employee,
        timestamp: attendance.createdAt,
        details: attendance.checkOut ? 'Check-out' : 'Check-in'
      })),
      ...recentLeaves.map(leave => ({
        type: 'leave',
        action: 'applied for leave',
        employee: leave.employee,
        timestamp: leave.createdAt,
        details: `${leave.leaveType} leave`
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);

    const overview = {
      employees: {
        total: totalEmployees,
        departments: departmentStats
      },
      attendance: attendanceStats[0] || {
        totalRecords: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0
      },
      leave: leaveStats.reduce((acc, stat) => {
        acc[stat._id] = { count: stat.count, totalDays: stat.totalDays };
        return acc;
      }, {}),
      recentActivities
    };

    res.json({
      success: true,
      data: { overview }
    });

  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving dashboard overview'
    });
  }
});

// @route   GET /api/dashboard/charts/attendance
// @desc    Get attendance chart data
// @access  Private
router.get('/charts/attendance', async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    let startDate, endDate;
    const now = new Date();

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        endDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const attendanceData = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: period === 'week' ? '%Y-%m-%d' : '%Y-%m-%d',
              date: '$date'
            }
          },
          present: {
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
          },
          absent: {
            $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
          },
          late: {
            $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
          },
          total: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        chartData: attendanceData,
        period: {
          startDate,
          endDate,
          type: period
        }
      }
    });

  } catch (error) {
    console.error('Attendance chart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving attendance chart data'
    });
  }
});

// @route   GET /api/dashboard/charts/payroll
// @desc    Get payroll chart data
// @access  Private
router.get('/charts/payroll', async (req, res) => {
  try {
    const { period = '6months' } = req.query;

    let startDate;
    const now = new Date();

    switch (period) {
      case '3months':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 6);
    }

    const payrollData = await Payroll.aggregate([
      {
        $match: {
          payDate: { $gte: startDate },
          status: { $in: ['processed', 'paid'] }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m',
              date: '$payDate'
            }
          },
          totalGrossPay: { $sum: '$grossEarnings' },
          totalDeductions: { $sum: '$totalDeductions' },
          totalNetPay: { $sum: '$netPay' },
          averageNetPay: { $avg: '$netPay' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        chartData: payrollData,
        period: {
          startDate,
          type: period
        }
      }
    });

  } catch (error) {
    console.error('Payroll chart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving payroll chart data'
    });
  }
});

// @route   GET /api/dashboard/alerts
// @desc    Get dashboard alerts and notifications
// @access  Private
router.get('/alerts', async (req, res) => {
  try {
    const alerts = [];

    // Check for pending leave approvals
    const pendingLeaves = await Leave.countDocuments({ status: 'pending' });
    if (pendingLeaves > 0) {
      alerts.push({
        type: 'warning',
        title: 'Pending Leave Approvals',
        message: `${pendingLeaves} leave application${pendingLeaves > 1 ? 's' : ''} awaiting approval`,
        action: 'Review Leaves',
        link: '/leaves'
      });
    }

    // Check for upcoming payroll
    const currentDate = new Date();
    const upcomingPayroll = await Payroll.countDocuments({
      payDate: { $gte: currentDate, $lte: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000) },
      status: { $nin: ['paid'] }
    });
    if (upcomingPayroll > 0) {
      alerts.push({
        type: 'info',
        title: 'Upcoming Payroll',
        message: `${upcomingPayroll} payroll${upcomingPayroll > 1 ? 's' : ''} due within 7 days`,
        action: 'Process Payroll',
        link: '/payroll'
      });
    }

    // Check for low attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttendance = await Attendance.find({ date: today });
    const totalEmployees = await Employee.countDocuments({ isActive: true });
    const attendanceRate = totalEmployees > 0 ? (todayAttendance.length / totalEmployees) * 100 : 0;

    if (attendanceRate < 80 && todayAttendance.length > 0) {
      alerts.push({
        type: 'error',
        title: 'Low Attendance Today',
        message: `Only ${attendanceRate.toFixed(1)}% attendance recorded today`,
        action: 'View Attendance',
        link: '/attendance'
      });
    }

    res.json({
      success: true,
      data: { alerts }
    });

  } catch (error) {
    console.error('Dashboard alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving dashboard alerts'
    });
  }
});

module.exports = router;
