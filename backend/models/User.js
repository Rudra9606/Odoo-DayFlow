const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Unified User/Employee Model
 * Single model for both authentication and employee data
 * Eliminates confusion between User and Employee schemas
 */
const userSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please enter a valid email'
    }
  },
  
  // Contact Information
  phone: {
    type: String,
    validate: {
      validator: function(phone) {
        return !phone || /^\+?[\d\s\-\(\)]+$/.test(phone);
      },
      message: 'Please enter a valid phone number'
    }
  },
  dateOfBirth: {
    type: Date
  },
  
  // Authentication
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  
  // Role & Permissions
  role: {
    type: String,
    enum: ['Admin', 'HR Officer', 'Payroll Officer', 'Employee'],
    default: 'Employee',
    required: [true, 'Role is required']
  },
  
  // Company & Employee Details
  company: {
    type: String,
    required: [true, 'Company is required'],
    trim: true,
    uppercase: true,
    default: 'DayFlow'
  },
  userId: {
    type: String,
    unique: true,
    sparse: true // Allow null initially, but unique when set
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Employment Information
  department: {
    type: String,
    enum: ['HR', 'IT', 'Finance', 'Marketing', 'Sales', 'Operations', 'Engineering', 'Legal', null],
    default: null,
    required: false // Optional for all roles (Admin may not have department)
  },
  designation: {
    type: String,
    trim: true
  },
  position: {
    type: String,
    trim: true
  },
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Intern', 'Freelance'],
    default: 'Full-time'
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  
  // Compensation
  salary: {
    type: Number,
    min: [0, 'Salary cannot be negative'],
    default: 0
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']
  },
  
  // Address Information
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  
  // Emergency Contact
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  
  // Profile
  profilePicture: {
    type: String,
    default: null
  },
  
  // Skills and Qualifications (Optional - for detailed employee profiles)
  skills: [{
    name: String,
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert']
    }
  }],
  qualifications: [{
    degree: String,
    institution: String,
    year: Number,
    grade: String
  }],
  
  // Leave balance
  leaveBalance: {
    annual: { type: Number, default: 12 },
    sick: { type: Number, default: 10 },
    personal: { type: Number, default: 5 },
    casual: { type: Number, default: 7 }
  },
  
  // Performance
  performanceRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  lastReviewDate: {
    type: Date,
    default: null
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Security
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Login tracking
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date
  
}, {
  timestamps: true
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ userId: 1 });
userSchema.index({ employeeId: 1 });
userSchema.index({ department: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
userSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Pre-save middleware: Set name field from firstName + lastName
userSchema.pre('save', function(next) {
  if (this.firstName && this.lastName) {
    this.name = `${this.firstName} ${this.lastName}`;
  }
  next();
});

// Encrypt password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Check if account is locked
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  // Otherwise increment
  const updates = { $inc: { loginAttempts: 1 } };
  // Lock the account if we've reached max attempts
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours
  
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }
  return this.updateOne(updates);
};

// Update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

// Static method to find active users/employees
userSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Static method to get department stats
userSchema.statics.getDepartmentStats = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$department', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

// Static method to find by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Ensure virtuals are included when converting to JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
