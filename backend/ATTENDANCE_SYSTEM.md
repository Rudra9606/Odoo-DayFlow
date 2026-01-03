# Attendance Check-In/Check-Out System

## Overview
The WorkZen HRMS system includes a complete check-in/check-out attendance tracking system that automatically saves time records to the database and calculates work hours.

## How It Works

### 1. Employee Check-In
When an employee checks in:
- **Endpoint**: `POST /api/attendance/check-in`
- **Data Captured**:
  - Check-in time (automatically recorded)
  - GPS location (if available)
  - IP address
  - Device information (browser, platform)
  - Method (web, mobile, biometric, manual)

**Example Request:**
```json
{
  "employeeId": "507f1f77bcf86cd799439011",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "address": "Office"
  },
  "method": "web"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Check-in successful",
  "data": {
    "attendance": {
      "_id": "...",
      "employee": "507f1f77bcf86cd799439011",
      "date": "2026-01-03T00:00:00.000Z",
      "checkIn": {
        "time": "2026-01-03T09:15:30.000Z",
        "location": {...},
        "method": "web",
        "ipAddress": "192.168.1.1"
      },
      "status": "present"
    }
  }
}
```

### 2. Employee Check-Out
When an employee checks out:
- **Endpoint**: `PUT /api/attendance/check-out`
- **Data Captured**:
  - Check-out time (automatically recorded)
  - GPS location (if available)
  - IP address
  - Device information
  - **Automatic Work Hours Calculation**

**Example Request:**
```json
{
  "employeeId": "507f1f77bcf86cd799439011",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "address": "Office"
  },
  "method": "web"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Check-out successful",
  "data": {
    "attendance": {
      "_id": "...",
      "checkIn": {
        "time": "2026-01-03T09:15:30.000Z"
      },
      "checkOut": {
        "time": "2026-01-03T18:30:45.000Z"
      },
      "workHours": 9.25,
      "overtimeHours": 1.25,
      "status": "present"
    },
    "workHours": 9.25,
    "overtimeHours": 1.25
  }
}
```

## Work Hours Calculation

The system uses a **pre-save middleware** in the Attendance model that automatically calculates work hours:

```javascript
// Formula
totalTime = checkOutTime - checkInTime
workHours = (totalTime in milliseconds / (1000 * 60 * 60)) - breakTime
overtimeHours = max(0, workHours - 8)  // 8 hours is standard
```

**Example:**
- Check-in: 9:15 AM
- Check-out: 6:30 PM
- Total time: 9 hours 15 minutes = 9.25 hours
- Break time: 0 minutes
- Work hours: 9.25 hours
- Overtime: 1.25 hours (anything over 8 hours)

## Admin View - Viewing Attendance Records

### Get All Attendance Records
Admins can view all check-in/check-out records with detailed information:

**Endpoint**: `GET /api/attendance`

**Query Parameters:**
- `employeeId`: Filter by specific employee
- `startDate`: Filter from date (YYYY-MM-DD)
- `endDate`: Filter to date (YYYY-MM-DD)
- `status`: Filter by status (present, absent, late, half-day)
- `page`: Page number for pagination
- `limit`: Records per page

**Example Request:**
```
GET /api/attendance?startDate=2026-01-01&endDate=2026-01-31&limit=50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "attendance": [
      {
        "_id": "...",
        "employee": {
          "_id": "507f1f77bcf86cd799439011",
          "firstName": "John",
          "lastName": "Doe",
          "employeeId": "EMP001",
          "department": "Engineering",
          "email": "john@example.com"
        },
        "date": "2026-01-03T00:00:00.000Z",
        "checkIn": {
          "time": "2026-01-03T09:15:30.000Z",
          "location": {...},
          "method": "web"
        },
        "checkOut": {
          "time": "2026-01-03T18:30:45.000Z",
          "location": {...},
          "method": "web"
        },
        "workHours": 9.25,
        "overtimeHours": 1.25,
        "status": "present",
        "checkInTime": "9:15:30 AM",
        "checkOutTime": "6:30:45 PM",
        "workHoursFormatted": "9.25 hours",
        "dateFormatted": "1/3/2026"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "pages": 3
    }
  }
}
```

