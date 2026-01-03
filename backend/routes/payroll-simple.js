const express = require('express');
const router = express.Router();
const {
  getPayroll,
  getPayrollById,
  processPayroll,
  updatePayroll,
  deletePayroll,
  getPayslips
} = require('../controllers/payrollController');

// Note: Add auth middleware when available
// const { protect, authorize } = require('../middleware/auth');
// const { auditLog } = require('../middleware/audit');

// Get all payroll records with filters
router.get('/', getPayroll);

// Get single payroll record
router.get('/:id', getPayrollById);

// Get payslips for an employee
router.get('/payslips/:employeeId', getPayslips);

// Generate payroll (Admin, Payroll Officer only)
router.post('/generate', processPayroll);

// Legacy endpoint
router.post('/process', processPayroll);

// Update payroll record
router.put('/:id', updatePayroll);

// Delete payroll record (Admin only)
router.delete('/:id', deletePayroll);

module.exports = router;
