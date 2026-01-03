# 🗄️ MongoDB Database Integration - Complete Setup

## Overview

This document outlines the complete MongoDB integration for WorkZen HRMS using MongoDB Compass (local MongoDB instance).

---

## ✅ What's Implemented

### 1. Database Configuration
- **File:** `backend/config/db.js`
- **Connection String:** `mongodb://127.0.0.1:27017/workzen_hrms`
- **Features:**
  - Auto-reconnect on failure
  - Connection event logging
  - Graceful shutdown handling
  - Collection listing on startup

### 2. Mongoose Models

| Model | File | Description |
|-------|------|-------------|
| **User** | `models/User.js` | Authentication & user accounts |
| **Employee** | `models/Employee.js` | Detailed employee records |
| **Attendance** | `models/Attendance.js` | Daily attendance tracking |
| **Leave** | `models/Leave.js` | Leave requests & approvals |
| **Payroll** | `models/Payroll.js` | Payroll generation & processing |
| **Report** | `models/Report.js` | Generated reports storage |

### 3. Updated Controllers

#### AuthController (`controllers/authController.js`)
✅ **MongoDB Integration Complete**

**Functions:**
- `register(req, res)` - Create new user with bcrypt password hashing
- `login(req, res)` - Authenticate with JWT token generation
- `getMe(req, res)` - Get current user profile
- `getAllUsers(req, res)` - List all users (admin only)
- `seedAdmin(req, res)` - Create initial admin user

**Features:**
- Password hashing with bcryptjs
- JWT token generation
- Account lockout after 5 failed attempts
- Login attempt tracking
- Last login timestamp

#### AttendanceController (`controllers/attendanceController.js`)
✅ **MongoDB Integration Complete**

**Functions:**
- `getAttendance(req, res)` - List with filters & pagination
- `getAttendanceById(req, res)` - Single record
- `createAttendance(req, res)` - Mark attendance
- `updateAttendance(req, res)` - Update record
- `deleteAttendance(req, res)` - Remove record
- `markAttendance(req, res)` - Legacy endpoint

**Features:**
- Duplicate prevention (employee + date)
- Aggregation for summary stats
- Populate employee details
- Date range filtering

#### LeaveController (`controllers/leaveController.js`)
✅ **MongoDB Integration Complete**

**Functions:**
- `getLeaves(req, res)` - List with filters
- `getLeaveById(req, res)` - Single leave request
- `applyLeave(req, res)` - Submit leave request
- `updateLeave(req, res)` - Modify pending request
- `approveLeave(req, res)` - Approve & deduct balance
- `rejectLeave(req, res)` - Reject with reason
- `deleteLeave(req, res)` - Remove request

**Features:**
- Leave balance deduction on approval
- Duration calculation (including half-days)
- Status workflow (pending → approved/rejected)
- Populate approver details

#### PayrollController (`controllers/payrollController.js`)
✅ **MongoDB Integration Complete**

**Functions:**
- `getPayroll(req, res)` - List all payroll records
- `getPayrollById(req, res)` - Single payroll
- `processPayroll(req, res)` - Generate with calculations
- `updatePayroll(req, res)` - Update payment status
- `deletePayroll(req, res)` - Remove record
- `getPayslips(req, res)` - Employee payslips

**Features:**
- Automatic payroll calculation:
  - HRA: 40% of basic salary
  - PF: 12% (employee + employer)
  - Income Tax: 10% (simplified)
  - Net Pay = Gross - Deductions
- Duplicate prevention (employee + period)
- Payment status tracking

#### ReportController (`controllers/reportController.js`)
✅ **MongoDB Integration Complete**

**Functions:**
- `generatePayrollSummary(req, res)` - Payroll analytics
- `generateAttendanceReport(req, res)` - Attendance stats
- `generateLeaveReport(req, res)` - Leave analytics
- `generateEmployeeReport(req, res)` - Employee stats
- `getReports(req, res)` - Available reports

**Features:**
- On-demand report generation
- Department-wise grouping
- Summary statistics
- Date range filtering

---

## 🚀 Quick Start

### Step 1: Prerequisites

1. **MongoDB installed and running**
   ```bash
   # Check if MongoDB is running
   mongosh
   ```

2. **MongoDB Compass installed**
   - Connect to: `mongodb://127.0.0.1:27017`

### Step 2: Install Dependencies

```bash
cd backend
npm install
```

### Step 3: Environment Setup

