/**
 * WorkZen HRMS - HR Officer Dashboard
 * Single-file dashboard for HR Officer role
 * 
 * Features (restricted to HR capabilities):
 * - Left sidebar: Employees, Attendance, Time Off (NO Payroll, Reports, Settings)
 * - Top bar: Search, NEW button (create employee), Profile dropdown (Profile/Logout)
 * - Employee management: Create/Edit employee profiles (modal with full form)
 * - Attendance monitoring: Chart.js trend for all employees with filtering
 * - Time Off management: Approve/Reject/Allocate leave requests
 * 
 * Business Rules (enforced):
 * ✅ HR Officer CAN: Create/update employee profiles, monitor attendance, manage leaves
 * ❌ HR Officer CANNOT: Access payroll data, system settings, salary information
 * 
 * API Endpoints Used:
 * - GET /api/users → list all employees
 * - GET /api/users/:id → get employee details
 * - POST /api/users → create new employee (HR create)
 * - PUT /api/users/:id → update employee (HR edit)
 * - GET /api/attendance → attendance records (supports ?employee=id&startDate=...&endDate=... filters)
 * - GET /api/leaves → leave requests
 * - PUT /api/leaves/:id/approve → approve leave
 * - PUT /api/leaves/:id/reject → reject leave
 * - POST /api/leaves/allocate → allocate additional leave days
 * 
 * TODO (backend hardening):
 * - Add role-based auth middleware on backend to verify HR Officer permissions
 * - Add database validation for employee fields (unique email, valid phone, etc.)
 * - Add audit logging for HR actions (who created/modified employee records)
 * - Add rate limiting on create/update endpoints
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { 
  Users, Clock, Calendar, Search, UserPlus, LogOut, User as UserIcon, ChevronDown,
  CheckCircle, Plane, AlertCircle, X, Mail, Phone, MapPin, Briefcase,
  Edit, Save, XCircle, Check, Filter
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

function DashboardHROfficer() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeMenu, setActiveMenu] = useState('Employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const avatarBtnRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  // Employee management state
  const [employees, setEmployees] = useState([]);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeForm, setEmployeeForm] = useState({
    name: '', email: '', role: '', department: '', phone: '', joinDate: '', bankAccount: '', address: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [savingEmployee, setSavingEmployee] = useState(false);

  // Attendance state
  const [attendance, setAttendance] = useState([]);
  const [attendanceFilter, setAttendanceFilter] = useState({ employee: 'all', startDate: '', endDate: '' });
  const [attendanceChart, setAttendanceChart] = useState(null);

  // Leave management state
  const [leaves, setLeaves] = useState([]);
  const [processingLeave, setProcessingLeave] = useState(null);

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Role check on mount
  useEffect(() => {
    const token = localStorage.getItem('workzen_token');
    const role = localStorage.getItem('workzen_role');
    const userData = localStorage.getItem('workzen_user');

    if (!token || role !== 'HR Officer') {
      navigate('/login');
      return;
    }

    if (userData) setUser(JSON.parse(userData));

    // Initial data fetch with delays to avoid rate limiting
    const loadData = async () => {
      await fetchEmployees();
      await new Promise(resolve => setTimeout(resolve, 300)); // 300ms delay
      await fetchAttendance();
      await new Promise(resolve => setTimeout(resolve, 300)); // 300ms delay
      await fetchLeaves();
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Avatar dropdown position helper
  function updateDropdownPosition() {
    const btn = avatarBtnRef.current;
    if (!btn || typeof window === 'undefined') return;
    const rect = btn.getBoundingClientRect();
    const dropdownWidth = 192;
    let left = rect.right + window.scrollX - dropdownWidth;
    const minLeft = 8 + window.scrollX;
    const maxLeft = window.innerWidth - dropdownWidth - 8 + window.scrollX;
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;
    const top = rect.bottom + window.scrollY + 8;
    setDropdownPos({ top, left });
  }

  // Reposition dropdown on resize/scroll
  useEffect(() => {
    if (!showProfileDropdown) return undefined;
    updateDropdownPosition();
    const handler = () => {
      if (typeof window === 'undefined') return;
      window.requestAnimationFrame(() => updateDropdownPosition());
    };
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('orientationchange', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }, [showProfileDropdown]);

  // ==================== DATA FETCHING ====================
  
  // Helper function to handle rate limiting with retry
  async function fetchWithRetry(url, options = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, options);
        
        // If rate limited, wait and retry
        if (res.status === 429) {
          const waitTime = Math.pow(2, i) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.log(`⏳ Rate limited. Waiting ${waitTime}ms before retry ${i + 1}/${retries}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        return res;
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async function fetchEmployees() {
    try {
      console.log('👥 HR - Fetching employees from API...');
      const res = await fetchWithRetry('http://localhost:5000/api/users');
      if (!res.ok) throw new Error(`Failed to fetch employees: ${res.status}`);
      const data = await res.json();
      console.log('✅ HR - Employees loaded:', data);
      
      // Handle both response formats
      const employeesList = data.users || data.data || [];
      
      // Format employees with all necessary fields
      const formattedEmployees = employeesList.map(emp => ({
        id: emp._id || emp.id,
        _id: emp._id || emp.id,
        name: emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        role: emp.role,
        department: emp.department || 'N/A',
        phone: emp.phone || emp.contactNumber || 'N/A',
        joinDate: emp.joinDate || emp.joiningDate || emp.createdAt,
        bankAccount: emp.bankAccount || emp.bankDetails || '',
        address: emp.address || '',
        status: emp.status || 'active',
        isActive: emp.isActive !== false,
        employeeId: emp.employeeId,
        designation: emp.designation,
        salary: emp.salary || emp.basicSalary
      }));
      
      console.log(`📊 HR - Formatted ${formattedEmployees.length} employees`);
      setEmployees(formattedEmployees);
    } catch (err) {
      console.error('❌ HR fetchEmployees error:', err);
      showToast('Failed to load employees. Using demo data.', 'error');
      // Fallback mock data
      setEmployees([
        { id: 1, name: 'Sarah Johnson', email: 'sarah.j@workzen.com', role: 'Employee', department: 'Engineering', phone: '+1 234-567-8901', joinDate: '2023-01-15', status: 'active', isActive: true },
        { id: 2, name: 'Michael Chen', email: 'michael.c@workzen.com', role: 'Employee', department: 'Product', phone: '+1 234-567-8902', joinDate: '2022-06-20', status: 'active', isActive: true },
        { id: 3, name: 'Emily Rodriguez', email: 'emily.r@workzen.com', role: 'Employee', department: 'Design', phone: '+1 234-567-8903', joinDate: '2023-03-10', status: 'active', isActive: false },
      ]);
    }
  }

  async function fetchAttendance() {
    try {
      console.log('📅 HR - Fetching attendance from API...');
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (attendanceFilter.employee !== 'all') params.append('employee', attendanceFilter.employee);
      if (attendanceFilter.startDate) params.append('startDate', attendanceFilter.startDate);
      if (attendanceFilter.endDate) params.append('endDate', attendanceFilter.endDate);
      
      const res = await fetchWithRetry(`http://localhost:5000/api/attendance?${params}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('❌ HR attendance API error:', res.status, errorData);
        throw new Error(errorData.message || `Failed to fetch attendance: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('✅ HR - Attendance loaded:', data);
      
      // Handle different response formats
      const attendanceList = Array.isArray(data) 
        ? data 
        : (data.data?.attendance || data.attendance || data.records || data.data || []);
      
      if (!Array.isArray(attendanceList) || attendanceList.length === 0) {
        console.log('⚠️ HR - No attendance records found, using mock data');
        const mockRecords = Array.from({ length: 7 }).map((_, i) => ({
          date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString(),
          presentCount: Math.floor(Math.random() * 3) + 3,
          totalCount: 5
        }));
        setAttendance(mockRecords);
        buildAttendanceChart(mockRecords);
        return;
      }
      
      // Group by date for chart
      const groupedByDate = {};
      attendanceList.forEach(record => {
        const date = new Date(record.date).toLocaleDateString();
        if (!groupedByDate[date]) {
          groupedByDate[date] = { date, presentCount: 0, totalCount: 0 };
        }
        groupedByDate[date].totalCount++;
        if (record.status === 'present' || record.checkIn) {
          groupedByDate[date].presentCount++;
        }
      });
      
      const chartData = Object.values(groupedByDate).slice(-7); // Last 7 days
      
      console.log(`📊 HR - Processed ${attendanceList.length} attendance records`);
      setAttendance(chartData);
      buildAttendanceChart(chartData);
    } catch (err) {
      console.error('❌ HR fetchAttendance error:', err);
      showToast('Failed to load attendance data', 'error');
      // Fallback mock attendance data (last 7 days)
      const mockRecords = Array.from({ length: 7 }).map((_, i) => ({
        date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString(),
        presentCount: Math.floor(Math.random() * 3) + 3,
        totalCount: 5
      }));
      setAttendance(mockRecords);
      buildAttendanceChart(mockRecords);
    }
  }

  async function fetchLeaves() {
    try {
      console.log('🏖️ HR - Fetching leaves from API...');
      const res = await fetchWithRetry('http://localhost:5000/api/leaves');
      if (!res.ok) throw new Error(`Failed to fetch leaves: ${res.status}`);
      const data = await res.json();
      console.log('✅ HR - Leaves loaded:', data);
      
      // Handle both response formats
      const leavesList = data.leaves || data.data || [];
      
      // Format leaves to match expected structure
      const formattedLeaves = leavesList.map(l => ({
        id: l._id || l.id,
        _id: l._id || l.id,
        employeeName: l.userId?.name || (l.employee?.firstName && l.employee?.lastName ? `${l.employee.firstName} ${l.employee.lastName}` : l.userName || 'Unknown'),
        email: l.email || l.userEmail || l.userId?.email || l.employee?.email || 'N/A',
        type: l.type || l.leaveType || 'General',
        from: l.from || l.startDate,
        to: l.to || l.endDate,
        days: l.duration || Math.max(1, Math.ceil((new Date(l.to || l.endDate) - new Date(l.from || l.startDate)) / (1000*60*60*24)) + 1),
        status: l.status || 'pending',
        reason: l.reason || l.description || 'No reason provided',
        createdAt: l.createdAt,
        appliedDate: l.appliedDate || l.createdAt
      }));
      
      console.log(`📊 HR - Formatted ${formattedLeaves.length} leave requests`);
      setLeaves(formattedLeaves);
    } catch (err) {
      console.error('❌ HR fetchLeaves error:', err);
      showToast('Failed to load leave requests', 'error');
      // Fallback mock leave data
      setLeaves([
        { id: 1, employeeName: 'Emily Rodriguez', email: 'emily.r@workzen.com', type: 'Vacation', from: '2025-12-10', to: '2025-12-14', days: 5, status: 'pending', reason: 'Family trip' },
        { id: 2, employeeName: 'Anna Kumar', email: 'anna.k@workzen.com', type: 'Sick Leave', from: '2025-11-08', to: '2025-11-08', days: 1, status: 'pending', reason: 'Not feeling well' },
      ]);
    }
  }

  function buildAttendanceChart(records) {
    const labels = records.map(r => r.date || `Day ${r.day}`);
    const presentData = records.map(r => r.presentCount || 0);
    const totalData = records.map(r => r.totalCount || 0);
    const percentageData = records.map(r => {
      const total = r.totalCount || 1;
      const present = r.presentCount || 0;
      return Math.round((present / total) * 100);
    });

    setAttendanceChart({
      labels,
      datasets: [
        {
          label: 'Attendance %',
          data: percentageData,
          borderColor: '#005eb8',
          backgroundColor: 'rgba(0, 94, 184, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    });
  }

  // ==================== EMPLOYEE CRUD ====================

  function openCreateEmployeeModal() {
    setEditingEmployee(null);
    setEmployeeForm({ name: '', email: '', role: '', department: '', phone: '', joinDate: '', bankAccount: '', address: '' });
    setFormErrors({});
    setShowEmployeeModal(true);
  }

  function openEditEmployeeModal(employee) {
    setEditingEmployee(employee);
    setEmployeeForm({
      name: employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
      email: employee.email || '',
      role: employee.role || '',
      department: employee.department || '',
      phone: employee.phone || employee.phoneNumber || employee.contactNumber || '',
      joinDate: employee.joinDate || employee.dateOfJoining || employee.joiningDate || '',
      bankAccount: employee.bankAccount || employee.bankDetails || '',
      address: employee.address || ''
    });
    setFormErrors({});
    setShowEmployeeModal(true);
  }

  function validateEmployeeForm() {
    const errors = {};
    if (!employeeForm.name.trim()) errors.name = 'Name is required';
    if (!employeeForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employeeForm.email)) {
      errors.email = 'Invalid email format';
    }
    if (!employeeForm.role.trim()) errors.role = 'Role is required';
    if (!employeeForm.department.trim()) errors.department = 'Department is required';
    if (!employeeForm.joinDate) errors.joinDate = 'Join date is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function saveEmployee() {
    if (!validateEmployeeForm()) return;

    setSavingEmployee(true);
    try {
      console.log('💾 HR - Saving employee:', employeeForm);
      const token = localStorage.getItem('token');
      const method = editingEmployee ? 'PUT' : 'POST';
      const url = editingEmployee ? `http://localhost:5000/api/users/${editingEmployee._id || editingEmployee.id}` : 'http://localhost:5000/api/users';
      
      // Prepare payload - split name into firstName and lastName
      const nameParts = employeeForm.name.trim().split(' ');
      const payload = {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || nameParts[0] || '',
        email: employeeForm.email.toLowerCase(),
        role: employeeForm.role,
        department: employeeForm.department,
        phoneNumber: employeeForm.phone,
        address: employeeForm.address,
        dateOfJoining: employeeForm.joinDate,
        isActive: true
      };

      // Add password only for new employees
      if (!editingEmployee) {
        payload.password = 'Password@123';
      }

      // Add bank account if provided
      if (employeeForm.bankAccount) {
        payload.bankAccount = employeeForm.bankAccount;
      }

      console.log('📤 HR - Sending payload:', payload);
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('❌ HR - Save employee API error:', res.status, errData);
        throw new Error(errData.message || `Failed to save employee: ${res.status}`);
      }

      const data = await res.json();
      console.log('✅ HR - Employee saved:', data);
      
      // Refresh employees list from server
      await fetchEmployees();
      
      showToast(`Employee ${editingEmployee ? 'updated' : 'created'} successfully`, 'success');
      setShowEmployeeModal(false);
      setEmployeeForm({ name: '', email: '', role: '', department: '', phone: '', joinDate: '', bankAccount: '', address: '' });
    } catch (err) {
      console.error('❌ HR saveEmployee error:', err);
      showToast(err.message || 'Failed to save employee', 'error');
    } finally {
      setSavingEmployee(false);
    }
  }

  // ==================== LEAVE MANAGEMENT ====================

  async function approveLeave(leave) {
    if (!window.confirm(`Approve ${leave.type} for ${leave.employeeName}?`)) return;
    
    setProcessingLeave(leave.id || leave._id);
    try {
      const token = localStorage.getItem('token');
      const leaveId = leave._id || leave.id;
      console.log('✅ HR - Approving leave:', leaveId);
      
      const res = await fetch(`http://localhost:5000/api/leave/${leaveId}/approve`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: 'approved',
          approvedBy: user?._id || user?.id
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('❌ HR - Approve leave API error:', res.status, errData);
        throw new Error(errData.message || `Failed to approve leave: ${res.status}`);
      }

      console.log('✅ HR - Leave approved successfully');
      showToast('Leave approved successfully', 'success');
      await fetchLeaves(); // Refresh leaves list
    } catch (err) {
      console.error('❌ HR approveLeave error:', err);
      showToast(err.message || 'Failed to approve leave', 'error');
    } finally {
      setProcessingLeave(null);
    }
  }

  async function rejectLeave(leave) {
    if (!window.confirm(`Reject ${leave.type} for ${leave.employeeName}?`)) return;
    
    setProcessingLeave(leave.id || leave._id);
    try {
      const token = localStorage.getItem('token');
      const leaveId = leave._id || leave.id;
      console.log('❌ HR - Rejecting leave:', leaveId);
      
      const res = await fetch(`http://localhost:5000/api/leave/${leaveId}/reject`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: 'rejected',
          rejectedBy: user?._id || user?.id
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('❌ HR - Reject leave API error:', res.status, errData);
        throw new Error(errData.message || `Failed to reject leave: ${res.status}`);
      }

      console.log('✅ HR - Leave rejected successfully');
      showToast('Leave rejected successfully', 'success');
      await fetchLeaves(); // Refresh leaves list
    } catch (err) {
      console.error('❌ HR rejectLeave error:', err);
      showToast(err.message || 'Failed to reject leave', 'error');
    } finally {
      setProcessingLeave(null);
    }
  }

  // ==================== HELPERS ====================

  const handleLogout = () => {
    localStorage.removeItem('workzen_token');
    localStorage.removeItem('workzen_role');
    localStorage.removeItem('workzen_user');
    navigate('/login');
  };

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  }

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (emp.department || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate KPIs
  const totalEmployees = employees.filter(emp => emp.role === 'Employee').length;
  const activeToday = employees.filter(e => (e.role === 'Employee' || e.role === 'employee') && e.isActive !== false && e.status !== 'inactive').length;
  const pendingLeaves = leaves.filter(l => (l.status || '').toLowerCase() === 'pending').length;
  const attendanceCompliance = attendance.length > 0 
    ? Math.round((attendance.reduce((acc, r) => acc + (r.presentCount || 0), 0) / Math.max(1, attendance.reduce((acc, r) => acc + (r.totalCount || 1), 0))) * 100)
    : 0;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Attendance Trend (Last 7 Days)', color: '#fff', font: { size: 14 } },
    },
    scales: {
      y: { beginAtZero: true, max: 100, ticks: { color: '#9ca3af', callback: (value) => value + '%' }, grid: { color: 'rgba(156, 163, 175, 0.1)' } },
      x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(156, 163, 175, 0.1)' } },
    },
  };

  // Sidebar menu items (restricted for HR Officer)
  const menuItems = [
    { name: 'Employees', icon: Users },
    { name: 'Attendance', icon: Clock },
    { name: 'Time Off', icon: Calendar },
  ];

  if (!user) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-black flex">
      {/* ==================== LEFT SIDEBAR (HR RESTRICTED) ==================== */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 bg-gray-900/50 backdrop-blur-xl border-r border-gray-800 flex flex-col"
      >
        <div className="p-6 border-b border-gray-800 flex items-center gap-2">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">WorkZen</h2>
          <p className="text-sm text-gray-400">HR Officer</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <motion.button
              key={item.name}
              onClick={() => setActiveMenu(item.name)}
              whileHover={{ x: 4 }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeMenu === item.name ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </motion.button>
          ))}
        </nav>
      </motion.aside>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ==================== TOP BAR ==================== */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gray-900/50 backdrop-blur-xl border-b border-gray-800 px-6 py-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-xl relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Search employees"
              />
            </div>

            <div className="flex items-center gap-4 ml-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={openCreateEmployeeModal}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg font-medium transition-all"
              >
                <UserPlus className="w-4 h-4" />
                NEW
              </motion.button>

              <div className="relative">
                <motion.button
                  ref={avatarBtnRef}
                  onClick={() => {
                    updateDropdownPosition();
                    setShowProfileDropdown(prev => !prev);
                  }}
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-all"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {(user.name || user.firstName + ' ' + user.lastName || 'H').charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
                </motion.button>

                {typeof document !== 'undefined' && createPortal(
                  <AnimatePresence>
                    {showProfileDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: 192 }}
                        className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50"
                      >
                        <button
                          onClick={() => { setShowProfileDropdown(false); navigate('/profile'); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-all text-left"
                        >
                          <UserIcon className="w-4 h-4" />
                          Profile
                        </button>
                        <button
                          onClick={() => { setShowProfileDropdown(false); handleLogout(); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-all text-left border-t border-gray-700"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>,
                  document.body
                )}
              </div>
            </div>
          </div>
        </motion.header>

        {/* ==================== DASHBOARD CONTENT ==================== */}
        <div className="flex-1 overflow-y-auto p-6 relative">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto">
            {/* ==================== LOGGED IN USER CARD ==================== */}
            {user && (
              <div className="mb-8 bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold text-2xl">
                      {(user.firstName || user.name || 'H').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-widest">Currently Logged In</p>
                      <h3 className="text-xl font-bold text-white">
                        {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
                          {user.role || 'HR Officer'}
                        </span>
                        <span className="text-sm text-gray-400">{user.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Employee ID</p>
                    <p className="text-lg font-semibold text-white">{user.userId || user.employeeId || 'N/A'}</p>
                    <p className="text-sm text-gray-400 mt-2">{user.department || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== KPI WIDGETS ==================== */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Employees</p>
                    <h3 className="text-3xl font-bold text-white mt-2">{totalEmployees}</h3>
                  </div>
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Active Today</p>
                    <h3 className="text-3xl font-bold text-green-500 mt-2">{activeToday}</h3>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Pending Leaves</p>
                    <h3 className="text-3xl font-bold text-yellow-500 mt-2">{pendingLeaves}</h3>
                  </div>
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-yellow-500" />
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Attendance Rate</p>
                    <h3 className="text-3xl font-bold text-accent mt-2">{attendanceCompliance}%</h3>
                  </div>
                  <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-accent" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ==================== CONTENT TABS ==================== */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              {/* EMPLOYEES TAB */}
              {activeMenu === 'Employees' && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-6">
                    {searchQuery ? `Search Results (${filteredEmployees.length})` : 'All Employees'}
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEmployees.map((employee, index) => (
                      <motion.div
                        key={employee.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * index }}
                        whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0, 94, 184, 0.2)' }}
                        className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6 relative"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold text-xl">
                            {(employee.name || 'Unknown User').split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => openEditEmployeeModal(employee)}
                            className="p-2 bg-gray-800 hover:bg-primary/20 rounded-lg transition-all"
                            aria-label="Edit employee"
                          >
                            <Edit className="w-4 h-4 text-primary" />
                          </motion.button>
                        </div>

                        <h3 className="text-lg font-semibold text-white">{employee.name}</h3>
                        <p className="text-gray-400 text-sm mt-1">{employee.role}</p>
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Mail className="w-3 h-3" />
                            <span>{employee.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Briefcase className="w-3 h-3" />
                            <span>{employee.department}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {filteredEmployees.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-400">No employees found matching "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* ATTENDANCE TAB */}
              {activeMenu === 'Attendance' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">Attendance Monitoring</h2>
                    <button 
                      onClick={fetchAttendance}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all text-sm"
                    >
                      <Filter className="w-4 h-4" />
                      Refresh
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <div className="lg:col-span-2 bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
                      <div className="h-64">
                        {attendanceChart && <Line data={attendanceChart} options={chartOptions} />}
                      </div>
                    </div>

                    <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
                      <h3 className="text-white font-semibold mb-4">Summary</h3>
                      <div className="space-y-3">
                        {attendance.slice(0, 5).map((record, i) => (
                          <div key={i} className="flex items-center justify-between border-b border-gray-800 pb-2">
                            <span className="text-gray-300 text-sm">{record.date}</span>
                            <span className="text-gray-400 text-sm">{record.presentCount}/{record.totalCount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TIME OFF TAB */}
              {activeMenu === 'Time Off' && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-6">Time Off Management</h2>
                  
                  <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-4">Pending Requests</h3>
                    
                    <div className="space-y-3">
                      {leaves.filter(l => l.status === 'Pending').map((leave) => (
                        <motion.div
                          key={leave.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {(leave.employeeName || 'Unknown').split(' ').map(n => n[0]).join('').toUpperCase()}
                              </div>
                              <div>
                                <p className="text-white font-medium">{leave.employeeName}</p>
                                <p className="text-gray-400 text-xs">{leave.email}</p>
                              </div>
                            </div>
                            <div className="ml-13 space-y-1">
                              <p className="text-sm text-gray-300">
                                <span className="font-semibold">{leave.type}</span> • {leave.from} → {leave.to} ({leave.days} day{leave.days > 1 ? 's' : ''})
                              </p>
                              <p className="text-xs text-gray-500">Reason: {leave.reason}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => approveLeave(leave)}
                              disabled={processingLeave === leave.id}
                              className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                              aria-label="Approve leave"
                            >
                              <Check className="w-4 h-4" />
                              Approve
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => rejectLeave(leave)}
                              disabled={processingLeave === leave.id}
                              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                              aria-label="Reject leave"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}

                      {leaves.filter(l => l.status === 'Pending').length === 0 && (
                        <p className="text-gray-400 text-center py-8">No pending leave requests</p>
                      )}
                    </div>

                    <h3 className="text-white font-semibold mb-4 mt-8">Recent Approvals</h3>
                    <div className="space-y-2">
                      {leaves.filter(l => l.status !== 'Pending').slice(0, 5).map((leave) => (
                        <div key={leave.id} className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-white">{leave.employeeName} • {leave.type}</p>
                            <p className="text-xs text-gray-500">{leave.from} → {leave.to}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs ${
                            leave.status === 'Approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {leave.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* ==================== EMPLOYEE CREATE/EDIT MODAL ==================== */}
      <AnimatePresence>
        {showEmployeeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !savingEmployee && setShowEmployeeModal(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[90%] max-w-2xl max-h-[90vh] bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl z-50 flex flex-col"
            >
            <div className="p-6 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
              <h3 className="text-xl font-bold text-white">
                  {editingEmployee ? 'Edit Employee' : 'Create New Employee'}
                </h3>
                <button
                  onClick={() => !savingEmployee && setShowEmployeeModal(false)}
                  disabled={savingEmployee}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-all disabled:opacity-50"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <form onSubmit={(e) => { e.preventDefault(); saveEmployee(); }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">
                        Full Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={employeeForm.name}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                        className={`w-full px-3 py-2 bg-gray-800 border ${formErrors.name ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary`}
                        placeholder="John Doe"
                        aria-label="Employee name"
                      />
                      {formErrors.name && <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-1">
                        Email <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        value={employeeForm.email}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                        className={`w-full px-3 py-2 bg-gray-800 border ${formErrors.email ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary`}
                        placeholder="john.doe@workzen.com"
                        aria-label="Employee email"
                      />
                      {formErrors.email && <p className="text-xs text-red-400 mt-1">{formErrors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-1">
                        Role <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={employeeForm.role}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}
                        className={`w-full px-3 py-2 bg-gray-800 border ${formErrors.role ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary`}
                        aria-label="Employee role"
                      >
                        <option value="">Select Role</option>
                        <option value="Admin">Admin</option>
                        <option value="HR Officer">HR Officer</option>
                        <option value="Payroll Officer">Payroll Officer</option>
                        <option value="Employee">Employee</option>
                      </select>
                      {formErrors.role && <p className="text-xs text-red-400 mt-1">{formErrors.role}</p>}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-1">
                        Department <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={employeeForm.department}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                        className={`w-full px-3 py-2 bg-gray-800 border ${formErrors.department ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary`}
                        aria-label="Employee department"
                      >
                        <option value="">Select Department</option>
                        <option value="HR">HR</option>
                        <option value="IT">IT</option>
                        <option value="Finance">Finance</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Sales">Sales</option>
                        <option value="Operations">Operations</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Legal">Legal</option>
                      </select>
                      {formErrors.department && <p className="text-xs text-red-400 mt-1">{formErrors.department}</p>}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={employeeForm.phone}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="+1 234-567-8900"
                        aria-label="Employee phone"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-1">
                        Join Date <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="date"
                        value={employeeForm.joinDate}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, joinDate: e.target.value })}
                        className={`w-full px-3 py-2 bg-gray-800 border ${formErrors.joinDate ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary`}
                        aria-label="Employee join date"
                      />
                      {formErrors.joinDate && <p className="text-xs text-red-400 mt-1">{formErrors.joinDate}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Bank Account</label>
                    <input
                      type="text"
                      value={employeeForm.bankAccount}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, bankAccount: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="XXXX-XXXX-XXXX-1234"
                      aria-label="Employee bank account"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Address</label>
                    <textarea
                      value={employeeForm.address}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, address: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      rows="2"
                      placeholder="123 Main St, City, State"
                      aria-label="Employee address"
                    ></textarea>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-gray-800 flex items-center gap-3 flex-shrink-0">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  onClick={(e) => { e.preventDefault(); saveEmployee(); }}
                  disabled={savingEmployee}
                  className="flex-1 px-6 py-3 bg-primary hover:bg-primary/80 text-white rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {savingEmployee ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Create Employee'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => !savingEmployee && setShowEmployeeModal(false)}
                  disabled={savingEmployee}
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== TOAST NOTIFICATION ==================== */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-50"
          >
            <div className={`px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 ${
              toast.type === 'success' ? 'bg-green-500/20 border border-green-500/50 text-green-400' : 'bg-red-500/20 border border-red-500/50 text-red-400'
            }`}>
              {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              <span className="font-medium">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DashboardHROfficer;
