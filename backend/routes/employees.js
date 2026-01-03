const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User'); // Changed from Employee to User

const router = express.Router();

// @route   GET /api/employees
// @desc    Get all employees (users with role 'Employee') with pagination and filters
// @access  Private
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object - only get users who are employees
    const filter = { 
      isActive: true,
      // Get all users (employees, admins, HR, payroll officers)
      // If you want only employees: role: 'Employee'
    };

    if (req.query.department) {
      filter.department = req.query.department;
    }

    if (req.query.search) {
      filter.$or = [
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { employeeId: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const employees = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        employees,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving employees'
    });
  }
});

// @route   GET /api/employees/:id
// @desc    Get employee by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const employee = await User.findById(req.params.id).select('-password');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      data: { employee }
    });

  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving employee'
    });
  }
});

// @route   POST /api/employees
// @desc    Create new employee
// @access  Private (Admin/HR)
router.post('/', [
  body('firstName', 'First name is required').notEmpty(),
  body('lastName', 'Last name is required').notEmpty(),
  body('email', 'Please include a valid email').isEmail(),
  body('phone', 'Phone number is required').notEmpty(),
  body('dateOfBirth', 'Date of birth is required').isISO8601(),
  body('department', 'Department is required').notEmpty(),
  body('position', 'Position is required').notEmpty(),
  body('salary', 'Salary is required').isNumeric()
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
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      department,
      position,
      employmentType = 'Full-time',
      startDate = new Date(),
      salary,
      currency = 'USD',
      address,
      emergencyContact
    } = req.body;

    // Check if employee already exists
    const existingEmployee = await User.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Generate employee ID
    const employeeCount = await User.countDocuments();
    const employeeId = `EMP${String(employeeCount + 1).padStart(4, '0')}`;

    // Create new employee (as User)
    const employee = new User({
      firstName,
      lastName,
      email,
      password: 'defaultPassword123', // In production, generate secure password
      phone,
      dateOfBirth,
      employeeId,
      department,
      position,
      employmentType,
      startDate,
      salary,
      currency,
      address,
      emergencyContact
    });

    await employee.save();

    // Remove password from response
    const employeeResponse = await User.findById(employee._id).select('-password');

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: { employee: employeeResponse }
    });

  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating employee'
    });
  }
});

// @route   PUT /api/employees/:id
// @desc    Update employee
// @access  Private (Admin/HR)
router.put('/:id', async (req, res) => {
  try {
    const updateFields = {};
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'department', 'position',
      'employmentType', 'salary', 'currency', 'address', 'emergencyContact',
      'skills', 'qualifications', 'performanceRating', 'isActive'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field];
      }
    });

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: { employee }
    });

  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating employee'
    });
  }
});

// @route   DELETE /api/employees/:id
// @desc    Deactivate employee (soft delete)
// @access  Private (Admin)
router.delete('/:id', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      message: 'Employee deactivated successfully',
      data: { employee }
    });

  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deactivating employee'
    });
  }
});

// @route   GET /api/employees/stats/department
// @desc    Get department statistics
// @access  Private
router.get('/stats/department', async (req, res) => {
  try {
    const stats = await Employee.getDepartmentStats();

    res.json({
      success: true,
      data: { departmentStats: stats }
    });

  } catch (error) {
    console.error('Get department stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving department statistics'
    });
  }
});

module.exports = router;