The `.env` file is already created with:
```env
MONGO_URI=mongodb://127.0.0.1:27017/workzen_hrms
PORT=5000
JWT_SECRET=workzen-secret-key-change-in-production
```

### Step 4: Start Backend

```bash
npm run dev
```

**Expected Output:**
```
✅ MongoDB Connected: 127.0.0.1
📊 Database: workzen_hrms
📁 Collections: None yet
🔗 Mongoose connected to MongoDB
WorkZen HRMS Backend server is running on port 5000
```

### Step 5: Seed Database (Option A)

**Using NPM Script:**
```bash
npm run seed
```

This will create:
- 6 test users (Admin, Employee, HR, Payroll, etc.)
- 6 employee records
- All with hashed passwords

**Test Credentials:**
```
Admin:    admin@workzen.com    / admin123
Employee: employee@workzen.com / employee123
HR:       hr@workzen.com       / hr123
Payroll:  payroll@workzen.com  / payroll123
```

### Step 6: Seed Database (Option B - API)

**Create Admin User:**
```bash
curl -X POST http://localhost:5000/api/auth/seed-admin
```

**Register Additional Users:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@workzen.com",
    "password": "employee123",
    "role": "Employee",
    "department": "IT",
    "designation": "Developer"
  }'
```

---

## 📊 Verify in MongoDB Compass

1. **Open MongoDB Compass**
2. **Connect to:** `mongodb://127.0.0.1:27017`
3. **Select Database:** `workzen_hrms`

### Expected Collections:

#### 1. `users` Collection
**Sample Document:**
```json
{
  "_id": "ObjectId(...)",
  "name": "Admin User",
  "email": "admin@workzen.com",
  "password": "$2a$10$...", // Hashed
  "role": "Admin",
  "department": "IT",
  "designation": "System Administrator",
  "leaveBalance": {
    "annual": 12,
    "sick": 10,
    "personal": 5,
    "casual": 7
  },
  "isActive": true,
  "isVerified": true,
  "loginAttempts": 0,
  "lastLogin": "2025-11-08T...",
  "createdAt": "2025-11-08T...",
  "updatedAt": "2025-11-08T..."
}
```

#### 2. `employees` Collection
**Sample Document:**
```json
{
  "_id": "ObjectId(...)",
  "firstName": "John",
  "lastName": "Employee",
  "email": "employee@workzen.com",
  "phone": "+1-234-567-8901",
  "employeeId": "EMP002",
  "department": "Engineering",
  "position": "Software Developer",
  "salary": 95000,
  "status": "active",
  "startDate": "2021-06-01T...",
  "createdAt": "2025-11-08T...",
  "updatedAt": "2025-11-08T..."
}
```

#### 3. `attendances` Collection
**Sample Document:**
```json
{
  "_id": "ObjectId(...)",
  "employee": "ObjectId(...)", // Reference to Employee
  "date": "2025-11-08T00:00:00.000Z",
  "checkIn": {
    "time": "2025-11-08T09:00:00.000Z",
    "method": "web",
    "ipAddress": "::1"
  },
  "checkOut": {
    "time": "2025-11-08T18:00:00.000Z",
    "method": "web"
  },
  "status": "present",
  "workHours": 8,
  "createdAt": "2025-11-08T...",
  "updatedAt": "2025-11-08T..."
}
```

#### 4. `leaves` Collection
**Sample Document:**
```json
{
  "_id": "ObjectId(...)",
  "employee": "ObjectId(...)",
  "leaveType": "annual",
  "startDate": "2025-12-10T00:00:00.000Z",
  "endDate": "2025-12-14T00:00:00.000Z",
  "duration": 5,
  "reason": "Family vacation",
  "status": "pending",
  "appliedDate": "2025-11-08T...",
  "createdAt": "2025-11-08T...",
  "updatedAt": "2025-11-08T..."
}
```

#### 5. `payrolls` Collection
**Sample Document:**
```json
{
  "_id": "ObjectId(...)",
  "employee": "ObjectId(...)",
  "payPeriod": {
    "startDate": "2025-11-01T...",
    "endDate": "2025-11-30T..."
  },
  "basicSalary": 95000,
  "earnings": {
    "allowances": {
      "hra": 38000,
      "conveyance": 1600,
      "medical": 1250
    }
  },
  "deductions": {
    "providentFund": {
      "employee": 11400,
      "employer": 11400
    },
    "tax": {
      "incomeTax": 9500
    }
  },
  "grossEarnings": 135850,
  "netPay": 114950,
  "paymentStatus": "processing",
  "createdAt": "2025-11-08T...",
  "updatedAt": "2025-11-08T..."
}
```

