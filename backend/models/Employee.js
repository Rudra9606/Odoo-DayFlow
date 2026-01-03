const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const employeeSchema = new mongoose.Schema({
  // Personal Information
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
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    validate: {
      validator: function(phone) {
        return /^\+?[\d\s\-\(\)]+$/.test(phone);
      },
      message: 'Please enter a valid phone number'
    }
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },

  // Employment Information
  employeeId: {
    type: String,
    unique: true,
    required: [true, 'Employee ID is required']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: ['HR', 'IT', 'Finance', 'Marketing', 'Sales', 'Operations', 'Engineering', 'Legal']
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    trim: true
  },
  employmentType: {
    type: String,
    required: [true, 'Employment type is required'],
    enum: ['Full-time', 'Part-time', 'Contract', 'Intern', 'Freelance'],
    default: 'Full-time'
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    default: null
  },
  salary: {
    type: Number,
    required: [true, 'Salary is required'],
    min: [0, 'Salary cannot be negative']
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

  // Authentication
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['employee', 'manager', 'hr', 'admin'],
    default: 'employee'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },

  // Profile Picture
  profilePicture: {
    type: String,
    default: null
  },

  // Skills and Qualifications
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

  // Performance and Reviews
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

  // Leave Information
  leaveBalance: {
    annual: { type: Number, default: 25 },
    sick: { type: Number, default: 10 },
    personal: { type: Number, default: 5 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
employeeSchema.index({ email: 1 });
employeeSchema.index({ employeeId: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ isActive: 1 });

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
employeeSchema.virtual('age').get(function() {
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

// Pre-save middleware to hash password
employeeSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
employeeSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to update last login
employeeSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

// Static method to find active employees
employeeSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Static method to get department stats
employeeSchema.statics.getDepartmentStats = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$department', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('Employee', employeeSchema);
