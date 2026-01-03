# MongoDB Compass Integration Guide

## ✅ WorkZen HRMS - Database Setup & Testing

This guide will help you set up MongoDB Compass and test the complete database integration.

---

## 📋 Prerequisites

1. **MongoDB installed locally**
   - Download from: https://www.mongodb.com/try/download/community
   - Ensure MongoDB service is running

2. **MongoDB Compass installed**
   - Download from: https://www.mongodb.com/try/download/compass
   - Latest version recommended

3. **Node.js and npm installed**
   - Version 16+ required

---

## 🚀 Setup Instructions

### Step 1: Start MongoDB Service

**Windows:**
```bash
# Open Command Prompt as Administrator
net start MongoDB
```

**macOS/Linux:**
```bash
sudo systemctl start mongod
# OR
sudo service mongod start
```

Verify MongoDB is running:
```bash
mongosh
# Should connect successfully
```

---

### Step 2: Connect MongoDB Compass

1. Open MongoDB Compass
2. Use connection string: `mongodb://127.0.0.1:27017`
3. Click "Connect"
4. You should see the connection established

---

### Step 3: Install Backend Dependencies

```bash
cd backend
npm install
```

This will install:
- mongoose (MongoDB ODM)
- bcryptjs (password hashing)
- jsonwebtoken (authentication)
- express, cors, helmet, etc.

---

### Step 4: Configure Environment Variables

The `.env` file has been created in the backend folder with:

```env
MONGO_URI=mongodb://127.0.0.1:27017/workzen_hrms
PORT=5000
NODE_ENV=development
JWT_SECRET=workzen-secret-key-change-in-production
JWT_EXPIRE=1d
FRONTEND_URL=http://localhost:3000
```

**Note:** Change `JWT_SECRET` in production!

---

### Step 5: Start Backend Server

```bash
cd backend
npm run dev
```

**Expected output:**
```
✅ MongoDB Connected: 127.0.0.1
📊 Database: workzen_hrms
📁 Collections: (initially empty)
WorkZen HRMS Backend server is running on port 5000
```

If you see this, MongoDB is connected successfully!

---

## 🧪 Testing Database Integration

### Test 1: Seed Admin User

**Endpoint:** `POST http://localhost:5000/api/auth/seed-admin`

**Using curl:**
```bash
curl -X POST http://localhost:5000/api/auth/seed-admin
```

**Using Postman:**
- Method: POST
- URL: `http://localhost:5000/api/auth/seed-admin`
- Click "Send"

**Expected Response:**
```json
{
  "success": true,
  "message": "Admin user created successfully",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Admin User",
    "email": "admin@workzen.com",
    "role": "Admin"
  }
}
```

**✅ Verify in MongoDB Compass:**
1. Refresh the database
2. You should see `workzen_hrms` database
3. Inside, you'll find `users` collection
4. Click on `users` → 1 document with admin details
5. Note: Password is hashed with bcrypt ✅

---

### Test 2: Register New User

**Endpoint:** `POST http://localhost:5000/api/auth/register`

**Request Body:**
```json
{
  "name": "John Employee",
  "email": "john@workzen.com",
  "password": "employee123",
  "role": "Employee",
  "department": "IT",
  "designation": "Software Developer"
}
```

**Using curl:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Employee",
    "email": "john@workzen.com",
    "password": "employee123",
    "role": "Employee",
    "department": "IT",
    "designation": "Software Developer"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439012",
    "name": "John Employee",
    "email": "john@workzen.com",
    "role": "Employee",
    "department": "IT",
    "designation": "Software Developer"
  }
}
```

**✅ Verify in MongoDB Compass:**
- Refresh `users` collection
- You should now see 2 documents (Admin + John)
- Password is hashed ✅

---

### Test 3: Login

**Endpoint:** `POST http://localhost:5000/api/auth/login`

**Request Body:**
```json
{
  "email": "admin@workzen.com",
  "password": "admin123"
}
```

**Using curl:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@workzen.com",
    "password": "admin123"
  }'
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
    "role": "Admin",
    "department": "IT",
    "designation": "System Administrator",
    "leaveBalance": {
      "annual": 12,
      "sick": 10,
      "personal": 5,
      "casual": 7
    }
  }
}
```

**✅ Verify in MongoDB Compass:**
- Open the admin user document
- Check `lastLogin` field - should be updated to current timestamp ✅

---

### Test 4: Create Attendance Record

**Endpoint:** `POST http://localhost:5000/api/attendance`

**Request Body:**
```json
{
  "employee": "507f1f77bcf86cd799439011",
  "date": "2025-11-08",
  "checkIn": {
    "time": "2025-11-08T09:00:00Z",
    "method": "web"
  },
  "status": "present",
  "workHours": 8
}
```

**✅ Verify in MongoDB Compass:**
- New `attendances` collection created
- Document with check-in details stored ✅

---

### Test 5: Apply for Leave

**Endpoint:** `POST http://localhost:5000/api/leave`

**Request Body:**
```json
{
  "employee": "507f1f77bcf86cd799439011",
  "leaveType": "annual",
  "startDate": "2025-12-10",
  "endDate": "2025-12-14",
  "duration": 5,
  "reason": "Family vacation"
}
```

