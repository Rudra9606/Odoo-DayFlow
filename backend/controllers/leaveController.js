const Leave = require('../models/Leave');
const User = require('../models/User'); // Changed from Employee to User

/**
 * Get all leave requests with filters
 * @route GET /api/leaves
 * @access Protected
 */
exports.getLeaves = async (req, res) => {
  try {
    const {
      employeeId,
      status,
      leaveType,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortBy = 'appliedDate',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    
    if (employeeId) filter.employee = employeeId;
    if (status) filter.status = status;
    if (leaveType) filter.leaveType = leaveType;
    
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query
    const leaves = await Leave.find(filter)
      .populate('employee', 'firstName lastName email department employeeId')
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Leave.countDocuments(filter);

    // Calculate summary stats
    const summary = await Leave.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalLeaves: { $sum: 1 },
          totalDays: { $sum: '$duration' },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      count: leaves.length,
      total,
      leaves,
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
 * Get leave by ID
 * @route GET /api/leaves/:id
 * @access Protected
 */
exports.getLeaveById = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate('employee', 'firstName lastName email department employeeId')
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName');

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    res.json({
      success: true,
      leave
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
 * Apply for leave
 * @route POST /api/leaves
 * @access Protected
 */
exports.applyLeave = async (req, res) => {
  try {
    const { employee, leaveType, startDate, endDate, reason, isHalfDay, halfDayType } = req.body;

    // Validate required fields
    if (!employee || !leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Calculate duration
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const duration = isHalfDay ? 0.5 : days;

    // Create leave request
    const leave = await Leave.create({
      employee,
      leaveType,
      startDate,
      endDate,
      duration,
      reason,
      isHalfDay: isHalfDay || false,
      halfDayType,
      status: 'pending',
      appliedDate: new Date()
    });

    const populatedLeave = await Leave.findById(leave._id)
      .populate('employee', 'firstName lastName email employeeId');

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully',
      leave: populatedLeave
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
 * Update leave request
 * @route PUT /api/leaves/:id
 * @access Protected (Admin, HR Officer)
 */
exports.updateLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason, status } = req.body;

    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Only allow update if status is pending
    if (leave.status !== 'pending' && status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update approved/rejected leave'
      });
    }

    // Update fields
    if (leaveType) leave.leaveType = leaveType;
    if (startDate) leave.startDate = startDate;
    if (endDate) leave.endDate = endDate;
    if (reason) leave.reason = reason;
    if (status) leave.status = status;

    await leave.save();

    const updatedLeave = await Leave.findById(leave._id)
      .populate('employee', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Leave request updated successfully',
      leave: updatedLeave
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
 * Approve leave request
 * @route PUT /api/leaves/:id/approve
 * @access Protected (Admin, HR Officer)
 */
exports.approveLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Leave has already been processed'
      });
    }

    // Update leave status
    leave.status = 'approved';
    leave.approvedBy = req.user._id;
    leave.approvedAt = new Date();

    await leave.save();

    // Update user leave balance
    const employee = await User.findById(leave.employee);
    if (employee && employee.leaveBalance) {
      const leaveTypeKey = leave.leaveType === 'annual' ? 'casual' : leave.leaveType;
      if (employee.leaveBalance[leaveTypeKey] !== undefined) {
        employee.leaveBalance[leaveTypeKey] -= leave.duration;
        await employee.save();
      }
    }

    const updatedLeave = await Leave.findById(leave._id)
      .populate('employee', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Leave approved successfully',
      leave: updatedLeave
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
 * Reject leave request
 * @route PUT /api/leaves/:id/reject
 * @access Protected (Admin, HR Officer)
 */
exports.rejectLeave = async (req, res) => {
  try {
    const { reason } = req.body;

    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Leave has already been processed'
      });
    }

    // Update leave status
    leave.status = 'rejected';
    leave.rejectedBy = req.user._id;
    leave.rejectedAt = new Date();
    leave.rejectionReason = reason || 'No reason provided';

    await leave.save();

    const updatedLeave = await Leave.findById(leave._id)
      .populate('employee', 'firstName lastName email')
      .populate('rejectedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Leave rejected successfully',
      leave: updatedLeave
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
 * Delete leave request
 * @route DELETE /api/leaves/:id
 * @access Protected (Admin only)
 */
exports.deleteLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    await leave.deleteOne();

    res.json({
      success: true,
      message: 'Leave request deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

exports.approveLeave = async (req, res) => {
  try {
    const { id } = req.params;

    res.json({
      success: true,
      message: 'Leave approved successfully',
      data: {
        id,
        status: 'Approved'
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
