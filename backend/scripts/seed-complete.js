/**
 * WorkZen HRMS - Complete Database Seeder
 * This script seeds the database with realistic test data for all modules
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Models
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const LeaveRequest = require('../models/LeaveRequest');
const Payroll = require('../models/Payroll');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/workzen_hrms');
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// Seed data
const seedData = async () => {
  try {
    console.log('\n🌱 Starting database seed...\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Attendance.deleteMany({});
    await Leave.deleteMany({});
    try {
      await LeaveRequest.deleteMany({});
    } catch (err) {
      // LeaveRequest model might not exist
      console.log('   ℹ️  LeaveRequest model not found, skipping');
    }
    await Payroll.deleteMany({});
    console.log('✅ Existing data cleared\n');

    // Create Users (combined Employee data)
    console.log('👥 Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = await User.create([
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@workzen.com',
        password: hashedPassword,
        role: 'Admin',
        department: 'Management',
        position: 'System Administrator',
        phone: '+1-555-0100',
        address: '123 Admin Street, Tech City, TC 10001',
        dateOfBirth: new Date('1985-01-15'),
        gender: 'Male',
        joiningDate: new Date('2020-01-01'),
        salary: 120000,
        employeeId: 'WZ-ADM-001',
        isActive: true,
        status: 'Active',
      },
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'hr@workzen.com',
        password: hashedPassword,
        role: 'HR Officer',
        department: 'Human Resources',
        position: 'HR Manager',
        phone: '+1-555-0101',
        address: '456 HR Avenue, People City, PC 20002',
        dateOfBirth: new Date('1990-05-20'),
        gender: 'Female',
        joiningDate: new Date('2021-03-15'),
        salary: 85000,
        employeeId: 'WZ-HR-001',
        isActive: true,
        status: 'Active',
      },
      {
        firstName: 'Michael',
        lastName: 'Chen',
        email: 'payroll@workzen.com',
        password: hashedPassword,
        role: 'Payroll Officer',
        department: 'Finance',
        position: 'Payroll Specialist',
        phone: '+1-555-0102',
        address: '789 Finance Blvd, Money City, MC 30003',
        dateOfBirth: new Date('1988-09-10'),
        gender: 'Male',
        joiningDate: new Date('2021-06-01'),
        salary: 75000,
        employeeId: 'WZ-FIN-001',
        isActive: true,
        status: 'Active',
      },
      {
        firstName: 'Emily',
        lastName: 'Rodriguez',
        email: 'emily@workzen.com',
        password: hashedPassword,
        role: 'Employee',
        department: 'Engineering',
        position: 'Senior Developer',
        phone: '+1-555-0103',
        address: '321 Code Street, Dev City, DC 40004',
        dateOfBirth: new Date('1992-03-25'),
        gender: 'Female',
        joiningDate: new Date('2022-01-10'),
        salary: 95000,
        employeeId: 'WZ-ENG-001',
        isActive: true,
        status: 'Active',
      },
      {
        firstName: 'James',
        lastName: 'Wilson',
        email: 'james@workzen.com',
        password: hashedPassword,
        role: 'Employee',
        department: 'Engineering',
        position: 'Full Stack Developer',
        phone: '+1-555-0104',
        address: '654 Developer Lane, Code City, CC 50005',
        dateOfBirth: new Date('1995-07-14'),
        gender: 'Male',
        joiningDate: new Date('2022-08-15'),
        salary: 80000,
        employeeId: 'WZ-ENG-002',
        isActive: true,
        status: 'Active',
      },
      {
        firstName: 'Lisa',
        lastName: 'Anderson',
        email: 'lisa@workzen.com',
        password: hashedPassword,
        role: 'Employee',
        department: 'Marketing',
        position: 'Marketing Manager',
        phone: '+1-555-0105',
        address: '987 Marketing Plaza, Brand City, BC 60006',
        dateOfBirth: new Date('1991-11-30'),
        gender: 'Female',
        joiningDate: new Date('2021-09-01'),
        salary: 72000,
        employeeId: 'WZ-MKT-001',
        isActive: true,
        status: 'Active',
      },
      {
        firstName: 'David',
        lastName: 'Brown',
        email: 'david@workzen.com',
        password: hashedPassword,
        role: 'Employee',
        department: 'Sales',
        position: 'Sales Representative',
        phone: '+1-555-0106',
        address: '147 Sales Street, Deal City, DL 70007',
        dateOfBirth: new Date('1993-02-18'),
        gender: 'Male',
        joiningDate: new Date('2023-01-15'),
        salary: 65000,
        employeeId: 'WZ-SAL-001',
        isActive: true,
        status: 'Active',
      },
    ]);

    console.log(`✅ Created ${users.length} users\n`);

    // Create Attendance Records (including today)
    console.log('📅 Creating attendance records...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendanceRecords = [];
    
    // Create attendance for the last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      for (const user of users) {
        // 90% attendance rate - some employees might be absent/on leave
        const rand = Math.random();
        if (rand < 0.9) {
          const checkInTime = new Date(date);
          const checkInHour = 8 + Math.floor(Math.random() * 2); // 8-9 AM
          const checkInMinute = Math.floor(Math.random() * 60);
          checkInTime.setHours(checkInHour, checkInMinute, 0, 0);
          
          const checkOutTime = new Date(date);
          const checkOutHour = 17 + Math.floor(Math.random() * 2); // 5-6 PM
          const checkOutMinute = Math.floor(Math.random() * 60);
          checkOutTime.setHours(checkOutHour, checkOutMinute, 0, 0);
          
          const hoursWorked = (checkOutTime - checkInTime) / (1000 * 60 * 60);
          
          // Determine status
          let status = 'present';
          if (checkInHour > 9 || (checkInHour === 9 && checkInMinute > 15)) {
            status = 'late';
          }
          
          attendanceRecords.push({
            employee: user._id,
            date: date,
            checkIn: checkInTime,
            checkOut: checkOutTime,
            hoursWorked: parseFloat(hoursWorked.toFixed(2)),
            status: status,
            location: 'Office',
            notes: i === 0 ? 'Present today' : '',
          });
        }
      }
    }
    
    await Attendance.insertMany(attendanceRecords);
    console.log(`✅ Created ${attendanceRecords.length} attendance records\n`);

    // Create Leave Requests
    console.log('🏖️  Creating leave requests...');
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const leaveRequests = [];
    
    // Create some approved leaves
    for (let i = 0; i < 3; i++) {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + Math.floor(Math.random() * 30) - 15);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + Math.floor(Math.random() * 3) + 1);
      
      const randomUser = users[Math.floor(Math.random() * users.length)];
      
      leaveRequests.push({
        employee: randomUser._id,
        leaveType: ['Sick', 'Vacation', 'Personal'][Math.floor(Math.random() * 3)],
        startDate: startDate,
        endDate: endDate,
        from: startDate,
        to: endDate,
        duration: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)),
        reason: `Personal leave request ${i + 1}`,
        status: 'Approved',
        approvedBy: users[0]._id, // Admin
        approvedAt: new Date(),
      });
    }
    
    // Create pending leaves
    for (let i = 0; i < 2; i++) {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + Math.floor(Math.random() * 20) + 5);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + Math.floor(Math.random() * 3) + 1);
      
      const randomUser = users[3 + i]; // Employee users
      
      leaveRequests.push({
        employee: randomUser._id,
        leaveType: ['Sick', 'Vacation'][Math.floor(Math.random() * 2)],
        startDate: startDate,
        endDate: endDate,
        from: startDate,
        to: endDate,
        duration: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)),
        reason: `Pending leave request ${i + 1}`,
        status: 'Pending',
      });
    }
    
    await Leave.insertMany(leaveRequests);
    console.log(`✅ Created ${leaveRequests.length} leave requests\n`);

    // Create Payroll Records (current month + last month)
    console.log('💰 Creating payroll records...');
    const payrollRecords = [];
    
    // Current month payroll
    for (const user of users) {
      const grossPay = user.salary / 12;
      const tax = grossPay * 0.20;
      const socialSecurity = grossPay * 0.062;
      const medicare = grossPay * 0.0145;
      const totalDeductions = tax + socialSecurity + medicare;
      const netPay = grossPay - totalDeductions;
      
      payrollRecords.push({
        employee: user._id,
        month: currentMonth,
        year: currentMonth.getFullYear(),
        grossPay: parseFloat(grossPay.toFixed(2)),
        deductions: parseFloat(totalDeductions.toFixed(2)),
        netPay: parseFloat(netPay.toFixed(2)),
        status: 'Completed',
        paidDate: new Date(),
        paymentMethod: 'Bank Transfer',
        breakdown: {
          basicSalary: parseFloat(grossPay.toFixed(2)),
          allowances: 0,
          bonuses: 0,
          tax: parseFloat(tax.toFixed(2)),
          socialSecurity: parseFloat(socialSecurity.toFixed(2)),
          medicare: parseFloat(medicare.toFixed(2)),
        },
      });
    }
    
    // Last month payroll
    const lastMonth = new Date(currentMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    for (const user of users) {
      const grossPay = user.salary / 12;
      const tax = grossPay * 0.20;
      const socialSecurity = grossPay * 0.062;
      const medicare = grossPay * 0.0145;
      const totalDeductions = tax + socialSecurity + medicare;
      const netPay = grossPay - totalDeductions;
      
      payrollRecords.push({
        employee: user._id,
        month: lastMonth,
        year: lastMonth.getFullYear(),
        grossPay: parseFloat(grossPay.toFixed(2)),
        deductions: parseFloat(totalDeductions.toFixed(2)),
        netPay: parseFloat(netPay.toFixed(2)),
        status: 'Completed',
        paidDate: lastMonth,
        paymentMethod: 'Bank Transfer',
        breakdown: {
          basicSalary: parseFloat(grossPay.toFixed(2)),
          allowances: 0,
          bonuses: 0,
          tax: parseFloat(tax.toFixed(2)),
          socialSecurity: parseFloat(socialSecurity.toFixed(2)),
          medicare: parseFloat(medicare.toFixed(2)),
        },
      });
    }
    
    await Payroll.insertMany(payrollRecords);
    console.log(`✅ Created ${payrollRecords.length} payroll records\n`);

    console.log('✅ Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Attendance Records: ${attendanceRecords.length}`);
    console.log(`   - Leave Requests: ${leaveRequests.length}`);
    console.log(`   - Payroll Records: ${payrollRecords.length}`);
    console.log('\n🔐 Login Credentials:');
    console.log('   Admin: admin@workzen.com / password123');
    console.log('   HR: hr@workzen.com / password123');
    console.log('   Payroll: payroll@workzen.com / password123');
    console.log('   Employee: emily@workzen.com / password123\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};

// Main execution
const run = async () => {
  await connectDB();
  await seedData();
  await mongoose.connection.close();
  console.log('👋 Database connection closed\n');
  process.exit(0);
};

run();
