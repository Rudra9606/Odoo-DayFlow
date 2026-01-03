/**
 * Migration Script: Employee to User Unification
 * 
 * This script migrates data from the old Employee model to the unified User model
 * Run this once to consolidate your data
 * 
 * Usage: node scripts/migrateEmployeesToUsers.js
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Payroll = require('../models/Payroll');

// Load environment variables
require('dotenv').config();

const migrateEmployeesToUsers = async () => {
  try {
    console.log('🚀 Starting Employee to User migration...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workzen', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');
    
    // Get all employees
    const employees = await Employee.find();
    console.log(`📊 Found ${employees.length} employees to migrate\n`);
    
    let migrated = 0;
    let updated = 0;
    let skipped = 0;
    
    for (const emp of employees) {
      try {
        // Check if user already exists with this email
        let user = await User.findOne({ email: emp.email });
        
        if (!user) {
          // Create new user from employee data
          console.log(`➕ Creating user: ${emp.firstName} ${emp.lastName} (${emp.email})`);
          
          user = new User({
            firstName: emp.firstName,
            lastName: emp.lastName,
            name: `${emp.firstName} ${emp.lastName}`,
            email: emp.email,
            phone: emp.phone,
            dateOfBirth: emp.dateOfBirth,
            employeeId: emp.employeeId,
            department: emp.department,
            position: emp.position,
            designation: emp.position, // Map position to designation
            employmentType: emp.employmentType,
            startDate: emp.startDate,
            joinDate: emp.startDate,
            endDate: emp.endDate,
            salary: emp.salary,
            currency: emp.currency,
            address: emp.address,
            emergencyContact: emp.emergencyContact,
            profilePicture: emp.profilePicture,
            skills: emp.skills,
            qualifications: emp.qualifications,
            leaveBalance: emp.leaveBalance,
            performanceRating: emp.performanceRating,
            lastReviewDate: emp.lastReviewDate,
            password: emp.password, // Already hashed
            role: emp.role === 'admin' ? 'Admin' : 
                  emp.role === 'hr' ? 'HR Officer' : 
                  emp.role === 'manager' ? 'HR Officer' : 
                  'Employee',
            isActive: emp.isActive !== undefined ? emp.isActive : true,
            lastLogin: emp.lastLogin,
            company: 'WORKZEN'
          });
          
          // Save without validation to avoid password hashing again
          await user.save({ validateBeforeSave: false });
          migrated++;
          console.log(`✅ Created user: ${user.email} (ID: ${user._id})\n`);
          
        } else {
          // User exists, update with employee data if needed
          console.log(`🔄 Updating existing user: ${emp.firstName} ${emp.lastName} (${emp.email})`);
          
          // Update fields that might be missing
          const updates = {
            phone: emp.phone || user.phone,
            dateOfBirth: emp.dateOfBirth || user.dateOfBirth,
            employeeId: emp.employeeId || user.employeeId,
            department: emp.department || user.department,
            position: emp.position || user.position,
            designation: emp.position || user.designation,
            employmentType: emp.employmentType || user.employmentType,
            startDate: emp.startDate || user.startDate,
            salary: emp.salary || user.salary,
            currency: emp.currency || user.currency,
            address: emp.address || user.address,
            emergencyContact: emp.emergencyContact || user.emergencyContact,
            skills: emp.skills?.length ? emp.skills : user.skills,
            qualifications: emp.qualifications?.length ? emp.qualifications : user.qualifications,
            leaveBalance: emp.leaveBalance || user.leaveBalance,
            performanceRating: emp.performanceRating || user.performanceRating
          };
          
          Object.assign(user, updates);
          await user.save({ validateBeforeSave: false });
          updated++;
          console.log(`✅ Updated user: ${user.email}\n`);
        }
        
        // Update references in Attendance
        const attendanceUpdates = await Attendance.updateMany(
          { employee: emp._id },
          { 
            $set: { 
              employee: user._id,
              user: user._id 
            } 
          }
        );
        if (attendanceUpdates.modifiedCount > 0) {
          console.log(`   📋 Updated ${attendanceUpdates.modifiedCount} attendance records`);
        }
        
        // Update references in Leave
        const leaveUpdates = await Leave.updateMany(
          { employee: emp._id },
          { 
            $set: { 
              employee: user._id,
              user: user._id 
            } 
          }
        );
        if (leaveUpdates.modifiedCount > 0) {
          console.log(`   📅 Updated ${leaveUpdates.modifiedCount} leave records`);
        }
        
        // Update references in Payroll
        const payrollUpdates = await Payroll.updateMany(
          { employee: emp._id },
          { 
            $set: { 
              employee: user._id,
              user: user._id 
            } 
          }
        );
        if (payrollUpdates.modifiedCount > 0) {
          console.log(`   💰 Updated ${payrollUpdates.modifiedCount} payroll records\n`);
        }
        
      } catch (error) {
        console.error(`❌ Error migrating employee ${emp.email}:`, error.message);
        skipped++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Migration Summary:');
    console.log('='.repeat(50));
    console.log(`✅ New users created: ${migrated}`);
    console.log(`🔄 Existing users updated: ${updated}`);
    console.log(`⏭️  Skipped (errors): ${skipped}`);
    console.log(`📊 Total processed: ${migrated + updated + skipped}`);
    console.log('='.repeat(50) + '\n');
    
    // Optional: Archive or remove old Employee collection
    console.log('⚠️  Note: Old Employee collection still exists.');
    console.log('   You can safely remove it after verifying the migration.\n');
    
    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    console.log('🎉 Migration completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration
if (require.main === module) {
  migrateEmployeesToUsers()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = migrateEmployeesToUsers;
