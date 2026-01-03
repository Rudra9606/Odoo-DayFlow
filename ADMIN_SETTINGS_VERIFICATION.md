# Admin Settings - Quick Verification Checklist

## ✅ What You Should See in Settings Page

### 1. **Page Header**
```
Settings & User Management
Total Users: [NUMBER]
```

### 2. **Currently Logged-In User Card**
Shows a highlighted card with:
- User's avatar with initials
- "Currently Logged In" label
- Full name
- Role badge (e.g., "Admin")
- Email address
- Employee ID
- Department

Example:
```
┌─────────────────────────────────────┐
│ [R]  Currently Logged In            │
│ Rudra Kumar                          │
│ [Admin] rudra@company.com           │
│ Employee ID: EMP001                 │
│ Engineering                         │
└─────────────────────────────────────┘
```

### 3. **User Statistics Cards** (3 Cards)
```
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Total    │  │ Active   │  │ Inactive │
│ Users    │  │ Users    │  │ Users    │
│    12    │  │    10    │  │    2     │
└──────────┘  └──────────┘  └──────────┘
```

### 4. **User Management Section**
- Header with "User Management" title
- Refresh button (⟲ icon) to reload data
- "Add User" button (blue)
- User table with columns:
  - User (name + ID)
  - Email
  - Role (dropdown)
  - Department
  - Status (Active/Inactive toggle)
  - Actions (Edit/Delete buttons)

## 🧪 Step-by-Step Testing

### Step 1: Open Settings
1. Login as Admin
2. Click "Settings" in sidebar
3. **Verify**: Page loads and shows all sections

### Step 2: Check Logged-In User
1. Look at the gradient card at top
2. **Verify**: Your name, role, email are displayed
3. **Verify**: Employee ID and department are shown

### Step 3: Check User Count
1. Look at header text "Total Users: X"
2. Scroll to statistics cards
3. **Verify**: Total count matches sum of active + inactive
4. **Verify**: Numbers are not zero (at least you exist!)

### Step 4: Check User List
1. Scroll to User Management table
2. **Verify**: Users appear in the table
3. **Verify**: Number of rows ≈ Total Users count
4. **Verify**: Each user shows: name, email, role, department, status

### Step 5: Test Refresh Button
1. Click the refresh button (⟲) next to "User Management"
2. **Verify**: Table refreshes and data is current
3. **Verify**: User count doesn't change (if no new users added)

### Step 6: Test User Operations
1. **Add User**: Click "Add User" button
   - Fill form and submit
   - **Verify**: New user appears in table
   - **Verify**: Total count increases

2. **Edit User**: Click edit button (pencil icon)
   - Change user role
   - **Verify**: Role updates immediately

3. **Change Status**: Click status button
   - Toggle Active/Inactive
   - **Verify**: Status changes
   - **Verify**: Active/Inactive counts update

4. **Delete User**: Click delete button (trash icon)
   - Confirm deletion
   - **Verify**: User disappears from table
   - **Verify**: Total count decreases

## 🔍 Troubleshooting

### Problem: "No users found" message shows
**Solution**:
1. Check if users exist in database:
   ```bash
   mongosh
   use workzen
   db.users.find().count()
   ```
2. Click refresh button
3. Check browser console for errors (F12)
4. Verify API endpoint is working:
   ```bash
   curl http://localhost:5000/api/users
   ```

### Problem: Logged-in user card doesn't show
**Solution**:
1. Check localStorage (F12 → Application → Local Storage)
2. Verify `workzen_user` key exists
3. Re-login to refresh user data

### Problem: User count shows 0
**Solution**:
1. Add a user using "Add User" button
2. Check database connection
3. Verify backend is running

### Problem: Changes don't reflect immediately
**Solution**:
1. Click refresh button manually
2. Check if API request is returning data
3. Check browser console for JavaScript errors

## 📊 Expected Data Structure

When you see a user in the table, it should have:
```javascript
{
  _id: "507f1f77bcf86cd799439011",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  role: "Employee",
  department: "IT",
  employeeId: "EMP001",
  isActive: true,
  createdAt: "2025-12-01T10:00:00Z",
  updatedAt: "2026-01-03T14:30:00Z"
}
```

## 📈 Verification Metrics

After implementation:
- ✅ Logged-in user display: Should show always
- ✅ Total users count: Should be > 0
- ✅ Active users: Should be counted correctly
- ✅ Inactive users: Should be counted correctly
- ✅ User list: Should fetch from database
- ✅ Refresh button: Should reload data
- ✅ All user operations: Should work (add/edit/delete)

## 🎯 Success Criteria

You'll know everything is working when:
1. ✅ Settings page shows your logged-in user details
2. ✅ User count is displayed and > 0
3. ✅ User table is populated with users from database
4. ✅ Statistics cards show correct numbers
5. ✅ Refresh button works
6. ✅ Can add/edit/delete users
7. ✅ Changes appear immediately

## 📞 Common Questions

**Q: Why don't I see any users?**
A: Check if users exist in the database. If the database is empty, use "Add User" to create test users.

**Q: Can I edit my own role?**
A: You can, but be careful - changing your own role might lock you out of admin features.

**Q: Where is the logout button?**
A: Click your avatar/initials in the top-right corner of the page.

**Q: How do I know if the data is fresh?**
A: The data fetches automatically on page load and after any changes. Click refresh to get the latest data anytime.
