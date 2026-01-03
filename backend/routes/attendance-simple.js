const express = require('express');
const router = express.Router();
const {
  getAttendance,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  markAttendance
} = require('../controllers/attendanceController');

// Note: Add auth middleware when available
// const { protect, authorize } = require('../middleware/auth');
// const { auditLog } = require('../middleware/audit');

// Get all attendance records with filters
router.get('/', getAttendance);

// Get single attendance record
router.get('/:id', getAttendanceById);

// Create attendance record (mark attendance)
router.post('/', createAttendance);

// Update attendance record (correction)
router.put('/:id', updateAttendance);

// Delete attendance record
router.delete('/:id', deleteAttendance);

// Legacy mark attendance endpoint
router.post('/mark', markAttendance);

module.exports = router;
