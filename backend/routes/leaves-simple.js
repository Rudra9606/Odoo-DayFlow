const express = require('express');
const router = express.Router();
const {
  getLeaves,
  getLeaveById,
  applyLeave,
  updateLeave,
  approveLeave,
  rejectLeave,
  deleteLeave
} = require('../controllers/leaveController');

// Note: Add auth middleware when available
// const { protect, authorize } = require('../middleware/auth');
// const { auditLog } = require('../middleware/audit');

// Get all leaves with filters
router.get('/', getLeaves);

// Get single leave request
router.get('/:id', getLeaveById);

// Apply for leave
router.post('/', applyLeave);

// Update leave request
router.put('/:id', updateLeave);

// Approve leave request (Admin, HR Officer only)
router.put('/:id/approve', approveLeave);

// Reject leave request (Admin, HR Officer only)
router.put('/:id/reject', rejectLeave);

// Delete leave request (Admin only)
router.delete('/:id', deleteLeave);

module.exports = router;
