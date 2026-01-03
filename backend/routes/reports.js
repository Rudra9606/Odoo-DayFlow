const express = require('express');
const router = express.Router();
const {
  getReports,
  generatePayrollSummary,
  generateAttendanceReport,
  generateLeaveReport,
  generateEmployeeReport
} = require('../controllers/reportController');

// Note: Add auth middleware when available
// const { protect, authorize } = require('../middleware/auth');

// Get available reports
router.get('/', getReports);

// Generate payroll summary report
router.post('/payroll-summary', generatePayrollSummary);

// Generate attendance report
router.post('/attendance', generateAttendanceReport);

// Generate leave report
router.post('/leave', generateLeaveReport);

// Generate employee report
router.post('/employee', generateEmployeeReport);

module.exports = router;