**✅ Verify in MongoDB Compass:**
- New `leaves` collection created
- Leave request with status "pending" ✅

---

### Test 6: Generate Payroll

**Endpoint:** `POST http://localhost:5000/api/payroll/generate`

**Request Body:**
```json
{
  "employee": "507f1f77bcf86cd799439011",
  "startDate": "2025-11-01",
  "endDate": "2025-11-30"
}
```

**✅ Verify in MongoDB Compass:**
- New `payrolls` collection created
- Payroll record with calculations (HRA, PF, tax, net pay) ✅

---

## 📊 Expected Collections in MongoDB Compass

After running all tests, you should see these collections in `workzen_hrms` database:

1. **users** - User accounts (authentication)
2. **employees** - Detailed employee records
3. **attendances** - Daily attendance tracking
4. **leaves** - Leave requests and approvals
5. **payrolls** - Payroll records
6. **reports** - Generated reports (on-demand)

---

## 🔍 Verify Data Persistence

1. **Stop the backend server** (Ctrl+C)
2. **Restart the server** (`npm run dev`)
3. **Login again** - Your user data should still be there
4. **Check MongoDB Compass** - All collections and documents persist ✅

This confirms data is stored in MongoDB, not in-memory!

---

## 🧹 Reset Database (if needed)

To start fresh:

```bash
# In MongoDB Compass:
# 1. Right-click on "workzen_hrms" database
# 2. Select "Drop Database"
# 3. Restart backend server
# 4. Re-run POST /api/auth/seed-admin
```

---

## 🔧 Troubleshooting

### Issue: "MongoDB Connection Error"

**Solution:**
1. Check MongoDB service is running:
   ```bash
   # Windows
   net start MongoDB
   
   # macOS/Linux
   sudo systemctl status mongod
   ```

2. Verify port 27017 is not blocked:
   ```bash
   netstat -an | findstr 27017
   ```

3. Try alternative connection string:
   ```
   mongodb://localhost:27017/workzen_hrms
   ```

---

### Issue: "Collection not showing in Compass"

**Solution:**
- Click the refresh icon in MongoDB Compass
- Collections are created lazily (only when first document is inserted)
- Try creating a document via API first

---

### Issue: "Cannot find module 'bcryptjs'"

**Solution:**
```bash
cd backend
npm install
```

---

## 📖 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| GET | `/api/auth/users` | Get all users | No (should be Yes) |
| POST | `/api/auth/seed-admin` | Create admin user | No |

### Attendance Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/attendance` | Get all attendance records |
| GET | `/api/attendance/:id` | Get single attendance record |
| POST | `/api/attendance` | Create attendance record |
| PUT | `/api/attendance/:id` | Update attendance record |
| DELETE | `/api/attendance/:id` | Delete attendance record |

### Leave Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leave` | Get all leave requests |
| GET | `/api/leave/:id` | Get single leave request |
| POST | `/api/leave` | Apply for leave |
| PUT | `/api/leave/:id` | Update leave request |
| PUT | `/api/leave/:id/approve` | Approve leave |
| PUT | `/api/leave/:id/reject` | Reject leave |
| DELETE | `/api/leave/:id` | Delete leave request |

### Payroll Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payroll` | Get all payroll records |
| GET | `/api/payroll/:id` | Get single payroll record |
| POST | `/api/payroll/generate` | Generate payroll |
| PUT | `/api/payroll/:id` | Update payroll |
| DELETE | `/api/payroll/:id` | Delete payroll |

### Report Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports` | List available reports |
| POST | `/api/reports/payroll-summary` | Generate payroll report |
| POST | `/api/reports/attendance` | Generate attendance report |
| POST | `/api/reports/leave` | Generate leave report |
| POST | `/api/reports/employee` | Generate employee report |

---

## ✅ Success Checklist

- [ ] MongoDB service running
- [ ] MongoDB Compass connected to `127.0.0.1:27017`
- [ ] Backend server starts with "✅ MongoDB Connected"
- [ ] Admin user created successfully
- [ ] New user registration works
- [ ] Login returns JWT token
- [ ] Data persists in MongoDB Compass
- [ ] Collections visible in Compass
- [ ] Password is hashed (not plain text)
- [ ] Attendance records created
- [ ] Leave requests created
- [ ] Payroll generation works

---

## 🎯 Next Steps

1. **Test with Frontend:**
   - Start frontend: `cd frontend && npm run dev`
   - Login from UI
   - Verify data flows from MongoDB → Backend → Frontend

2. **Implement Auth Middleware:**
   - Protect routes with JWT verification
   - Add role-based access control

3. **Add More Features:**
   - File upload for leave documents
   - Email notifications
   - Export reports to PDF/Excel

---

## 📞 Support

If you encounter issues:
1. Check backend console for errors
2. Check MongoDB Compass connection
3. Verify `.env` configuration
4. Check `backend/config/db.js` connection string

**Database Name:** `workzen_hrms`  
**Connection String:** `mongodb://127.0.0.1:27017/workzen_hrms`

---

**Last Updated:** November 8, 2025
