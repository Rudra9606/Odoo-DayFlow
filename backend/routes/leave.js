const express = require('express');
const { body, validationResult } = require('express-validator');
const Leave = require('../models/Leave');
const User = require('../models/User'); // Changed from Employee to User

const router = express.Router();

// @route   POST /api/leave
// @desc    Apply for leave
// @access  Private
router.post('/', [
  body('employeeId', 'User ID is required').notEmpty(), // Still called employeeId for compatibility
  body('leaveType', 'Leave type is required').isIn(['annual', 'sick', 'personal', 'maternity', 'paternity', 'emergency', 'unpaid', 'other']),
  body('startDate', 'Start date is required').isISO8601(),
  body('endDate', 'End date is required').isISO8601(),
  body('reason', 'Reason is required').notEmpty()
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

    const {
      employeeId,
      leaveType,
      startDate,
      endDate,
      reason,
      isHalfDay = false,
      halfDayType,
      isEmergency = false
    } = req.body;

    // Find user (employee)
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check leave balance if not emergency
    if (!isEmergency) {
      const balanceCheck = await Leave.checkLeaveBalance(employeeId, leaveType, 1); // Basic check
      if (!balanceCheck.sufficient) {
        return res.status(400).json({
          success: false,
          message: `Insufficient leave balance. Available: ${balanceCheck.remainingBalance} days`
        });
      }
    }

    // Create leave application
    const leave = new Leave({
      employee: employeeId,
      leaveType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      isHalfDay,
      halfDayType,
      isEmergency
    });

    await leave.save();

    // Populate employee details
    await leave.populate('employee', 'firstName lastName employeeId department');

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully',
      data: { leave }
    });

  } catch (error) {
    console.error('Leave application error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error submitting leave application'
    });
  }
});

// @route   GET /api/leave
// @desc    Get leave applications with filters
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

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.leaveType) {
      filter.leaveType = req.query.leaveType;
    }

    if (req.query.startDate && req.query.endDate) {
      filter.$or = [
        {
          startDate: { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) }
        },
        {
          endDate: { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) }
        }
      ];
    }

    const leaves = await Leave.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Leave.countDocuments(filter);

    res.json({
      success: true,
      data: {
        leaves,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving leave applications'
    });
  }
});

// @route   GET /api/leave/:id
// @desc    Get leave application by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName');

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave application not found'
      });
    }

    res.json({
      success: true,
      data: { leave }
    });

  } catch (error) {
    console.error('Get leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving leave application'
    });
  }
});

// @route   PUT /api/leave/:id/approve
// @desc    Approve leave application
// @access  Private (Manager/HR/Admin)
router.put('/:id/approve', async (req, res) => {
  try {
    const { approvedBy } = req.body;

    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      {
        status: 'approved',
        approvedBy,
        approvedAt: new Date()
      },
      { new: true }
    ).populate('employee', 'firstName lastName employeeId department');

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave application not found'
      });
    }

    res.json({
      success: true,
      message: 'Leave application approved successfully',
      data: { leave }
    });

  } catch (error) {
    console.error('Approve leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error approving leave application'
    });
  }
});

// @route   PUT /api/leave/:id/reject
// @desc    Reject leave application
// @access  Private (Manager/HR/Admin)
router.put('/:id/reject', [
  body('rejectionReason', 'Rejection reason is required').notEmpty()
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

    const { rejectedBy, rejectionReason } = req.body;

    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        rejectedBy,
        rejectedAt: new Date(),
        rejectionReason
      },
      { new: true }
    ).populate('employee', 'firstName lastName employeeId department');

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave application not found'
      });
    }

    res.json({
      success: true,
      message: 'Leave application rejected successfully',
      data: { leave }
    });

  } catch (error) {
    console.error('Reject leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error rejecting leave application'
    });
  }
});

// @route   GET /api/leave/employee/:employeeId/summary
// @desc    Get leave summary for an employee
// @access  Private
router.get('/employee/:employeeId/summary', async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const summary = await Leave.getEmployeeLeaveSummary(req.params.employeeId, year);

    // Get current leave balance from employee
    const employee = await Employee.findById(req.params.employeeId);
    const leaveBalance = employee ? employee.leaveBalance : {};

    res.json({
      success: true,
      data: {
        summary,
        balance: leaveBalance,
        year
      }
    });

  } catch (error) {
    console.error('Get leave summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving leave summary'
    });
  }
});

// @route   GET /api/leave/department/:department/overview
// @desc    Get department leave overview
// @access  Private
router.get('/department/:department/overview', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const overview = await Leave.getDepartmentLeaveOverview(
      req.params.department,
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      data: { overview }
    });

  } catch (error) {
    console.error('Get department leave overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving department leave overview'
    });
  }
});

module.exports = router;
