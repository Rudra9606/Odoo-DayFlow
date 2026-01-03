/**
 * Database Seeder Script
 * Seeds initial data for testing and development
 * Run: npm run seed
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
// Employee model merged into User model

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/workzen_hrms', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected for seeding');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

const seedUsers = async () => {
  try {
    // Clear existing users
    await User.deleteMany({});
    console.log('🗑️  Cleared existing users');

    // Seed users
    const users = await User.create([
      {
        firstName: 'Admin',
        lastName: 'User',
        company: 'WorkZen',
        name: 'Admin User',
        email: 'admin@workzen.com',
        password: 'admin123',
        role: 'Admin',
        department: 'IT',
        designation: 'System Administrator',
        isVerified: true,
        isActive: true
      },
      {
        firstName: 'John',
        lastName: 'Doe',
        company: 'WorkZen',
        name: 'John Doe',
        email: 'employee1@workzen.com',
        password: 'emp123',
        role: 'Employee',
        department: 'Engineering',
        designation: 'Software Developer',
        isVerified: true,
        isActive: true
      },
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        company: 'WorkZen',
        name: 'Sarah Johnson',
        email: 'hr1@workzen.com',
        password: 'hr1234',
        role: 'HR Officer',
        department: 'HR',
        designation: 'HR Manager',
        isVerified: true,
        isActive: true
      },
      {
        firstName: 'Mike',
        lastName: 'Payroll',
        company: 'WorkZen',
        name: 'Mike Payroll',
        email: 'payroll1@workzen.com',
        password: 'pay123',
        role: 'Payroll Officer',
        department: 'Finance',
        designation: 'Payroll Manager',
        isVerified: true,
        isActive: true
      }
    ]);

    console.log(`✅ Seeded ${users.length} users`);
    return users;
  } catch (error) {
    console.error('❌ Error seeding users:', error.message);
    throw error;
  }
};

const seedEmployees = async (users) => {
  try {
    // Clear existing employees
    await Employee.deleteMany({});
    console.log('🗑️  Cleared existing employees');

    // Create employee records for users
    const employees = await Employee.create([
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@workzen.com',
        phone: '+1-234-567-8900',
        dateOfBirth: new Date('1985-05-15'),
        employeeId: 'EMP001',
        department: 'IT',
        position: 'System Administrator',
        employmentType: 'Full-time',
        startDate: new Date('2020-01-01'),
        salary: 120000,
        currency: 'USD',
        status: 'active',
        address: {
          street: '123 Admin St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94105',
          country: 'USA'
        }
      },
      {
        firstName: 'John',
        lastName: 'Employee',
        email: 'employee@workzen.com',
        phone: '+1-234-567-8901',
        dateOfBirth: new Date('1990-03-20'),
        employeeId: 'EMP002',
        department: 'Engineering',
        position: 'Software Developer',
        employmentType: 'Full-time',
        startDate: new Date('2021-06-01'),
        salary: 95000,
        currency: 'USD',
        status: 'active'
      },
      {
        firstName: 'Sarah',
        lastName: 'HR',
        email: 'hr@workzen.com',
        phone: '+1-234-567-8902',
        dateOfBirth: new Date('1988-07-10'),
        employeeId: 'EMP003',
        department: 'HR',
        position: 'HR Manager',
        employmentType: 'Full-time',
        startDate: new Date('2020-09-15'),
        salary: 85000,
        currency: 'USD',
        status: 'active'
      },
      {
        firstName: 'Mike',
        lastName: 'Payroll',
        email: 'payroll@workzen.com',
        phone: '+1-234-567-8903',
        dateOfBirth: new Date('1987-11-25'),
        employeeId: 'EMP004',
        department: 'Finance',
        position: 'Payroll Manager',
        employmentType: 'Full-time',
        startDate: new Date('2021-03-01'),
        salary: 90000,
        currency: 'USD',
        status: 'active'
      },
      {
        firstName: 'Emily',
        lastName: 'Rodriguez',
        email: 'emily@workzen.com',
        phone: '+1-234-567-8904',
        dateOfBirth: new Date('1992-02-14'),
        employeeId: 'EMP005',
        department: 'Design',
        position: 'UX Designer',
        employmentType: 'Full-time',
        startDate: new Date('2022-01-10'),
        salary: 88000,
        currency: 'USD',
        status: 'active'
      },
      {
        firstName: 'David',
        lastName: 'Park',
        email: 'david@workzen.com',
        phone: '+1-234-567-8905',
        dateOfBirth: new Date('1989-09-30'),
        employeeId: 'EMP006',
        department: 'Engineering',
        position: 'DevOps Engineer',
        employmentType: 'Full-time',
        startDate: new Date('2021-11-01'),
        salary: 98000,
        currency: 'USD',
        status: 'active'
      }
    ]);

    console.log(`✅ Seeded ${employees.length} employees`);
  } catch (error) {
    console.error('❌ Error seeding employees:', error.message);
    throw error;
  }
};

const runSeeder = async () => {
  try {
    await connectDB();
    
    console.log('\n🌱 Starting database seeding...\n');
    
    const users = await seedUsers();
    // await seedEmployees(users);
    
    console.log('\n✅ Database seeding completed successfully!\n');
    console.log('📝 Test Credentials:');
    console.log('   Admin:       admin@workzen.com    / admin123');
    console.log('   Employee:    employee1@workzen.com / emp123');
    console.log('   HR Officer:  hr1@workzen.com       / hr1234');
    console.log('   Payroll:     payroll1@workzen.com  / pay123');
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run the seeder
runSeeder();
