const express = require('express');
const router = express.Router();
const {
  createLeave,
  getLeaves,
  getLeaveById,
  updateLeave,
  deleteLeave
} = require('../controllers/leaveRequestController');

// Note: Add auth middleware when available
// const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/leaves
 * @desc    Create a new leave request
 * @access  Public (should be Protected)
 */
router.post('/', createLeave);

/**
 * @route   GET /api/leaves
 * @desc    Get all leave requests (with optional filters)
 * @access  Public (should be Protected)
 */
router.get('/', getLeaves);

/**
 * @route   GET /api/leaves/:id
 * @desc    Get leave request by ID
 * @access  Public (should be Protected)
 */
router.get('/:id', getLeaveById);

/**
 * @route   PUT /api/leaves/:id
 * @desc    Update leave request (approve/reject)
 * @access  Protected (Admin, HR Officer, Payroll Officer)
 */
router.put('/:id', updateLeave);

/**
 * @route   DELETE /api/leaves/:id
 * @desc    Delete leave request
 * @access  Protected (Admin or owner)
 */
router.delete('/:id', deleteLeave);

module.exports = router;
