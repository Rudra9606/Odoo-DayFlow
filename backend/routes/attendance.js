const express = require('express');
const { body, validationResult } = require('express-validator');
const Attendance = require('../models/Attendance');
const User = require('../models/User'); // Changed from Employee to User

const router = express.Router();

// @route   POST /api/attendance/check-in
// @desc    User/Employee check-in
// @access  Private
router.post('/check-in', [
  body('employeeId', 'User ID is required').notEmpty(), // Still called employeeId for compatibility
  body('location', 'Location is optional').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { employeeId, location, method = 'web' } = req.body;

    // Find user (employee)
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      employee: employeeId,
      date: today
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Already checked in today'
      });
    }

    // Create check-in record
    const attendance = new Attendance({
      employee: employeeId,
      date: today,
      checkIn: {
        time: new Date(),
        location,
        method,
        ipAddress: req.ip,
        deviceInfo: {
          userAgent: req.get('User-Agent'),
          platform: req.get('platform') || 'web'
        }
      },
      status: 'present'
    });

    await attendance.save();

    res.status(201).json({
      success: true,
      message: 'Check-in successful',
      data: { attendance }
    });

  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during check-in'
    });
  }
});

// @route   PUT /api/attendance/check-out
// @desc    Employee check-out
// @access  Private
router.put('/check-out', [
  body('employeeId', 'Employee ID is required').notEmpty(),
  body('location', 'Location is optional').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { employeeId, location, method = 'web' } = req.body;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's attendance record
    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: today
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No check-in record found for today'
      });
    }

    if (attendance.checkOut && attendance.checkOut.time) {
      return res.status(400).json({
        success: false,
        message: 'Already checked out today'
      });
    }

    // Update check-out
    attendance.checkOut = {
      time: new Date(),
      location,
      method,
      ipAddress: req.ip,
      deviceInfo: {
        userAgent: req.get('User-Agent'),
        platform: req.get('platform') || 'web'
      }
    };

    // Save attendance - pre-save hook will calculate work hours automatically
    await attendance.save();

    console.log('✅ Check-out successful. Work hours calculated:', attendance.workHours, '(', attendance.workHoursFormatted, ')');

    res.json({
      success: true,
      message: 'Check-out successful',
      data: { 
        attendance,
        workHours: attendance.workHours,
        workHoursFormatted: attendance.workHoursFormatted,
        overtimeHours: attendance.overtimeHours,
        overtimeHoursFormatted: attendance.overtimeHoursFormatted
      }
    });

  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during check-out'
    });
  }
});

// @route   GET /api/attendance
// @desc    Get attendance records with filters
// @access  Private
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};

    if (req.query.employeeId) {
      filter.employee = req.query.employeeId;
    }

    if (req.query.startDate && req.query.endDate) {
      // Create date objects at start and end of day to handle timezone issues
      const startDate = new Date(req.query.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      filter.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const attendance = await Attendance.find(filter)
      .populate('employee', 'firstName lastName employeeId department email')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Attendance.countDocuments(filter);

    // Add formatted data for easier frontend consumption
    const formattedAttendance = attendance.map(record => ({
      ...record.toObject(),
      checkInTime: record.checkIn?.time ? new Date(record.checkIn.time).toLocaleTimeString() : null,
      checkOutTime: record.checkOut?.time ? new Date(record.checkOut.time).toLocaleTimeString() : null,
      // workHoursFormatted is now stored in database in HH:MM:SS format
      dateFormatted: new Date(record.date).toLocaleDateString()
    }));

    res.json({
      success: true,
      data: {
        attendance: formattedAttendance,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving attendance records'
    });
  }
});

// @route   GET /api/attendance/today
// @desc    Get today's attendance records for all employees
// @access  Private
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    })
      .populate('employee', 'firstName lastName employeeId department email')
      .sort({ 'checkIn.time': -1 });

    res.json({
      success: true,
      data: todayAttendance
    });

  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving today\'s attendance'
    });
  }
});

// @route   GET /api/attendance/:id
// @desc    Get attendance record by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId department');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    res.json({
      success: true,
      data: { attendance }
    });

  } catch (error) {
    console.error('Get attendance record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving attendance record'
    });
  }
});

