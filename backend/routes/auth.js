/**
 * Authentication Routes
 * Handles user registration and login with MongoDB integration
 * Follows Excalidraw HRMS workflow for role-based authentication
 */

const express = require('express');
const router = express.Router();
const { register, login, getAllUsers, getMe, seedAdmin } = require('../controllers/authController');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (Employee, HR Officer, Payroll Officer only)
 * @access  Public
 * @body    { firstName, lastName, email, password, role, department, designation, company }
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return token + role
 * @access  Public
 * @body    { email, password }
 * @returns { token, user: { id, name, email, role } }
 */
router.post('/login', login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged in user
 * @access  Private (requires authentication)
 */
// router.get('/me', protect, getMe); // Uncomment when auth middleware is ready

/**
 * @route   GET /api/auth/users
 * @desc    Get all registered users
 * @access  Public (should be protected as Admin-only in production)
 */
router.get('/users', getAllUsers);

/**
 * @route   POST /api/auth/seed-admin
 * @desc    Create initial admin user (development only)
 * @access  Public (remove in production)
 */
router.post('/seed-admin', seedAdmin);

module.exports = router;
