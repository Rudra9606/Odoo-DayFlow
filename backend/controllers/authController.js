/**
 * Authentication Controller
 * Handles user registration and login with MongoDB integration
 * Follows Excalidraw HRMS workflow for role-based access
 */

const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { generateUserId } = require('../utils/userIdGenerator');

// Generate JWT Token
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'workzen-secret-key-change-in-production',
    { expiresIn: process.env.JWT_EXPIRE || '1d' }
  );
};

/**
 * Register a new user
 * @route POST /api/auth/register
 * Only allows: Employee, HR Officer, Payroll Officer
 * Admin cannot sign up via this endpoint
 */
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, department, designation, company } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password || !role || !company) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required (firstName, lastName, email, password, role, company)' 
      });
    }

    // CRITICAL: Role validation - Admin cannot sign up
    const allowedRoles = ['Employee', 'HR Officer', 'Payroll Officer'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid role. Only Employee, HR Officer, and Payroll Officer can sign up. Admin accounts are by invite only.' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ 
        success: false,
        message: 'User with this email already exists' 
      });
    }

    // Email validation (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Please enter a valid email address' 
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Generate join date and year
    const joinDate = new Date();
    const joinYear = joinDate.getFullYear();

    // Generate unique user ID
    const userId = await generateUserId(company, firstName, lastName, joinYear);

    // Create new user (password will be hashed by pre-save middleware)
    const newUser = await User.create({
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      company,
      userId,
      email: email.toLowerCase(),
      password,
      role,
      department,
      designation,
      joinDate,
      isVerified: false, // Require email verification in production
      isActive: true
    });

    // Generate token
    const token = generateToken(newUser._id, newUser.role);

    // Return user data without password
    const userResponse = {
      id: newUser._id,
      userId: newUser.userId,
      name: newUser.name,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      company: newUser.company,
      email: newUser.email,
      role: newUser.role,
      department: newUser.department,
      designation: newUser.designation
    };

    console.log(`✅ New user registered: ${email} (${role}) - UserID: ${newUser.userId}`);

    // Return success response with userId highlighted
    return res.status(201).json({ 
      success: true,
      message: `User registered successfully! Your User ID is: ${newUser.userId}`,
      token,
      user: userResponse,
      userId: newUser.userId // Explicit userId field for easy access
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({ 
        success: false,
        message: 'User with this email already exists' 
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: messages.join(', ') 
      });
    }
    
    return res.status(500).json({ 
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 * Returns token + user data with role for frontend redirection
 * Accepts either email or userId as login identifier
 */
exports.login = async (req, res) => {
  try {
    const { email, userId, password } = req.body;

    // Validation - require either email or userId
    if ((!email && !userId) || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email/UserID and password are required' 
      });
    }

    // Find user by email or userId and include password field
    let user;
    if (userId) {
      user = await User.findOne({ userId: userId.toUpperCase() }).select('+password');
    } else {
      user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    }
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      return res.status(423).json({ 
        success: false,
        message: 'Account is locked due to too many failed login attempts. Please try again later.' 
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ 
        success: false,
        message: 'Your account has been deactivated. Please contact administrator.' 
      });
    }

    // Check password using the comparePassword method
    const isPasswordMatch = await user.comparePassword(password);
    
    if (!isPasswordMatch) {
      // Increment login attempts
      await user.incLoginAttempts();
      
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0 || user.lockUntil) {
      await user.updateOne({
        $set: { loginAttempts: 0 },
        $unset: { lockUntil: 1 }
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateModifiedOnly: true });

    // Generate token
    const token = generateToken(user._id, user.role);

    console.log(`✅ User logged in: ${email} (${user.role})`);

    // Return user data without password
    const userResponse = {
      id: user._id,
      userId: user.userId,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      company: user.company,
      email: user.email,
      role: user.role,
      department: user.department,
      designation: user.designation,
      leaveBalance: user.leaveBalance
    };

    // Return success response with token and full user data
    return res.json({ 
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get current user profile
 * @route GET /api/auth/me
 * Requires authentication
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all registered users (Admin only)
 * @route GET /api/auth/users
 */
exports.getAllUsers = async (req, res) => {
  try {
    // Return users without passwords
    const users = await User.find().select('-password');
    
    return res.json({ 
      success: true,
      count: users.length,
      users 
    });
  } catch (error) {
    console.error('❌ Get users error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Seed initial admin user (for development only)
 * @route POST /api/auth/seed-admin
 */
exports.seedAdmin = async (req, res) => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@workzen.com' });
    
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin user already exists'
      });
    }

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@workzen.com',
      password: 'admin123',
      role: 'Admin',
      department: 'IT',
      designation: 'System Administrator',
      isVerified: true,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('❌ Seed admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