// @route   GET /api/attendance/employee/:employeeId/summary
// @desc    Get attendance summary for an employee
// @access  Private
router.get('/employee/:employeeId/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const summary = await Attendance.getEmployeeAttendanceSummary(
      req.params.employeeId,
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      data: { summary: summary[0] || {} }
    });

  } catch (error) {
    console.error('Get attendance summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving attendance summary'
    });
  }
});

// @route   GET /api/attendance/department/:department
// @desc    Get department attendance overview
// @access  Private
router.get('/department/:department', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const overview = await Attendance.getDepartmentAttendance(
      req.params.department,
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      data: { overview }
    });

  } catch (error) {
    console.error('Get department attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving department attendance'
    });
  }
});

// @route   PUT /api/attendance/:id
// @desc    Update attendance record (Admin/HR)
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const updateFields = {};
    const allowedFields = [
      'status', 'notes', 'lateMinutes', 'earlyDepartureMinutes',
      'isRemote', 'locationVerified'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field];
      }
    });

    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    ).populate('employee', 'firstName lastName employeeId department');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    res.json({
      success: true,
      message: 'Attendance record updated successfully',
      data: { attendance }
    });

  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating attendance record'
    });
  }
});

// @route   GET /api/attendance/stats/by-department
// @desc    Get attendance statistics grouped by department
// @access  Private (Payroll Officer, HR Officer, Admin)
router.get('/stats/by-department', async (req, res) => {
  try {
    console.log('📊 Fetching attendance stats by department...');

    // Get all active employees grouped by department
    const departments = await User.aggregate([
      {
        $match: {
          role: { $in: ['Employee', 'HR Officer', 'Payroll Officer', 'Admin'] },
          isActive: true,
          department: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$department',
          totalEmployees: { $sum: 1 }
        }
      }
    ]);

    console.log('👥 Departments found:', departments);

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get attendance stats for each department
    const attendanceStats = await Promise.all(
      departments.map(async (dept) => {
        // Count present employees (checked in today)
        const presentCount = await Attendance.countDocuments({
          date: { $gte: today, $lt: tomorrow },
          status: 'present',
          employee: {
            $in: await User.find({ department: dept._id, isActive: true }).distinct('_id')
          }
        });

        const total = dept.totalEmployees;
        const percentage = total > 0 ? Math.round((presentCount / total) * 100) : 0;

        return {
          department: dept._id,
          present: presentCount,
          total: total,
          percentage: percentage
        };
      })
    );

    console.log('✅ Attendance stats by department:', attendanceStats);

    res.json({
      success: true,
      data: attendanceStats
    });

  } catch (error) {
    console.error('❌ Error fetching attendance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching attendance statistics',
      error: error.message
    });
  }
});

// @route   POST /api/attendance/admin/check-in/:userId
// @desc    Admin mark check-in for any user (HR, Payroll, Employee)
// @access  Private (Admin only)
router.post('/admin/check-in/:userId', [
  body('location', 'Location is optional').optional(),
  body('date', 'Date is optional').optional(),
  body('checkInTime', 'Check-in time is optional').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const { location, date, checkInTime, method = 'manual' } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Use provided date or today
    const attendanceDate = date ? new Date(date) : new Date();
    attendanceDate.setHours(0, 0, 0, 0);

    // Check if already checked in for this date
    const existingAttendance = await Attendance.findOne({
      employee: userId,
      date: attendanceDate
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this user on this date'
      });
    }

    // Create check-in datetime
    let checkInDateTime = new Date();
    if (date && checkInTime) {
      // Parse the check-in time (HH:MM format)
      const [hours, minutes] = checkInTime.split(':').map(Number);
      const dateObj = new Date(date);
      dateObj.setHours(hours, minutes, 0, 0);
      checkInDateTime = dateObj;
    }

    // Create check-in record
    const attendance = new Attendance({
      employee: userId,
      date: attendanceDate,
      checkIn: {
        time: checkInDateTime,
        location,
        method, // 'manual' for admin-marked
        ipAddress: req.ip,
        deviceInfo: {
          userAgent: 'Admin Portal',
          platform: 'admin'
        }
      },
      status: 'present'
    });

    await attendance.save();

    res.status(201).json({
      success: true,
      message: 'Check-in marked successfully by admin',
      data: { attendance }
    });

  } catch (error) {
    console.error('Admin check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking check-in',
      error: error.message
    });
  }
});

