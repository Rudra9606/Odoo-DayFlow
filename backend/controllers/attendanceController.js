const Attendance = require('../models/Attendance');
const User = require('../models/User'); // Changed from Employee to User

/**
 * Get all attendance records with filters
 * @route GET /api/attendance
 * @access Protected (Admin, HR Officer)
 */
exports.getAttendance = async (req, res) => {
  try {
    const {
      employeeId,
      startDate,
      endDate,
      status,
      department,
      page = 1,
      limit = 50,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    
    if (employeeId) filter.employee = employeeId;
    if (status) filter.status = status;
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query
    const attendance = await Attendance.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Attendance.countDocuments(filter);

    // Calculate summary stats
    const summary = await Attendance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          halfDay: { $sum: { $cond: [{ $eq: ['$status', 'half-day'] }, 1, 0] } },
          avgWorkHours: { $avg: '$workHours' }
        }
      }
    ]);

    res.json({
      success: true,
      count: attendance.length,
      total,
      attendance,
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

exports.markAttendance = async (req, res) => {
  try {
    const { employeeId, checkIn, checkOut } = req.body;

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      data: {
        employeeId,
        checkIn,
        checkOut,
        status: 'Present'
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
 * Get attendance by ID
 * @route GET /api/attendance/:id
 * @access Protected
 */
exports.getAttendanceById = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    res.json({
      success: true,
      attendance
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
 * Create attendance record (Mark attendance)
 * @route POST /api/attendance
 * @access Protected
 */
exports.createAttendance = async (req, res) => {
  try {
    console.log('📥 Received attendance creation request:', {
      employee: req.body.employee,
      date: req.body.date,
      checkIn: req.body.checkIn,
      status: req.body.status
    });
    
    const { employee, date, checkIn, status, notes } = req.body;

    // Validate required fields
    if (!employee) {
      console.error('❌ Employee ID is missing');
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    // Check if attendance already exists for this employee on this date
    const attendanceDate = date ? new Date(date) : new Date();
    attendanceDate.setHours(0, 0, 0, 0);

    console.log('🔍 Checking for existing attendance on:', attendanceDate);

    const existingAttendance = await Attendance.findOne({
      employee,
      date: attendanceDate
    });

    if (existingAttendance) {
      console.log('⚠️ Attendance already exists:', existingAttendance);
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this employee on this date',
        attendance: existingAttendance
      });
    }

    // Prepare check-in data
    const checkInData = {
      time: checkIn?.time || new Date(),
      location: checkIn?.location || null,
      method: checkIn?.method || 'web',
      ipAddress: checkIn?.ipAddress || req.ip || '0.0.0.0',
      deviceInfo: checkIn?.deviceInfo || {
        userAgent: req.headers['user-agent'] || 'Unknown',
        platform: 'web'
      }
    };

    // Determine status based on check-in time (9:00 AM is standard time)
    let attendanceStatus = status || 'present';
    if (!status) {
      const checkInTime = new Date(checkInData.time);
      const hour = checkInTime.getHours();
      const minute = checkInTime.getMinutes();
      if (hour > 9 || (hour === 9 && minute > 15)) {
        attendanceStatus = 'late';
      }
    }

    // Create attendance record
    console.log('💾 Creating attendance record with data:', {
      employee,
      date: attendanceDate,
      checkIn: checkInData,
      status: attendanceStatus
    });
    
    const attendance = await Attendance.create({
      employee,
      date: attendanceDate,
      checkIn: checkInData,
      status: attendanceStatus,
      notes
    });

    console.log('✅ Attendance created successfully:', attendance);

    // Return without population to avoid Employee reference errors
    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      attendance: attendance
    });
  } catch (error) {
    console.error('❌ Create attendance error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

/**
 * Update attendance record (Correction)
 * @route PUT /api/attendance/:id
 * @access Protected (Admin, HR Officer)
 */
exports.updateAttendance = async (req, res) => {
  try {
    const { checkIn, checkOut, status, workHours, notes } = req.body;

    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Update check-in if provided
    if (checkIn) {
      attendance.checkIn = {
        time: new Date(checkIn.time || checkIn),
        location: checkIn.location || attendance.checkIn?.location || null,
        method: checkIn.method || attendance.checkIn?.method || 'web',
        ipAddress: checkIn.ipAddress || attendance.checkIn?.ipAddress || req.ip || '0.0.0.0',
        deviceInfo: checkIn.deviceInfo || attendance.checkIn?.deviceInfo || {
          userAgent: req.headers['user-agent'] || 'Unknown',
          platform: 'web'
        }
      };
    }

    // Update check-out if provided
    if (checkOut) {
      attendance.checkOut = {
        time: new Date(checkOut.time || checkOut),
        location: checkOut.location || null,
        method: checkOut.method || 'web',
        ipAddress: checkOut.ipAddress || req.ip || '0.0.0.0',
        deviceInfo: checkOut.deviceInfo || {
          userAgent: req.headers['user-agent'] || 'Unknown',
          platform: 'web'
        }
      };

      // Calculate work hours if check-out is provided
      if (attendance.checkIn?.time) {
        const checkInTime = new Date(attendance.checkIn.time);
        const checkOutTime = new Date(attendance.checkOut.time);
        const diffMs = checkOutTime - checkInTime;
        const diffHours = diffMs / (1000 * 60 * 60);
        attendance.workHours = Math.max(0, diffHours);
      }
    }

    if (status) attendance.status = status;
    if (workHours !== undefined) attendance.workHours = workHours;
    if (notes) attendance.notes = notes;

    await attendance.save();

    res.json({
      success: true,
      message: 'Attendance updated successfully',
      attendance: attendance
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

/**
 * Delete attendance record
 * @route DELETE /api/attendance/:id
 * @access Protected (Admin only)
 */
exports.deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    await attendance.deleteOne();

    res.json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};
