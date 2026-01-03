const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
// Employee model merged into User model

/**
 * Create leave request
 * @route POST /api/leaves
 * @access Public (should be protected with auth middleware)
 */
exports.createLeave = async (req, res) => {
  try {
    const { userId, type, from, to, reason, email, userEmail } = req.body;
    
    console.log('📝 Creating leave request:', { userId, type, from, to, reason, email });
    
    // Validation
    if (!type || !from || !to || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, from, to, reason'
      });
    }
    
    // Validate dates
    const startDate = new Date(from);
    const endDate = new Date(to);
    
    if (endDate < startDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after or equal to start date'
      });
    }
    
    // TODO: In production, get userId from req.user.id (JWT token)
    // For now, if userId is not provided, try to find user by email
    let finalUserId = userId;
    let finalEmail = email || userEmail;
    
    if (!finalUserId && finalEmail) {
      const user = await User.findOne({ email: finalEmail });
      if (user) {
        finalUserId = user._id;
      }
    }
    
    // Create leave request
    const leaveData = {
      userId: finalUserId,
      type,
      from: startDate,
      to: endDate,
      reason,
      status: 'Pending',
      email: finalEmail,
      userEmail: finalEmail
    };
    
    const leave = await LeaveRequest.create(leaveData);
    
    // Populate user details
    const populatedLeave = await LeaveRequest.findById(leave._id)
      .populate('userId', 'name email role department firstName lastName');
    
    console.log('✅ Leave request created:', populatedLeave._id);
    
    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: populatedLeave,
      leave: populatedLeave, // backward compatibility
      id: populatedLeave._id
    });
  } catch (error) {
    console.error('❌ Create leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating leave request',
      error: error.message
    });
  }
};

/**
 * Get all leave requests
 * @route GET /api/leaves
 * @access Public (should be protected)
 */
exports.getLeaves = async (req, res) => {
  try {
    const { userId, status, email, userEmail } = req.query;
    
    // Build filter
    const filter = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;
    if (email) filter.email = email;
    if (userEmail) filter.userEmail = userEmail;
    
    console.log('🔍 Fetching leaves with filter:', filter);
    
    const leaves = await LeaveRequest.find(filter)
      .populate('userId', 'name email role department')
      .populate('employee', 'firstName lastName email employeeId department')
      .populate('approverId', 'name email role')
      .sort({ createdAt: -1 });
    
    console.log(`✅ Found ${leaves.length} leave requests`);
    
    res.json({
      success: true,
      count: leaves.length,
      leaves,
      data: leaves // backward compatibility
    });
  } catch (error) {
    console.error('❌ Get leaves error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching leaves',
      error: error.message
    });
  }
};

/**
 * Get leave request by ID
 * @route GET /api/leaves/:id
 * @access Public (should be protected)
 */
exports.getLeaveById = async (req, res) => {
  try {
    const leave = await LeaveRequest.findById(req.params.id)
      .populate('userId', 'name email role department')
      .populate('employee', 'firstName lastName email employeeId')
      .populate('approverId', 'name email role');
    
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    res.json({
      success: true,
      leave,
      data: leave
    });
  } catch (error) {
    console.error('❌ Get leave by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Update leave request (approve/reject)
 * @route PUT /api/leaves/:id
 * @access Protected (Admin, HR, Payroll)
 */
exports.updateLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approverId, comments } = req.body;
    
    console.log('📝 Updating leave request:', { id, status, approverId, comments });
    
    // Validate ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave request ID format'
      });
    }
    
    const leave = await LeaveRequest.findById(id);
    
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    // Store previous status for audit
    const previousStatus = leave.status;
    
    // Update status
    if (status) {
      // Validate status
      const validStatuses = ['Pending', 'Approved', 'Rejected', 'Cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
      
      leave.status = status;
      
      // Set approval/rejection timestamps
      if (status === 'Approved') {
        leave.approvedAt = new Date();
        if (approverId) leave.approverId = approverId;
        
        // Update user's leave balance
        if (leave.userId) {
          const days = leave.duration;
          const leaveTypeKey = leave.type === 'Vacation' ? 'annual' : 
                               leave.type === 'Sick Leave' ? 'sick' : 
                               leave.type === 'Personal' ? 'personal' :
                               'casual';
          
          const user = await User.findById(leave.userId);
          if (user && user.leaveBalance && user.leaveBalance[leaveTypeKey] !== undefined) {
            const currentBalance = user.leaveBalance[leaveTypeKey];
            const newBalance = Math.max(0, currentBalance - days);
            
            await User.findByIdAndUpdate(leave.userId, {
              $set: { [`leaveBalance.${leaveTypeKey}`]: newBalance }
            });
            
            console.log(`✅ Deducted ${days} days from user ${user.email}'s ${leaveTypeKey} balance: ${currentBalance} → ${newBalance}`);
          } else {
            console.log(`⚠️ User ${leave.userId} not found or leaveBalance not configured`);
          }
        }
      } else if (status === 'Rejected') {
        leave.rejectedAt = new Date();
        if (approverId) leave.approverId = approverId;
      }
    }
    
    // Update comments
    if (comments !== undefined) {
      leave.comments = comments;
    }
    
    // Update approverId even if status not changing
    if (approverId && !leave.approverId) {
      leave.approverId = approverId;
    }
    
    await leave.save();
    
    const updatedLeave = await LeaveRequest.findById(leave._id)
      .populate('userId', 'name email role')
      .populate('employee', 'firstName lastName email')
      .populate('approverId', 'name email role');
    
    console.log(`✅ Leave request updated: ${previousStatus} → ${leave.status} by approver ${approverId}`);
    
    res.json({
      success: true,
      message: `Leave request ${status?.toLowerCase() || 'updated'} successfully`,
      leave: updatedLeave,
      data: updatedLeave
    });
  } catch (error) {
    console.error('❌ Update leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating leave request',
      error: error.message
    });
  }
};

/**
 * Delete leave request
 * @route DELETE /api/leaves/:id
 * @access Protected (Admin, or own request)
 */
exports.deleteLeave = async (req, res) => {
  try {
    const leave = await LeaveRequest.findByIdAndDelete(req.params.id);
    
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    console.log('✅ Leave request deleted:', req.params.id);
    
    res.json({
      success: true,
      message: 'Leave request deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting leave',
      error: error.message
    });
  }
};