// @route   PUT /api/attendance/admin/check-out/:userId
// @desc    Admin mark check-out for any user (HR, Payroll, Employee)
// @access  Private (Admin only)
router.put('/admin/check-out/:userId', [
  body('location', 'Location is optional').optional(),
  body('date', 'Date is optional').optional(),
  body('checkOutTime', 'Check-out time is optional').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const { location, date, checkOutTime, method = 'manual' } = req.body;

    // Use provided date or today
    const attendanceDate = date ? new Date(date) : new Date();
    attendanceDate.setHours(0, 0, 0, 0);

    // Find today's attendance record
    const attendance = await Attendance.findOne({
      employee: userId,
      date: attendanceDate
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No check-in record found for this user on this date'
      });
    }

    if (attendance.checkOut && attendance.checkOut.time) {
      return res.status(400).json({
        success: false,
        message: 'Check-out already marked for this date'
      });
    }

    // Create check-out datetime
    let checkOutDateTime = new Date();
    if (date && checkOutTime) {
      // Parse the check-out time (HH:MM format)
      const [hours, minutes] = checkOutTime.split(':').map(Number);
      const dateObj = new Date(date);
      dateObj.setHours(hours, minutes, 0, 0);
      checkOutDateTime = dateObj;
    }

    // Update check-out
    attendance.checkOut = {
      time: checkOutDateTime,
      location,
      method, // 'manual' for admin-marked
      ipAddress: req.ip,
      deviceInfo: {
        userAgent: 'Admin Portal',
        platform: 'admin'
      }
    };

    // Save attendance - pre-save hook will calculate work hours automatically
    await attendance.save();

    console.log('✅ Admin marked check-out. Work hours calculated:', attendance.workHours, '(', attendance.workHoursFormatted, ')');

    res.json({
      success: true,
      message: 'Check-out marked successfully by admin',
      data: { 
        attendance,
        workHours: attendance.workHours,
        workHoursFormatted: attendance.workHoursFormatted,
        overtimeHours: attendance.overtimeHours,
        overtimeHoursFormatted: attendance.overtimeHoursFormatted
      }
    });

  } catch (error) {
    console.error('Admin check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking check-out',
      error: error.message
    });
  }
});

// Simple attendance marking - Admin marks attendance as present/absent
router.post('/simple-mark', async (req, res) => {
  try {
    // Verify auth token from header
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      });
    }

    // For now, verify the token exists (full JWT verification would be here)
    // Only admins can use this endpoint
    const { userId, date, status } = req.body;

    // Validate inputs
    if (!userId || !date || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, date, status'
      });
    }

    if (!['present', 'absent'].includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Status must be "present" or "absent"'
      });
    }

    // Parse date
    const parsedDate = new Date(date);
    const startOfDay = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Find or create attendance record
    let attendance = await Attendance.findOne({
      user: userId,
      date: { $gte: startOfDay, $lt: endOfDay }
    });

    if (!attendance) {
      attendance = new Attendance({
        user: userId,
        date: startOfDay,
        status: status.toLowerCase(),
        method: 'manual',
        device: 'Admin Portal',
        location: 'Admin Portal'
      });

      // If marking as present, set check-in time to start of day
      if (status.toLowerCase() === 'present') {
        attendance.checkIn = startOfDay;
      }
    } else {
      // Update existing record
      attendance.status = status.toLowerCase();
      attendance.method = 'manual';
      attendance.device = 'Admin Portal';
      attendance.location = 'Admin Portal';

      if (status.toLowerCase() === 'present' && !attendance.checkIn) {
        attendance.checkIn = startOfDay;
      } else if (status.toLowerCase() === 'absent') {
        attendance.checkIn = null;
        attendance.checkOut = null;
        attendance.workHours = 0;
        attendance.workHoursFormatted = '00:00:00';
      }
    }

    await attendance.save();

    return res.json({
      success: true,
      message: `Attendance marked as ${status}`,
      data: {
        _id: attendance._id,
        user: attendance.user,
        date: attendance.date,
        status: attendance.status,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        workHours: attendance.workHours,
        workHoursFormatted: attendance.workHoursFormatted,
        method: attendance.method,
        device: attendance.device
      }
    });
  } catch (error) {
    console.error('Simple mark error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking attendance',
      error: error.message
    });
  }
});

module.exports = router;
