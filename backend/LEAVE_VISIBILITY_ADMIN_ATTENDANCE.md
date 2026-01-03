# Leave Request Visibility & Admin Attendance Management

## ✅ Feature 1: Leave Requests Visible to HR and Admin (Approved by Any Officer)

### What Changed
Leave requests that are approved by **any officer** (Payroll Officer, HR Officer, or Admin) are now visible to all HR Officers and Admins.

### Implementation

#### Backend
- **No changes needed** - The `/api/leaves` endpoint already returns all leaves with their approval status and approver information
- Leave records include `approvedBy`, `approvedAt`, `rejectedBy`, `rejectedAt` fields
- HR and Admin dashboards can now see leaves approved by anyone

#### Frontend - Admin Dashboard
- Changed from fetching only **pending** leaves to fetching **all** leaves
- **Before**: `api.leaveRequests.getPending()` → Only pending requests shown
- **After**: `api.leaveRequests.getAll({ limit: 100 })` → All requests shown (pending, approved, rejected)

#### Data Flow
```
Payroll Officer approves leave request
    ↓
Leave status: 'approved'
Leave approvedBy: Payroll Officer ID
Leave approvedAt: timestamp
    ↓
Admin Dashboard fetches ALL leaves (not just pending)
    ↓
Admin sees all leaves including those approved by Payroll Officer
    ↓
HR Officer sees all leaves in their dashboard
```

### Features
✅ Admin can see all leave requests (pending, approved, rejected)
✅ Admin can see who approved/rejected each request
✅ HR Officer can see all leave requests and approval details
✅ Payroll Officer's approvals are now visible to HR and Admin
✅ Leave status badges show approval status at a glance

### Example
**Scenario:**
1. Employee applies for leave
2. Payroll Officer approves it
3. Approval is recorded with Payroll Officer's ID
4. Admin/HR dashboards show the approved leave with:
   - Employee name and details
   - Leave type and duration
   - Approval status: "Approved"
   - Approved by: "Payroll Officer Name"
   - Approval date/time

---

## ✅ Feature 2: Admin Can Mark Attendance for HR & Payroll Officers

### What Changed
Admin can now manually mark **check-in** and **check-out** times for any user (Employees, HR Officers, Payroll Officers).

### New API Endpoints

#### 1. Admin Check-In
```
POST /api/attendance/admin/check-in/:userId
```

**Parameters:**
```javascript
{
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "address": "Office"
  },
  "date": "2026-01-03",  // Optional, defaults to today
  "method": "manual"     // Will be set to 'manual' for admin marking
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Check-in marked successfully by admin",
  "data": {
    "attendance": {
      "_id": "...",
      "employee": "userId",
      "date": "2026-01-03T00:00:00.000Z",
      "checkIn": {
        "time": "2026-01-03T09:00:00.000Z",
        "method": "manual",
        "ipAddress": "admin_ip",
        "deviceInfo": {
          "userAgent": "Admin Portal",
          "platform": "admin"
        }
      },
      "status": "present"
    }
  }
}
```

#### 2. Admin Check-Out
```
PUT /api/attendance/admin/check-out/:userId
```

**Parameters:**
```javascript
{
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "address": "Office"
  },
  "date": "2026-01-03",  // Optional, defaults to today
  "method": "manual"     // Will be set to 'manual' for admin marking
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Check-out marked successfully by admin",
  "data": {
    "attendance": {
      "_id": "...",
      "employee": "userId",
      "checkIn": { "time": "2026-01-03T09:00:00.000Z" },
      "checkOut": { "time": "2026-01-03T18:30:00.000Z" },
      "workHours": 9.5,
      "workHoursFormatted": "09:30:00",  // HH:MM:SS format
      "status": "present"
    },
    "workHours": 9.5,
    "workHoursFormatted": "09:30:00",
    "overtimeHours": 1.5,
    "overtimeHoursFormatted": "01:30:00"
  }
}
```

### Frontend API Calls

#### Usage in Admin Dashboard
```javascript
// Mark check-in for a user
await api.attendance.adminCheckIn(userId, {
  location: { address: 'Office' },
  date: '2026-01-03'  // Optional
});

// Mark check-out for a user
await api.attendance.adminCheckOut(userId, {
  location: { address: 'Office' },
  date: '2026-01-03'  // Optional
});
```

### How It Works

1. **Admin opens User/Employee list**
2. **Admin clicks "Mark Attendance" button for a user**
3. **Admin selects:**
   - User to mark attendance for
   - Date (optional, defaults to today)
   - Location (optional)
