# 🚀 QUICK START - MongoDB Integration

## ⚡ 3-Minute Setup

### 1. Start MongoDB
```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
```

### 2. Start Backend
```bash
cd backend
npm install    # If not done already
npm run dev
```

**✅ Success:** You should see:
```
✅ MongoDB Connected: 127.0.0.1
📊 Database: workzen_hrms
```

### 3. Seed Database
```bash
npm run seed
```

**✅ Success:** You should see:
```
✅ Seeded 6 users
✅ Seeded 6 employees
📝 Test Credentials:
   Admin:    admin@workzen.com    / admin123
   Employee: employee@workzen.com / employee123
   HR:       hr@workzen.com       / hr123
   Payroll:  payroll@workzen.com  / payroll123
```

### 4. Open MongoDB Compass
- Connect to: `mongodb://127.0.0.1:27017`
- Database: `workzen_hrms`
- You should see: `users`, `employees` collections

### 5. Test Login (Optional)
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@workzen.com","password":"admin123"}'
```

---

## 📋 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@workzen.com | admin123 |
| Employee | employee@workzen.com | employee123 |
| HR Officer | hr@workzen.com | hr123 |
| Payroll Officer | payroll@workzen.com | payroll123 |

---

## 🧪 Quick API Tests

### Login
```bash
POST http://localhost:5000/api/auth/login
Body: {"email":"admin@workzen.com","password":"admin123"}
```

### Register New User
```bash
POST http://localhost:5000/api/auth/register
Body: {
  "name": "Test User",
  "email": "test@workzen.com",
  "password": "test123",
  "role": "Employee",
  "department": "IT"
}
```

### Get All Users
```bash
GET http://localhost:5000/api/auth/users
```

---

## 📁 File Structure

```
backend/
├── config/
│   └── db.js              # MongoDB connection
├── models/
│   ├── User.js            # ✅ User authentication
│   ├── Employee.js        # ✅ Employee details
│   ├── Attendance.js      # ✅ Attendance records
│   ├── Leave.js           # ✅ Leave requests
│   ├── Payroll.js         # ✅ Payroll data
│   └── Report.js          # ✅ Generated reports
├── controllers/
│   ├── authController.js  # ✅ MongoDB integrated
│   ├── attendanceController.js
│   ├── leaveController.js
│   ├── payrollController.js
│   └── reportController.js
├── routes/
│   ├── auth.js
│   ├── attendance-simple.js
│   ├── leaves-simple.js
│   ├── payroll-simple.js
│   └── reports.js
├── scripts/
│   └── seed.js            # Database seeder
├── .env                   # Environment config
├── server.js              # ✅ Using db.js connection
└── DATABASE_INTEGRATION.md
```

---

## ✅ Features Implemented

- [x] MongoDB connection with auto-reconnect
- [x] User model with bcrypt password hashing
- [x] Employee, Attendance, Leave, Payroll, Report models
- [x] JWT authentication
- [x] Account lockout (5 failed attempts)
- [x] Leave balance tracking
- [x] Payroll calculation (HRA 40%, PF 12%, Tax 10%)
- [x] Database seeder script
- [x] All CRUD operations
- [x] Data persistence
- [x] MongoDB Compass integration

---

## 🔍 Verify Setup

### Check 1: MongoDB Running
```bash
mongosh
# Should connect successfully
```

### Check 2: Backend Connected
```bash
npm run dev
# Look for: ✅ MongoDB Connected
```

### Check 3: Collections Created
- Open MongoDB Compass
- Connect to `127.0.0.1:27017`
- Check `workzen_hrms` database exists
- Verify `users` and `employees` collections

### Check 4: Login Works
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@workzen.com","password":"admin123"}'
```
- Should return JWT token

### Check 5: Data Persists
- Stop backend (Ctrl+C)
- Restart backend (`npm run dev`)
- Login again - should still work
- Data is in MongoDB, not in-memory ✅

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "MongoDB Connection Error" | Start MongoDB service |
| "Cannot find module bcryptjs" | Run `npm install` |
| "Collection not showing" | Refresh Compass, collections created lazily |
| "Admin already exists" | Drop database or skip seed |
| "Port 5000 already in use" | Change PORT in .env |

---

## 📞 Need Help?

1. Check backend console for errors
2. Check MongoDB Compass connection
3. Verify `.env` configuration
4. Review `DATABASE_INTEGRATION.md` for details
5. Check `MONGODB_SETUP_GUIDE.md` for step-by-step instructions

---

**Database:** `workzen_hrms`  
**Connection:** `mongodb://127.0.0.1:27017/workzen_hrms`  
**Last Updated:** November 8, 2025

---

## 🎯 Next Steps

1. **Test with Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
   - Login from UI
   - Verify data flows from MongoDB → Backend → Frontend

2. **Secure Routes:**
   - Uncomment auth middleware
   - Add role-based access control

3. **Add Features:**
   - Email notifications
   - File uploads
   - Export to PDF/Excel

---

**You're all set! Happy coding! 🚀**