---

## 🧪 API Testing

### 1. Test Authentication

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@workzen.com","password":"admin123"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Admin User",
    "email": "admin@workzen.com",
    "role": "Admin"
  }
}
```

### 2. Test Attendance

**Create Attendance:**
```bash
curl -X POST http://localhost:5000/api/attendance \
  -H "Content-Type: application/json" \
  -d '{
    "employee": "EMPLOYEE_ID_HERE",
    "date": "2025-11-08",
    "checkIn": {"time": "2025-11-08T09:00:00Z", "method": "web"},
    "status": "present",
    "workHours": 8
  }'
```

### 3. Test Leave

**Apply Leave:**
```bash
curl -X POST http://localhost:5000/api/leave \
  -H "Content-Type: application/json" \
  -d '{
    "employee": "EMPLOYEE_ID_HERE",
    "leaveType": "annual",
    "startDate": "2025-12-10",
    "endDate": "2025-12-14",
    "duration": 5,
    "reason": "Family vacation"
  }'
```

### 4. Test Payroll

**Generate Payroll:**
```bash
curl -X POST http://localhost:5000/api/payroll/generate \
  -H "Content-Type: application/json" \
  -d '{
    "employee": "EMPLOYEE_ID_HERE",
    "startDate": "2025-11-01",
    "endDate": "2025-11-30"
  }'
```

---

## 🔐 Security Features

### Password Security
- ✅ Passwords hashed with bcryptjs (salt rounds: 10)
- ✅ Never stored in plain text
- ✅ Not included in API responses

### JWT Authentication
- ✅ Secure token generation
- ✅ 1-day expiration (configurable)
- ✅ Role-based access embedded in token

### Account Security
- ✅ Account lockout after 5 failed attempts
- ✅ 2-hour lock duration
- ✅ Login attempt tracking
- ✅ Last login timestamp

---

## 📈 Database Indexes

### Optimized Queries
All models include indexes for common queries:

**User Model:**
- `email` (unique)

**Employee Model:**
- `email` (unique)
- `employeeId` (unique)

**Attendance Model:**
- `employee + date` (compound, unique)
- `date`, `status`, `approved`

**Leave Model:**
- `employee + startDate`
- `status`, `leaveType`
- `startDate + endDate`

**Payroll Model:**
- `employee + payPeriod.startDate`
- `paymentStatus`

---

## 🧹 Database Maintenance

### Reset Database
```bash
# In MongoDB Compass:
# Right-click "workzen_hrms" → Drop Database
# Then re-run: npm run seed
```

### Backup Database
```bash
mongodump --db workzen_hrms --out ./backup
```

### Restore Database
```bash
mongorestore --db workzen_hrms ./backup/workzen_hrms
```

---

## 🔧 Troubleshooting

### Connection Errors
1. Ensure MongoDB service is running
2. Check port 27017 is available
3. Try alternative connection: `mongodb://localhost:27017/workzen_hrms`

### Seed Script Fails
```bash
# Clear existing data first
mongosh workzen_hrms --eval "db.dropDatabase()"
# Then re-run
npm run seed
```

### Collection Not Visible
- Collections are created lazily (on first document insert)
- Refresh MongoDB Compass
- Try creating a test document via API

---

## ✅ Acceptance Criteria

All criteria met:

- [x] MongoDB Compass connected to `workzen_hrms` database
- [x] All models created with proper schemas
- [x] Controllers updated to use MongoDB
- [x] Authentication with bcrypt + JWT
- [x] Leave approvals update employee balance
- [x] Payroll generation with calculations
- [x] Data persists across server restarts
- [x] Password hashing works
- [x] Frontend can read/write to database
- [x] No documentation files altered

---

## 📚 Additional Resources

- **MongoDB Compass Guide:** [MONGODB_SETUP_GUIDE.md](./MONGODB_SETUP_GUIDE.md)
- **API Documentation:** See MONGODB_SETUP_GUIDE.md
- **Model Schemas:** Check individual model files in `models/`

---

**Database:** `workzen_hrms`  
**Connection:** `mongodb://127.0.0.1:27017/workzen_hrms`  
**Last Updated:** November 8, 2025