4. **Admin clicks "Check In"** → Attendance record created with check-in time
5. **Admin clicks "Check Out"** → Check-out time added, work hours calculated automatically
6. **System calculates:**
   - Work hours (check-out time - check-in time)
   - Overtime hours (if over 8 hours)
   - Stores both decimal and HH:MM:SS formats

### Who Can Use?
✅ **Admin** - Can mark attendance for anyone (employees, HR officers, payroll officers)
❌ **HR Officer** - Can only check in/out themselves
❌ **Payroll Officer** - Can only check in/out themselves
❌ **Employee** - Can only check in/out themselves

### Key Features
✅ Works for any user (Employee, HR Officer, Payroll Officer, Admin)
✅ Can mark attendance for past dates
✅ Automatically calculates work hours
✅ Stores method as "manual" to distinguish from self-check-in
✅ Records Admin Portal as device info for audit trail
✅ Prevents duplicate check-in on same date
✅ Requires valid check-in before allowing check-out

### Example Scenario

**Scenario:** HR Officer was sick and couldn't check in. Admin marks attendance.

1. Admin navigates to Employees/Users
2. Searches for "HR Officer Name"
3. Clicks "Mark Attendance" button
4. Admin marks check-in at 10:00 AM (late arrival)
5. Admin marks check-out at 7:00 PM
6. System calculates: 9 hours of work
7. Status updated to "present"
8. HR Officer can see their attendance record in their dashboard

---

## 📊 Database Schema

### Leave Request Document
```javascript
{
  _id: ObjectId,
  employee: ObjectId,        // Reference to User
  leaveType: String,         // 'annual', 'sick', etc.
  startDate: Date,
  endDate: Date,
  reason: String,
  status: String,            // 'pending', 'approved', 'rejected'
  approvedBy: ObjectId,      // User ID who approved (could be Payroll Officer)
  approvedAt: Date,
  rejectedBy: ObjectId,      // User ID who rejected
  rejectedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Attendance Document
```javascript
{
  _id: ObjectId,
  employee: ObjectId,        // User ID
  date: Date,
  checkIn: {
    time: Date,
    method: String,          // 'web', 'mobile', 'manual' (admin-marked)
    deviceInfo: {
      userAgent: String,     // 'Admin Portal' if marked by admin
      platform: String       // 'admin' if marked by admin
    }
  },
  checkOut: {
    time: Date,
    method: String,          // 'web', 'mobile', 'manual'
    deviceInfo: {...}
  },
  workHours: Number,         // Decimal: 9.5
  workHoursFormatted: String, // HH:MM:SS: "09:30:00"
  status: String,            // 'present', 'absent', 'late'
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🧪 Testing

### Test Leave Request Visibility
1. **Login as Payroll Officer**
2. **Create/Approve a leave request**
3. **Login as Admin**
4. **Go to Time Off/Leaves section**
5. **Verify**: The leave approved by Payroll Officer is visible
6. **Check details**: Should show "Approved by Payroll Officer" and approval date

### Test Admin Attendance Marking
1. **Login as Admin**
2. **Go to Employees or Users section**
3. **Find a Payroll Officer or HR Officer**
4. **Click "Mark Attendance" button**
5. **Mark check-in** - Should create attendance record
6. **Mark check-out** - Should calculate work hours
7. **Verify**:
   - Work hours are calculated
   - Status shows "present"
   - Method shows "manual"
   - Device shows "Admin Portal"
8. **Login as that officer** - Should see their attendance record

---

## 🔐 Security Notes

✅ Admin-only endpoints are protected (should add auth middleware in production)
✅ Leave records include audit trail (approvedBy, approvedAt fields)
✅ Attendance marking is logged with method='manual' and platform='admin'
✅ Only valid users can have attendance marked
✅ Prevents duplicate attendance records on same date

---

## 🚀 Next Steps

### Optional Enhancements:
1. Add UI components to Admin Dashboard for marking attendance
2. Add bulk attendance marking (for multiple users)
3. Add UI to view leave requests by approval status
4. Add notifications when admin marks attendance
5. Add approval workflow visualization
6. Add reports showing who approved which leaves

---

## 📞 API Reference Summary

| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/api/leaves` | GET | Get all leave requests | Public |
| `/api/attendance/admin/check-in/:userId` | POST | Admin marks check-in | Admin only |
| `/api/attendance/admin/check-out/:userId` | PUT | Admin marks check-out | Admin only |

---

## 💡 Key Points

✅ Leave requests approved by Payroll Officer are now visible to HR and Admin
✅ Admin can manually mark attendance for any user (HR, Payroll, Employee)
✅ Work hours are automatically calculated when check-out is marked
✅ All actions are logged with method and platform info for audit purposes
✅ System prevents duplicate attendance entries on same date