## Database Schema

The attendance records are stored in MongoDB with the following structure:

```javascript
{
  employee: ObjectId,           // Reference to User
  date: Date,                   // Date of attendance (normalized to start of day)
  checkIn: {
    time: Date,                 // Exact check-in timestamp
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    method: String,             // 'web', 'mobile', 'biometric', 'manual'
    ipAddress: String,
    deviceInfo: {
      userAgent: String,
      platform: String
    }
  },
  checkOut: {
    time: Date,                 // Exact check-out timestamp
    location: {...},
    method: String,
    ipAddress: String,
    deviceInfo: {...}
  },
  status: String,               // 'present', 'absent', 'late', 'half-day', 'on-leave'
  workHours: Number,            // Automatically calculated
  overtimeHours: Number,        // Automatically calculated
  breakTime: {
    total: Number,              // in minutes
    breaks: [...]
  },
  approved: Boolean,
  approvedBy: ObjectId,
  approvedAt: Date,
  lateMinutes: Number,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Features

### ✅ Automatic Features
- ✅ Automatic timestamp recording
- ✅ Automatic work hours calculation
- ✅ Automatic overtime calculation (over 8 hours)
- ✅ GPS location capture (if available)
- ✅ Device and IP tracking
- ✅ Late detection (after 9:15 AM)
- ✅ Duplicate check-in prevention
- ✅ Database persistence

### 🔒 Security Features
- IP address logging
- Device fingerprinting
- Location verification
- Duplicate check-in prevention (one per day)
- Check-out requires valid check-in

### 📊 Admin Capabilities
- View all employee attendance records
- Filter by date range, employee, or status
- Export attendance data
- View detailed check-in/check-out times
- Monitor work hours and overtime
- Track late arrivals
- Generate attendance reports

## Usage in Frontend

### Employee Dashboard
1. Employee logs in to their dashboard
2. Clicks "Check In" button
3. System records check-in time automatically
4. When leaving, clicks "Check Out" button
5. System records check-out time and calculates work hours
6. All data is saved to database

### Admin Dashboard
1. Admin navigates to Attendance section
2. Views all employee check-in/check-out records
3. Can filter by date range, employee, or department
4. Export reports for payroll processing

## Testing

### Test Check-In
```bash
curl -X POST http://localhost:5000/api/attendance/check-in \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "YOUR_USER_ID",
    "method": "web"
  }'
```

### Test Check-Out
```bash
curl -X PUT http://localhost:5000/api/attendance/check-out \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "YOUR_USER_ID",
    "method": "web"
  }'
```

### Verify Data Saved
```bash
curl http://localhost:5000/api/attendance?employeeId=YOUR_USER_ID
```

## Troubleshooting

### Issue: "Already checked in today"
**Cause**: Employee tried to check in multiple times on the same day.
**Solution**: System prevents duplicate check-ins. Use the existing record.

### Issue: "No check-in record found for today"
**Cause**: Employee tried to check out without checking in.
**Solution**: Must check in first before checking out.

### Issue: Work hours not calculated
**Cause**: Check-out time not recorded properly.
**Solution**: Ensure check-out request includes employeeId and completes successfully.

### Issue: Attendance not showing for admin
**Cause**: Date filter or employee ID mismatch.
**Solution**: Check query parameters and ensure dates are in YYYY-MM-DD format.

## Future Enhancements
- [ ] Break time tracking
- [ ] Shift management
- [ ] Mobile app integration
- [ ] Biometric device integration
- [ ] Geofencing for location verification
- [ ] Photo capture at check-in/check-out
- [ ] Real-time notifications
- [ ] Weekly/Monthly summary emails
