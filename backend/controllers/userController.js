const User = require('../models/User');
const bcrypt = require('bcryptjs');

/**
 * Get all users
 * @route GET /api/users
 * @access Protected (Admin, HR Officer)
 */
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};

    if (req.query.role) {
      filter.role = req.query.role;
    }

    if (req.query.department) {
      filter.department = req.query.department;
    }

    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    if (req.query.search) {
      filter.$or = [
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { employeeId: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      count: users.length,
      total,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving users',
      error: error.message
    });
  }
};

/**
 * Get user by ID
 * @route GET /api/users/:id
 * @access Protected
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving user',
      error: error.message
    });
  }
};

/**
 * Create new user
 * @route POST /api/users
 * @access Protected (Admin, HR Officer)
 */
exports.createUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      department,
      position,
      salary,
      dateOfBirth,
      gender,
      phoneNumber,
      address,
      dateOfJoining,
      skills,
      qualifications
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide firstName, lastName, email, and role'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = password 
      ? await bcrypt.hash(password, 10)
      : await bcrypt.hash('defaultPassword123', 10);

    // Create new user
    const user = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      department,
      position,
      salary,
      dateOfBirth,
      gender,
      phoneNumber,
      address,
      dateOfJoining: dateOfJoining || new Date(),
      skills: skills || [],
      qualifications: qualifications || []
    });

    await user.save();

    // Return user without password
    const userResponse = await User.findById(user._id).select('-password');

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating user',
      error: error.message
    });
  }
};

/**
 * Update user
 * @route PUT /api/users/:id
 * @access Protected (Admin, HR Officer)
 */
exports.updateUser = async (req, res) => {
  try {
    const updateFields = {};
    const allowedFields = [
      'firstName', 'lastName', 'phoneNumber', 'department', 'position',
      'salary', 'address', 'role', 'dateOfBirth', 'gender',
      'skills', 'qualifications', 'isActive', 'leaveBalance'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field];
      }
    });

    // If password is being updated, hash it
    if (req.body.password) {
      updateFields.password = await bcrypt.hash(req.body.password, 10);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user',
      error: error.message
    });
  }
};

/**
 * Delete user
 * @route DELETE /api/users/:id
 * @access Protected (Admin)
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: { id: req.params.id }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting user',
      error: error.message
    });
  }
};
