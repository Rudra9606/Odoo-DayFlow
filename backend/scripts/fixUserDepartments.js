/**
 * Fix User Departments Script
 * Sets department to null for Admin users and ensures all users can save without validation errors
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dayflow_hrms', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

const fixDepartments = async () => {
  try {
    console.log('🔧 Starting department fix...\n');

    // Find all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users\n`);

    let fixedCount = 0;

    for (const user of users) {
      let needsUpdate = false;
      const updates = {};

      // If user is Admin and has no department, set it to null
      if (user.role === 'Admin' && !user.department) {
        updates.department = null;
        needsUpdate = true;
      }

      // If user has department but it's undefined
      if (user.department === undefined) {
        updates.department = null;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await User.updateOne(
          { _id: user._id },
          { $set: updates },
          { runValidators: false } // Skip validation during fix
        );
        console.log(`✅ Fixed user: ${user.email} (${user.role})`);
        fixedCount++;
      }
    }

    console.log(`\n🎉 Department fix complete!`);
    console.log(`📊 Total users: ${users.length}`);
    console.log(`✅ Users fixed: ${fixedCount}`);
    console.log(`⏭️  Users unchanged: ${users.length - fixedCount}`);

  } catch (error) {
    console.error('❌ Error fixing departments:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the fix
connectDB().then(() => fixDepartments());
