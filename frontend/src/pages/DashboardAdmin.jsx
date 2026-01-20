/**
 * DayFlow HRMS - Admin Dashboard
 * Single-file dashboard for Admin role
 * Features (from Excalidraw HRMS flow):
 * - Left sidebar: Employees, Attendance, Time Off, Payroll, Reports, Settings
 * - Top bar: Search, NEW button, Profile dropdown (Profile/Logout)
 * - Employee card grid with status indicators (Green=Present, Plane=Leave, Yellow=Absent)
 * - Quick summary widgets: Total employees, Present today, On leave, Payroll cost
 * - Chart.js attendance trend
 * - Clickable cards showing employee details panel
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { 
  Users, Clock, Calendar, DollarSign, FileText, Settings, 
  Search, UserPlus, LogOut, User as UserIcon, ChevronDown,
  CheckCircle, Plane, AlertCircle, X, Mail, Phone, MapPin,
  Clock4, ClipboardCheck, FileEdit, Edit2, Trash2, Eye, 
  Download, Filter, Plus, Check, XCircle, MoreVertical,
  Building2, TrendingUp, Activity, Shield, Save, Ban, RefreshCw
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import api from '../services/api';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

function DashboardAdmin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Helper function to convert decimal hours to HH:MM:SS format
  // Prefers database-stored formatted time if available
  const formatWorkHours = (hours, formattedTime) => {
    // Use database formatted time if available
    if (formattedTime && formattedTime !== '00:00:00') return formattedTime;
    // Otherwise calculate from decimal hours
    if (!hours || hours <= 0) return '00:00:00';
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    const s = Math.floor(((hours - h) * 60 - m) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };
  const [activeMenu, setActiveMenu] = useState('Employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeePanel, setShowEmployeePanel] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const avatarBtnRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  
  // Dynamic data states
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [reports, setReports] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [payrollLoading, setPayrollLoading] = useState(false);
  
  // Filter states
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showMarkAttendance, setShowMarkAttendance] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [markingCheckIn, setMarkingCheckIn] = useState(false);
  const [markingCheckOut, setMarkingCheckOut] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkInTime, setCheckInTime] = useState('09:00');
  const [checkOutTime, setCheckOutTime] = useState('18:00');

  // Fetch all data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard overview
      const overviewData = await api.dashboard.getOverview();
      setDashboardStats(overviewData.data || overviewData);
      
      // Fetch all users (which includes employee data)
      const usersData = await api.users.getAll();
      const allUsers = usersData.data || [];
      setUsers(allUsers);
      
      // Set employees from users (they're the same now)
      setEmployees(allUsers);
      
      // Fetch today's attendance
      const todayData = await api.attendance.getToday();
      setTodayAttendance(todayData.data || []);
      
      // Fetch all leave requests (pending, approved, rejected) - not just pending
      // This includes requests approved by any officer (HR, Payroll, Admin)
      const allLeavesData = await api.leaveRequests.getAll({ limit: 100 });
      setLeaveRequests(allLeavesData.data?.leaves || allLeavesData.data || []);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set empty arrays to prevent errors
      setUsers([]);
      setEmployees([]);
      setTodayAttendance([]);
      setLeaveRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch attendance data
  const fetchAttendanceData = async () => {
    try {
      const data = await api.attendance.getAll({ limit: 100 });
      setAttendanceData(data.data?.attendance || data.data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  // Fetch payroll data
  // Fetch payroll data
  const fetchPayrollData = async () => {
    try {
      setPayrollLoading(true);
      console.log('📊 Fetching payroll data...');
      const response = await api.payroll.getAll({ limit: 100 });
      console.log('✅ Payroll API response:', response);
      
      // Handle different response structures - backend returns { payrolls: [...] }
      const payrollData = response.data?.payrolls || response.payrolls || response.data?.payroll || response.data || [];
      console.log('📋 Payroll records loaded:', payrollData.length);
      
      // Log first record structure for debugging
      if (payrollData.length > 0) {
        console.log('📝 Sample payroll record:', payrollData[0]);
      }
      
      setPayrollRecords(payrollData);
    } catch (error) {
      console.error('❌ Error fetching payroll:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Don't fail silently - show user feedback
      setPayrollRecords([]);
    } finally {
      setPayrollLoading(false);
    }
  };

  // Fetch reports
  const fetchReports = async () => {
    try {
      const data = await api.reports.getAll();
      setReports(data.data?.reports || data.data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('dayflow_token');
    const role = localStorage.getItem('dayflow_role');
    const userData = localStorage.getItem('dayflow_user');

    if (!token || role !== 'Admin') {
      navigate('/login');
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchDashboardData();
  }, [navigate]);

  // Fetch specific data based on active menu
  useEffect(() => {
    if (activeMenu === 'Attendance') {
      fetchAttendanceData();
    } else if (activeMenu === 'Payroll') {
      fetchPayrollData();
    } else if (activeMenu === 'Reports') {
      fetchReports();
    }
  }, [activeMenu]);

  const handleLogout = () => {
    api.auth.logout();
    navigate('/login');
  };

  const handleProfileClick = () => {
    setShowProfileDropdown(false);
    navigate('/profile');
  };

  // Mark attendance for HR/Payroll officers
  const handleMarkCheckIn = async () => {
    if (!selectedUser) return;
    
    setMarkingCheckIn(true);
    try {
      // Create check-in datetime from date and time inputs
      const checkInDateTime = new Date(`${attendanceDate}T${checkInTime}:00`);
      
      console.log('📍 Marking check-in:', {
        userId: selectedUser._id,
        date: attendanceDate,
        time: checkInTime,
        dateTime: checkInDateTime.toISOString()
      });

      const response = await api.attendance.adminCheckIn(selectedUser._id, {
        date: attendanceDate,
        checkInTime: checkInTime,
        location: { address: 'Admin Portal' }
      });
      
      if (response.success) {
        showToast(`✓ Check-in marked for ${selectedUser.name} at ${checkInTime}`, 'success');
        // Keep modal open for check-out
      } else {
        showToast(response.message || 'Failed to mark check-in', 'error');
      }
    } catch (error) {
      console.error('Error marking check-in:', error);
      showToast(error.response?.data?.message || error.message || 'Failed to mark check-in', 'error');
    } finally {
      setMarkingCheckIn(false);
    }
  };

  const handleMarkCheckOut = async () => {
    if (!selectedUser) return;
    
    setMarkingCheckOut(true);
    try {
      // Create check-out datetime from date and time inputs
      const checkOutDateTime = new Date(`${attendanceDate}T${checkOutTime}:00`);
      
      console.log('📍 Marking check-out:', {
        userId: selectedUser._id,
        date: attendanceDate,
        time: checkOutTime,
        dateTime: checkOutDateTime.toISOString()
      });

      const response = await api.attendance.adminCheckOut(selectedUser._id, {
        date: attendanceDate,
        checkOutTime: checkOutTime,
        location: { address: 'Admin Portal' }
      });
      
      if (response.success) {
        const workHours = response.data?.workHoursFormatted || response.data?.workHours || 'N/A';
        showToast(
          `✓ Attendance marked as PRESENT for ${selectedUser.name}\n📊 Work Hours: ${workHours}`,
          'success'
        );
        
        // Refresh attendance data and close modal
        setTimeout(() => {
          fetchDashboardData();
          setShowMarkAttendance(false);
          setSelectedUser(null);
          setAttendanceDate(new Date().toISOString().split('T')[0]);
          setCheckInTime('09:00');
          setCheckOutTime('18:00');
        }, 500);
      } else {
        showToast(response.message || 'Failed to mark check-out', 'error');
      }
    } catch (error) {
      console.error('Error marking check-out:', error);
      showToast(error.response?.data?.message || error.message || 'Failed to mark check-out', 'error');
    } finally {
      setMarkingCheckOut(false);
    }
  };

  const handleEmployeeCardClick = (employee) => {
    setSelectedEmployee(employee);
    setShowEmployeePanel(true);
  };

  // User management functions
  const handleCreateUser = () => {
    setEditingUser(null);
    setShowUserModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowUserModal(true);
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await api.users.delete(userId);
      fetchDashboardData();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      await api.users.updateRole(userId, newRole);
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role');
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      await api.users.toggleStatus(userId);
      fetchDashboardData();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to toggle status');
    }
  };

  // Refresh user data
  const handleRefreshUsers = async () => {
    await fetchDashboardData();
  };

  // Toast notification helper
  const showToast = (message, type = 'info') => {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // You can implement a toast UI here if needed
  };

  // Leave approval functions
  const handleApproveLeave = async (leaveId) => {
    try {
      await api.leaveRequests.approve(leaveId, 'Approved by admin');
      fetchDashboardData();
    } catch (error) {
      console.error('Error approving leave:', error);
      alert('Failed to approve leave');
    }
  };

  const handleRejectLeave = async (leaveId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    
    try {
      await api.leaveRequests.reject(leaveId, reason);
      fetchDashboardData();
    } catch (error) {
      console.error('Error rejecting leave:', error);
      alert('Failed to reject leave');
    }
  };

  // Export report as PDF
  const handleExportPDF = (report) => {
    if (!report) {
      alert('Report data not available');
      return;
    }

    const WindowPrint = window.open('', '', 'width=900,height=650');
    
    WindowPrint.document.write(`
      <html>
        <head>
          <title>${report.name || 'Report'} - DayFlow HRMS</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; color: #000; background: #fff; }
            .report-container { max-width: 900px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #005eb8; padding-bottom: 20px; }
            .company-logo { font-size: 28px; font-weight: bold; color: #005eb8; margin-bottom: 10px; }
            .report-title { font-size: 22px; font-weight: bold; color: #00a8e8; margin: 15px 0; }
            .report-info { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0; background: #f5f5f5; padding: 15px; border-radius: 8px; }
            .info-item { padding: 8px 0; }
            .info-label { font-size: 13px; color: #666; font-weight: 600; }
            .info-value { font-size: 14px; color: #000; margin-top: 3px; }
            .section { margin: 25px 0; }
            .section-title { background: #005eb8; color: white; padding: 10px 15px; font-weight: bold; margin-bottom: 15px; border-radius: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; }
            th { background: #e8f4f8; font-weight: 600; font-size: 13px; color: #005eb8; }
            td { font-size: 13px; }
            .amount { text-align: right; font-family: monospace; }
            .total-row { background: #b0e0f7; font-weight: bold; }
            .status-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
            .status-generated { background: #d1fae5; color: #065f46; }
            .status-draft { background: #fef3c7; color: #92400e; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd; font-size: 11px; color: #666; text-align: center; }
            @media print { 
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="report-container">
            <div class="header">
              <div class="company-logo">DayFlow HRMS</div>
              <div class="report-title">${report.name || 'Report'}</div>
            </div>

            <div class="report-info">
              <div class="info-item">
                <div class="info-label">Report Type:</div>
                <div class="info-value">${report.type || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Generated By:</div>
                <div class="info-value">${report.generatedBy?.firstName || ''} ${report.generatedBy?.lastName || 'Admin'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Generated On:</div>
                <div class="info-value">${report.generatedAt ? new Date(report.generatedAt).toLocaleDateString() + ' ' + new Date(report.generatedAt).toLocaleTimeString() : new Date().toLocaleString()}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Status:</div>
                <div class="info-value">
                  <span class="status-badge status-${report.status || 'generated'}">${report.status || 'Generated'}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Report Summary</div>
              <div style="padding: 15px; background: #f9fafb; border-radius: 5px;">
                <p style="font-size: 14px; line-height: 1.8;">
                  This report contains comprehensive data analysis for the ${report.type || 'selected'} module. 
                  The information presented below has been generated from the DayFlow HRMS database 
                  and reflects the current state of records as of the generation date.
                </p>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Report Details</div>
              <table>
                <thead>
                  <tr>
                    <th>Attribute</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Report ID</td>
                    <td>${report._id || report.id || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Report Name</td>
                    <td>${report.name || 'Unnamed Report'}</td>
                  </tr>
                  <tr>
                    <td>Report Type</td>
                    <td>${report.type || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Status</td>
                    <td>${report.status || 'Generated'}</td>
                  </tr>
                  <tr>
                    <td>Created At</td>
                    <td>${report.createdAt ? new Date(report.createdAt).toLocaleString() : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Last Updated</td>
                    <td>${report.updatedAt ? new Date(report.updatedAt).toLocaleString() : 'N/A'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="footer">
              <p><strong>DayFlow HRMS</strong> - Human Resource Management System</p>
              <p>This is a computer-generated report. No signature required.</p>
              <p>Downloaded on: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
      </html>
    `);
    
    WindowPrint.document.close();
    WindowPrint.focus();
    
    setTimeout(() => {
      WindowPrint.print();
    }, 250);
  };

  // Export report as CSV
  const handleExportCSV = (report) => {
    if (!report) {
      alert('Report data not available');
      return;
    }

    // Create CSV content
    const csvRows = [];
    
    // Add header
    csvRows.push('DayFlow HRMS - Report Export');
    csvRows.push('');
    csvRows.push(`Report Name,${report.name || 'Unnamed Report'}`);
    csvRows.push(`Report Type,${report.type || 'N/A'}`);
    csvRows.push(`Generated By,${report.generatedBy?.firstName || ''} ${report.generatedBy?.lastName || 'Admin'}`);
    csvRows.push(`Generated On,${report.generatedAt ? new Date(report.generatedAt).toLocaleString() : new Date().toLocaleString()}`);
    csvRows.push(`Status,${report.status || 'Generated'}`);
    csvRows.push('');
    csvRows.push('Report Details');
    csvRows.push('Attribute,Value');
    csvRows.push(`Report ID,${report._id || report.id || 'N/A'}`);
    csvRows.push(`Created At,${report.createdAt ? new Date(report.createdAt).toLocaleString() : 'N/A'}`);
    csvRows.push(`Last Updated,${report.updatedAt ? new Date(report.updatedAt).toLocaleString() : 'N/A'}`);
    
    const csvContent = csvRows.join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${report.name || 'report'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate summary metrics
  const getEmployeeStatus = (employee) => {
    // Check if employee is on approved leave today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const onLeave = leaveRequests.some(l => {
      if (l.status !== 'Approved') return false;
      const from = new Date(l.from || l.startDate);
      const to = new Date(l.to || l.endDate);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      
      // Check if employee matches (handle both populated and non-populated)
      const leaveEmployeeId = l.employee?._id || l.employee?.id || l.employee;
      const currentEmployeeId = employee._id || employee.id;
      
      return leaveEmployeeId?.toString() === currentEmployeeId?.toString() && 
             today >= from && today <= to;
    });
    
    if (onLeave) return 'leave';
    
    // Check if employee has attendance today
    const todayRecord = todayAttendance.find(a => {
      const attendanceEmployeeId = a.employee?._id || a.employee?.id || a.employee;
      const currentEmployeeId = employee._id || employee.id;
      return attendanceEmployeeId?.toString() === currentEmployeeId?.toString();
    });
    
    if (todayRecord) {
      return todayRecord.status || 'present';
    }
    
    // No attendance and no leave = absent
    return 'absent';
  };

  const totalEmployees = employees.filter(emp => emp.role === 'Employee').length;
  const totalUsers = employees.length; // Count all users (including HR and Payroll officers)
  const presentToday = todayAttendance.filter(a => a.status === 'present').length;
  const onLeaveToday = leaveRequests.filter(l => {
    const today = new Date();
    const from = new Date(l.from);
    const to = new Date(l.to);
    // Only count leave requests from employees, not from HR/Payroll officers
    const leaveUser = employees.find(e => e._id === l.user);
    return l.status === 'Approved' && today >= from && today <= to && leaveUser?.role === 'Employee';
  }).length;
  const absentToday = Math.max(0, totalEmployees - presentToday - onLeaveToday);
  
  const monthlyPayroll = payrollRecords.reduce((sum, p) => sum + (p.netPay || 0), 0);

  // Filter employees based on search and filters
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = searchQuery === '' || 
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
    
    return matchesSearch && matchesDepartment;
  });

  // Chart data - Attendance trend for past 7 days (dynamic)
  const getLast7Days = () => {
    const days = [];
    const labels = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date);
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    }
    return { days, labels };
  };

  const { days: last7Days, labels: dayLabels } = getLast7Days();
  
  const attendancePercentages = last7Days.map(day => {
    const dayAttendance = todayAttendance.filter(a => {
      const attDate = new Date(a.date);
      return attDate.toDateString() === day.toDateString();
    });
    
    const presentCount = dayAttendance.filter(a => a.status === 'present').length;
    return totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;
  });

  const attendanceTrendData = {
    labels: dayLabels,
    datasets: [
      {
        label: 'Attendance %',
        data: attendancePercentages,
        borderColor: '#005eb8',
        backgroundColor: 'rgba(0, 94, 184, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Attendance Trend (Last 7 Days)',
        color: '#fff',
        font: { size: 14 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { color: '#9ca3af', callback: (value) => value + '%' },
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
      },
      x: {
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
      },
    },
  };

  // Sidebar menu items (from Excalidraw)
  const menuItems = [
    { name: 'Employees', icon: Users },
    { name: 'Attendance', icon: Clock },
    { name: 'Time Off', icon: Calendar },
    { name: 'Payroll', icon: DollarSign },
    { name: 'Reports', icon: FileText },
    { name: 'Settings', icon: Settings },
  ];

  // Status indicator component
  const StatusIndicator = ({ status }) => {
    switch (status) {
      case 'present':
        return (
          <div className="flex items-center gap-1" title="Present">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
        );
      case 'leave':
        return (
          <div className="flex items-center gap-1" title="On Leave">
            <Plane className="w-3 h-3 text-blue-400" />
          </div>
        );
      case 'absent':
        return (
          <div className="flex items-center gap-1" title="Absent">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-slow animation-delay-2000"></div>
        </div>
        
        <div className="text-white flex flex-col items-center gap-6 relative z-10">
          {/* Animated Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-accent border-t-transparent rounded-full animate-spin animation-delay-2000" style={{ animationDirection: 'reverse' }}></div>
          </motion.div>
          
          {/* Loading Text */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <h2 className="text-2xl font-bold neon-text mb-2">DayFlow HRMS</h2>
            <p className="text-gray-400 text-sm">Loading Dashboard...</p>
          </motion.div>
          
          {/* Loading Bar */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "200px" }}
            transition={{ delay: 0.4, duration: 1, repeat: Infinity }}
            className="h-1 bg-gradient-to-r from-primary via-accent to-primary rounded-full"
          ></motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-float"></div>
      </div>

      {/* ==================== LEFT SIDEBAR ==================== */}
      <motion.aside
        initial={{ x: -20,opacity: 1 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 glass-strong border-r border-white/10 flex flex-col relative z-10 shadow-2xl"
      >
        {/* Company Logo/Name */}
        <div className="p-6 border-b border-white/10 flex flex-col items-center gap-2 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 blur-xl"></div>
          <h2 className="text-2xl font-bold neon-text relative z-10">
            DayFlow
          </h2>
          <p className="text-sm text-gray-400 relative z-10">Admin Dashboard</p>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <motion.button
              key={item.name}
              onClick={() => setActiveMenu(item.name)}
              whileHover={{ x: 8, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative group overflow-hidden ${
                activeMenu === item.name
                  ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-glow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {activeMenu === item.name && (
                <motion.div
                  layoutId="activeMenu"
                  className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600"
                  initial={false}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon className="w-5 h-5 relative z-10" />
              <span className="font-medium relative z-10">{item.name}</span>
              {activeMenu !== item.name && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity shimmer"></div>
              )}
            </motion.button>
          ))}
        </nav>
      </motion.aside>

      {/* ==================== MAIN CONTENT AREA ==================== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ==================== TOP BAR ==================== */}
        <motion.header
          initial={{ y: -15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass border-b border-white/10 px-6 py-4 shadow-lg relative z-10"
        >
          <div className="flex items-center justify-between">
            {/* Search Bar */}
            <div className="flex-1 max-w-xl relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 glass border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 to-blue-600/20 opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity -z-10"></div>
            </div>

            {/* Right Side: NEW Button + Profile Avatar */}
            <div className="flex items-center gap-4 ml-6">
              {/* NEW Button */}
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCreateUser}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary text-white rounded-xl font-medium transition-all shadow-glow relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <UserPlus className="w-4 h-4 relative z-10" />
                <span className="relative z-10">NEW USER</span>
              </motion.button>

              {/* Profile Avatar Dropdown */}
              <div className="relative">
                <motion.button
                  ref={avatarBtnRef}
                  onClick={() => {
                    const btn = avatarBtnRef.current;
                    if (btn) {
                      const rect = btn.getBoundingClientRect();
                      const dropdownWidth = 192; // matches w-48
                      setDropdownPos({
                        top: rect.bottom + window.scrollY + 8,
                        left: rect.right + window.scrollX - dropdownWidth,
                      });
                    }
                    setShowProfileDropdown(prev => !prev);
                  }}
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-2 px-3 py-2 glass border border-white/10 rounded-xl hover:border-primary/50 transition-all group"
                >
                  {/* Avatar Circle with Initial */}
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold text-sm shadow-glow">
                    {(user.name || user.firstName + ' ' + user.lastName || 'A').charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 group-hover:text-primary transition-all ${showProfileDropdown ? 'rotate-180' : ''}`} />
                </motion.button>

                {/* Dropdown Menu rendered via portal to avoid stacking context issues */}
                {typeof document !== 'undefined' && createPortal(
                  <AnimatePresence>
                    {showProfileDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.95 }}
                        style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: 192 }}
                        className="glass-strong border border-white/20 rounded-2xl shadow-2xl overflow-hidden z-50"
                      >
                        <button
                          onClick={() => { setShowProfileDropdown(false); handleProfileClick(); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-primary/20 transition-all text-left group"
                        >
                          <UserIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span className="group-hover:translate-x-1 transition-transform">Profile</span>
                        </button>
                        <button
                          onClick={() => { setShowProfileDropdown(false); handleLogout(); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-red-500/20 transition-all text-left border-t border-white/10 group"
                        >
                          <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span className="group-hover:translate-x-1 transition-transform">Logout</span>
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
          {/* Enhanced Background Gradients */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-full blur-3xl animate-float"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-r from-accent/10 to-yellow-600/10 rounded-full blur-3xl animate-pulse-slow"></div>
            <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-full blur-3xl animate-spin-slow"></div>
            
            {/* Floating Particles */}
            <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-primary rounded-full animate-float opacity-40"></div>
            <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-accent rounded-full animate-bounce-slow opacity-30"></div>
            <div className="absolute bottom-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full animate-float opacity-40 animation-delay-2000"></div>
            <div className="absolute top-2/3 right-1/3 w-2 h-2 bg-cyan-400 rounded-full animate-pulse-slow opacity-30"></div>
          </div>

          {/* Content Container */}
          <div className="relative z-10 max-w-7xl mx-auto">
            {/* ==================== CONDITIONAL CONTENT BASED ON ACTIVE MENU ==================== */}
            {activeMenu === 'Employees' && (
              <>
                {/* ==================== QUICK SUMMARY WIDGETS ==================== */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Employees */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="glass border border-white/10 rounded-2xl p-6 relative overflow-hidden group cursor-pointer card-3d"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <p className="text-gray-400 text-sm font-medium">Total Employees</p>
                    <h3 className="text-4xl font-bold text-white mt-2 group-hover:scale-110 transition-transform">{totalEmployees}</h3>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center shadow-glow group-hover:rotate-12 transition-transform duration-300">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div className="mt-4 h-1 bg-gradient-to-r from-primary via-blue-600 to-primary bg-[length:200%_100%] animate-gradient-x rounded-full"></div>
              </motion.div>

              {/* Present Today */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="glass border border-white/10 rounded-2xl p-6 relative overflow-hidden group cursor-pointer card-3d"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <p className="text-gray-400 text-sm font-medium">Present Today</p>
                    <h3 className="text-4xl font-bold text-green-400 mt-2 group-hover:scale-110 transition-transform">{presentToday}</h3>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-neon group-hover:rotate-12 transition-transform duration-300">
                    <CheckCircle className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div className="mt-4 h-1 bg-gradient-to-r from-green-500 via-emerald-600 to-green-500 bg-[length:200%_100%] animate-gradient-x rounded-full"></div>
              </motion.div>

              {/* On Leave */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="glass border border-white/10 rounded-2xl p-6 relative overflow-hidden group cursor-pointer card-3d"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-cyan-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <p className="text-gray-400 text-sm font-medium">On Leave Today</p>
                    <h3 className="text-4xl font-bold text-blue-400 mt-2 group-hover:scale-110 transition-transform">{onLeaveToday}</h3>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-2xl flex items-center justify-center shadow-neon group-hover:rotate-12 transition-transform duration-300">
                    <Plane className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div className="mt-4 h-1 bg-gradient-to-r from-blue-400 via-cyan-600 to-blue-400 bg-[length:200%_100%] animate-gradient-x rounded-full"></div>
              </motion.div>

              {/* Payroll This Month */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="glass border border-white/10 rounded-2xl p-6 relative overflow-hidden group cursor-pointer card-3d"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-yellow-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <p className="text-gray-400 text-sm font-medium">Payroll This Month</p>
                    <h3 className="text-4xl font-bold text-accent mt-2 group-hover:scale-110 transition-transform">₹{(monthlyPayroll / 1000).toFixed(1)}k</h3>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-accent to-yellow-600 rounded-2xl flex items-center justify-center shadow-neon-accent group-hover:rotate-12 transition-transform duration-300">
                    <DollarSign className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div className="mt-4 h-1 bg-gradient-to-r from-accent via-yellow-600 to-accent bg-[length:200%_100%] animate-gradient-x rounded-full"></div>
              </motion.div>
            </div>

            {/* ==================== ATTENDANCE TREND CHART + PENDING APPROVALS ==================== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Attendance Trend Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="lg:col-span-2 bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6"
              >
                <div className="h-64">
                  <Line data={attendanceTrendData} options={chartOptions} />
                </div>
              </motion.div>

              {/* Pending Leave Approvals */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4">Pending Approvals</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {leaveRequests.filter(l => l.status === 'Pending').slice(0, 5).map((leave) => (
                    <div key={leave._id} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">
                            {leave.userId?.firstName} {leave.userId?.lastName}
                          </p>
                          <p className="text-gray-400 text-xs mt-1">
                            {leave.type} • {new Date(leave.from).toLocaleDateString()} - {new Date(leave.to).toLocaleDateString()}
                          </p>
                          <p className="text-gray-500 text-xs">{leave.duration || 0} day(s)</p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => handleApproveLeave(leave._id)}
                            className="p-1 hover:bg-green-500/20 rounded text-green-500 transition-all"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRejectLeave(leave._id)}
                            className="p-1 hover:bg-red-500/20 rounded text-red-500 transition-all"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {leaveRequests.filter(l => l.status === 'Pending').length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4">No pending approvals</p>
                  )}
                </div>
              </motion.div>
            </div>

            {/* ==================== STATUS LEGEND ==================== */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex items-center gap-6 mb-6"
            >
              <p className="text-gray-400 text-sm font-medium">Status Legend:</p>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-300 text-sm">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <Plane className="w-3 h-3 text-blue-400" />
                <span className="text-gray-300 text-sm">On Leave</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-300 text-sm">Absent</span>
              </div>
            </motion.div>

            {/* ==================== EMPLOYEE CARD GRID ==================== */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <h2 className="text-xl font-semibold text-white mb-6">
                {searchQuery ? `Search Results (${filteredEmployees.length})` : 'All Employees'}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEmployees.map((employee, index) => {
                  const employeeStatus = getEmployeeStatus(employee);
                  const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
                  
                  return (
                    <motion.div
                      key={employee._id || employee.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * Math.min(index, 9) }}
                      whileHover={{ y: -8, scale: 1.03 }}
                      onClick={() => handleEmployeeCardClick(employee)}
                      className="glass border border-white/10 rounded-2xl p-6 cursor-pointer transition-all relative group overflow-hidden card-3d"
                    >
                      {/* Background Gradient on Hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      {/* Status Indicator - Top Right */}
                      <div className="absolute top-4 right-4 z-10">
                        <StatusIndicator status={employeeStatus} />
                      </div>

                      {/* Employee Avatar */}
                      <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-glow group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative">
                        <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
                        <span className="relative z-10">{(fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span>
                      </div>

                      {/* Employee Info */}
                      <h3 className="text-lg font-semibold text-white relative z-10 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-accent transition-all">{fullName}</h3>
                      <p className="text-gray-400 text-sm mt-1 relative z-10">{employee.position || employee.title || employee.role}</p>
                      <p className="text-gray-500 text-xs mt-1 flex items-center gap-1 relative z-10">
                        <Building2 className="w-3 h-3" />
                        {employee.department || 'N/A'}
                      </p>
                      
                      {/* Additional Details */}
                      <div className="mt-4 pt-4 border-t border-white/10 space-y-2 relative z-10">
                        {employee.email && (
                          <p className="text-gray-400 text-xs flex items-center gap-2 group-hover:text-gray-300 transition-colors">
                            <Mail className="w-3 h-3" />
                            {employee.email}
                          </p>
                        )}
                        {employee.phone && (
                          <p className="text-gray-400 text-xs flex items-center gap-2 group-hover:text-gray-300 transition-colors">
                            <Phone className="w-3 h-3" />
                            {employee.phone}
                          </p>
                        )}
                        {employee.employeeId && (
                          <p className="text-gray-400 text-xs flex items-center gap-2 group-hover:text-gray-300 transition-colors">
                            <UserIcon className="w-3 h-3" />
                            ID: {employee.employeeId}
                          </p>
                        )}
                        {employee.joinDate && (
                          <p className="text-gray-400 text-xs flex items-center gap-2 group-hover:text-gray-300 transition-colors">
                            <Calendar className="w-3 h-3" />
                            Joined: {new Date(employee.joinDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      
                      {/* Shimmer Effect */}
                      <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </motion.div>
                  );
                })}
              </div>

              {/* No Results */}
              {filteredEmployees.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400">No employees found matching "{searchQuery}"</p>
                </div>
              )}
            </motion.div>
              </>
            )}

            {/* ==================== ATTENDANCE PANEL ==================== */}
            {activeMenu === 'Attendance' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Attendance Management</h2>
                  <div className="flex gap-3">
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">All Departments</option>
                      <option value="HR">HR</option>
                      <option value="IT">IT</option>
                      <option value="Finance">Finance</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Sales">Sales</option>
                    </select>
                  </div>
                </div>

                {/* Attendance Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Total Today</p>
                    <p className="text-2xl font-bold text-white mt-1">{todayAttendance.length}</p>
                  </div>
                  <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Present</p>
                    <p className="text-2xl font-bold text-green-500 mt-1">{presentToday}</p>
                  </div>
                  <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">On Leave</p>
                    <p className="text-2xl font-bold text-blue-400 mt-1">{onLeaveToday}</p>
                  </div>
                  <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Absent</p>
                    <p className="text-2xl font-bold text-yellow-500 mt-1">{absentToday}</p>
                  </div>
                </div>

                {/* Mark Attendance Button - Simple */}
                <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Mark Attendance</h3>
                  <div className="flex flex-wrap gap-3">
                    {/* My Attendance */}
                    {user && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser({ _id: user._id, name: `${user.firstName} ${user.lastName}`, role: 'Admin' });
                          setShowMarkAttendance(true);
                        }}
                        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all"
                      >
                        📌 My Attendance
                      </button>
                    )}

                    {/* HR Officers Buttons */}
                    {employees.filter(e => e.role === 'HR Officer').map(emp => (
                      <button
                        key={emp._id}
                        type="button"
                        onClick={() => {
                          setSelectedUser({ _id: emp._id, name: `${emp.firstName} ${emp.lastName}`, role: 'HR Officer' });
                          setShowMarkAttendance(true);
                        }}
                        className="px-4 py-3 bg-primary hover:bg-primary/80 text-white font-semibold rounded-lg transition-all"
                      >
                        {emp.firstName} {emp.lastName} (HR)
                      </button>
                    ))}

                    {/* Payroll Officers Buttons */}
                    {employees.filter(e => e.role === 'Payroll Officer').map(emp => (
                      <button
                        key={emp._id}
                        type="button"
                        onClick={() => {
                          setSelectedUser({ _id: emp._id, name: `${emp.firstName} ${emp.lastName}`, role: 'Payroll Officer' });
                          setShowMarkAttendance(true);
                        }}
                        className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all"
                      >
                        {emp.firstName} {emp.lastName} (Payroll)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Today's Attendance Table */}
                <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl overflow-hidden">
                  <div className="p-6 border-b border-gray-800">
                    <h3 className="text-lg font-semibold text-white">Today's Attendance</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-800/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Employee</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Check In</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Check Out</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Hours</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {todayAttendance.slice(0, 10).map((attendance) => (
                          <tr key={attendance._id} className="hover:bg-gray-800/30 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-white">
                                {attendance.employee?.firstName} {attendance.employee?.lastName}
                              </div>
                              <div className="text-sm text-gray-400">{attendance.employee?.department}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {attendance.checkIn?.time ? new Date(attendance.checkIn.time).toLocaleTimeString() : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {attendance.checkOut?.time ? new Date(attendance.checkOut.time).toLocaleTimeString() : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {attendance.workHours ? formatWorkHours(attendance.workHours, attendance.workHoursFormatted) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                attendance.status === 'present' ? 'bg-green-500/20 text-green-400' :
                                attendance.status === 'late' ? 'bg-yellow-500/20 text-yellow-400' :
                                attendance.status === 'absent' ? 'bg-red-500/20 text-red-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {attendance.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {todayAttendance.length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                        No attendance records for today
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TIME OFF PANEL ==================== */}
            {activeMenu === 'Time Off' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Time Off Management</h2>
                  <div className="flex gap-3">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">All Status</option>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                {/* Leave Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Total Requests</p>
                    <p className="text-2xl font-bold text-white mt-1">{leaveRequests.length}</p>
                  </div>
                  <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Pending</p>
                    <p className="text-2xl font-bold text-yellow-500 mt-1">
                      {leaveRequests.filter(l => l.status === 'Pending').length}
                    </p>
                  </div>
                  <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Approved</p>
                    <p className="text-2xl font-bold text-green-500 mt-1">
                      {leaveRequests.filter(l => l.status === 'Approved').length}
                    </p>
                  </div>
                  <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Rejected</p>
                    <p className="text-2xl font-bold text-red-500 mt-1">
                      {leaveRequests.filter(l => l.status === 'Rejected').length}
                    </p>
                  </div>
                </div>

                {/* Leave Requests Table */}
                <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl overflow-hidden">
                  <div className="p-6 border-b border-gray-800">
                    <h3 className="text-lg font-semibold text-white">Leave Requests</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-800/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Employee</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">From - To</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Days</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Reason</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {leaveRequests
                          .filter(l => statusFilter === 'all' || l.status === statusFilter)
                          .slice(0, 20)
                          .map((leave) => (
                            <tr key={leave._id} className="hover:bg-gray-800/30 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-white">
                                  {leave.userId?.firstName} {leave.userId?.lastName}
                                </div>
                                <div className="text-sm text-gray-400">{leave.userId?.email}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                {leave.type}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                {new Date(leave.from).toLocaleDateString()} - {new Date(leave.to).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                {leave.duration || Math.ceil((new Date(leave.to) - new Date(leave.from)) / (1000 * 60 * 60 * 24)) + 1}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
                                {leave.reason}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  leave.status === 'Approved' ? 'bg-green-500/20 text-green-400' :
                                  leave.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                  leave.status === 'Rejected' ? 'bg-red-500/20 text-red-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {leave.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {leave.status === 'Pending' && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleApproveLeave(leave._id)}
                                      className="p-1 hover:bg-green-500/20 rounded text-green-500 transition-all"
                                      title="Approve"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleRejectLeave(leave._id)}
                                      className="p-1 hover:bg-red-500/20 rounded text-red-500 transition-all"
                                      title="Reject"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {leaveRequests.filter(l => statusFilter === 'all' || l.status === statusFilter).length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                        No leave requests found
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== PAYROLL PANEL ==================== */}
            {activeMenu === 'Payroll' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white neon-text">Payroll Management</h2>
                    <p className="text-gray-400 text-sm mt-1">Manage employee payroll and compensation</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={fetchPayrollData}
                      disabled={payrollLoading}
                      className="flex items-center gap-2 px-4 py-2 glass border border-white/10 rounded-xl text-white hover:bg-white/5 transition-all disabled:opacity-50"
                      title="Refresh payroll data"
                    >
                      <RefreshCw className={`w-4 h-4 ${payrollLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => alert('Generate payroll functionality')}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary text-white rounded-xl font-medium transition-all shadow-glow relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                      <Plus className="w-5 h-5 relative z-10" />
                      <span className="relative z-10">Generate Payroll</span>
                    </motion.button>
                  </div>
                </div>

                {/* Payroll Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="glass border border-white/10 rounded-2xl p-6 relative overflow-hidden group cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10">
                      <p className="text-gray-400 text-sm font-medium">Total Records</p>
                      <p className="text-4xl font-bold text-white mt-2">{payrollRecords.length}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="text-xs text-gray-400">Payroll entries</span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="glass border border-white/10 rounded-2xl p-6 relative overflow-hidden group cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-yellow-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10">
                      <p className="text-gray-400 text-sm font-medium">Total Amount</p>
                      <p className="text-4xl font-bold text-accent mt-2">
                        ₹{(monthlyPayroll / 1000).toFixed(1)}k
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-accent" />
                        <span className="text-xs text-gray-400">Total payout</span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="glass border border-white/10 rounded-2xl p-6 relative overflow-hidden group cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10">
                      <p className="text-gray-400 text-sm font-medium">Processed</p>
                      <p className="text-4xl font-bold text-green-400 mt-2">
                        {payrollRecords.filter(p => p.paymentStatus === 'paid').length}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-gray-400">Completed payments</span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="glass border border-white/10 rounded-2xl p-6 relative overflow-hidden group cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-orange-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10">
                      <p className="text-gray-400 text-sm font-medium">Pending</p>
                      <p className="text-4xl font-bold text-yellow-400 mt-2">
                        {payrollRecords.filter(p => p.paymentStatus === 'pending').length}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs text-gray-400">Awaiting payment</span>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Payroll Table */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="glass border border-white/10 rounded-2xl overflow-hidden relative"
                >
                  {/* Loading Overlay */}
                  <AnimatePresence>
                    {payrollLoading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#0f1729]/90 backdrop-blur-sm z-50 flex items-center justify-center"
                      >
                        <div className="text-center">
                          <div className="relative w-16 h-16 mx-auto mb-4">
                            <div className="absolute inset-0 border-4 border-primary/30 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
                          </div>
                          <p className="text-white font-medium">Loading payroll data...</p>
                          <p className="text-gray-400 text-sm mt-1">Please wait</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Payroll Records</h3>
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 glass border border-white/10 rounded-xl text-sm text-white hover:bg-white/5 transition-all flex items-center gap-2"
                      >
                        <Filter className="w-4 h-4" />
                        Filter
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 glass border border-white/10 rounded-xl text-sm text-white hover:bg-white/5 transition-all flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export
                      </motion.button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="glass-strong">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Employee</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Period</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Basic Salary</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Gross</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Net Pay</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {payrollRecords.slice(0, 20).map((payroll, index) => (
                          <motion.tr
                            key={payroll._id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 * index }}
                            className="hover:bg-white/5 transition-colors group"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-glow">
                                  {payroll.employee?.firstName?.[0]}{payroll.employee?.lastName?.[0]}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-white">
                                    {payroll.employee?.firstName} {payroll.employee?.lastName}
                                  </div>
                                  <div className="text-xs text-gray-400">{payroll.employee?.employeeId}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {payroll.payPeriod?.startDate && new Date(payroll.payPeriod.startDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                              ₹{payroll.basicSalary?.toLocaleString() || '0'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                              ₹{payroll.grossEarnings?.toLocaleString() || '0'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-accent font-mono">
                              ₹{payroll.netPay?.toLocaleString() || '0'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1.5 inline-flex text-xs font-semibold rounded-full ${
                                payroll.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                payroll.paymentStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                payroll.paymentStatus === 'processing' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                              }`}>
                                {payroll.paymentStatus || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => alert('View payslip')}
                                className="p-2 hover:bg-primary/20 rounded-xl text-primary transition-all border border-transparent hover:border-primary/30"
                                title="View Payslip"
                              >
                                <Eye className="w-4 h-4" />
                              </motion.button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                    {payrollRecords.length === 0 && (
                      <div className="text-center py-16">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-20 h-20 bg-gray-800/50 rounded-2xl flex items-center justify-center">
                            <DollarSign className="w-10 h-10 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-gray-400 font-medium">No payroll records found</p>
                            <p className="text-gray-500 text-sm mt-1">Generate your first payroll to get started</p>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => alert('Generate payroll functionality')}
                            className="mt-2 px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-medium shadow-glow"
                          >
                            Generate First Payroll
                          </motion.button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}

            {/* ==================== REPORTS PANEL ==================== */}
            {activeMenu === 'Reports' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Reports & Analytics</h2>
                  <button
                    onClick={() => alert('Generate new report')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Generate Report
                  </button>
                </div>

                {/* Report Types Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <button
                    onClick={() => alert('Generate attendance report')}
                    className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6 hover:border-primary transition-all text-left"
                  >
                    <Clock className="w-8 h-8 text-primary mb-3" />
                    <h3 className="text-white font-semibold">Attendance Report</h3>
                    <p className="text-gray-400 text-sm mt-1">Generate attendance analytics</p>
                  </button>
                  <button
                    onClick={() => alert('Generate leave report')}
                    className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6 hover:border-primary transition-all text-left"
                  >
                    <Calendar className="w-8 h-8 text-blue-400 mb-3" />
                    <h3 className="text-white font-semibold">Leave Report</h3>
                    <p className="text-gray-400 text-sm mt-1">Analyze leave patterns</p>
                  </button>
                  <button
                    onClick={() => alert('Generate payroll report')}
                    className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6 hover:border-primary transition-all text-left"
                  >
                    <DollarSign className="w-8 h-8 text-accent mb-3" />
                    <h3 className="text-white font-semibold">Payroll Report</h3>
                    <p className="text-gray-400 text-sm mt-1">View payroll summaries</p>
                  </button>
                  <button
                    onClick={() => alert('Generate employee report')}
                    className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6 hover:border-primary transition-all text-left"
                  >
                    <Users className="w-8 h-8 text-green-400 mb-3" />
                    <h3 className="text-white font-semibold">Employee Report</h3>
                    <p className="text-gray-400 text-sm mt-1">Employee analytics</p>
                  </button>
                </div>

                {/* Recent Reports */}
                <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl overflow-hidden">
                  <div className="p-6 border-b border-gray-800">
                    <h3 className="text-lg font-semibold text-white">Recent Reports</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-800/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Generated By</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {reports.slice(0, 10).map((report) => (
                          <tr key={report._id} className="hover:bg-gray-800/30 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-white">{report.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary/20 text-primary">
                                {report.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {report.generatedBy?.firstName} {report.generatedBy?.lastName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {report.generatedAt && new Date(report.generatedAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                report.status === 'generated' ? 'bg-green-500/20 text-green-400' :
                                report.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {report.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => alert('View report')}
                                  className="p-1 hover:bg-primary/20 rounded text-primary transition-all"
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleExportPDF(report)}
                                  className="p-1 hover:bg-green-500/20 rounded text-green-400 transition-all"
                                  title="Export PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleExportCSV(report)}
                                  className="p-1 hover:bg-blue-500/20 rounded text-blue-400 transition-all"
                                  title="Export CSV"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {reports.length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                        No reports generated yet. Create your first report!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== SETTINGS PANEL ==================== */}
            {activeMenu === 'Settings' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Settings & User Management</h2>
                    <p className="text-gray-400 text-sm mt-1">Total Users: <span className="text-primary font-semibold">{users.length}</span></p>
                  </div>
                </div>

                {/* Currently Logged In User Card */}
                {user && (
                  <div className="bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold text-2xl">
                          {(user.firstName || user.name || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-widest">Currently Logged In</p>
                          <h3 className="text-xl font-bold text-white">
                            {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name}
                          </h3>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-semibold">
                              {user.role || 'Admin'}
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

                {/* User Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Total Users</p>
                        <p className="text-3xl font-bold text-white mt-2">{users.length}</p>
                      </div>
                      <Users className="w-10 h-10 text-primary opacity-50" />
                    </div>
                  </div>
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Active Users</p>
                        <p className="text-3xl font-bold text-green-400 mt-2">{users.filter(u => u.isActive !== false).length}</p>
                      </div>
                      <CheckCircle className="w-10 h-10 text-green-400 opacity-50" />
                    </div>
                  </div>
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Inactive Users</p>
                        <p className="text-3xl font-bold text-red-400 mt-2">{users.filter(u => u.isActive === false).length}</p>
                      </div>
                      <XCircle className="w-10 h-10 text-red-400 opacity-50" />
                    </div>
                  </div>
                </div>

                {/* Settings Tabs */}
                <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
                  <div className="space-y-6">
                    {/* User Management Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-white">User Management</h3>
                          <button
                            onClick={handleRefreshUsers}
                            className="p-1.5 hover:bg-gray-700 rounded transition-all text-gray-400 hover:text-white"
                            title="Refresh user list"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={handleCreateUser}
                          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-all"
                        >
                          <UserPlus className="w-4 h-4" />
                          Add User
                        </button>
                      </div>

                      {/* Users Table */}
                      <div className="border border-gray-700 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-800/50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Department</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700">
                            {users.map((userItem) => (
                              <tr key={userItem._id || userItem.id} className="hover:bg-gray-800/30 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                                      {(userItem.firstName || userItem.name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-white">
                                        {userItem.firstName && userItem.lastName 
                                          ? `${userItem.firstName} ${userItem.lastName}` 
                                          : userItem.name}
                                      </div>
                                      <div className="text-sm text-gray-400">{userItem.userId || userItem.employeeId}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                  {userItem.email}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <select
                                    value={userItem.role}
                                    onChange={(e) => handleUpdateUserRole(userItem._id || userItem.id, e.target.value)}
                                    className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                  >
                                    <option value="Admin">Admin</option>
                                    <option value="HR Officer">HR Officer</option>
                                    <option value="Payroll Officer">Payroll Officer</option>
                                    <option value="Employee">Employee</option>
                                  </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                  {userItem.department || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <button
                                    onClick={() => handleToggleUserStatus(userItem._id || userItem.id)}
                                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer ${
                                      userItem.isActive !== false
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-red-500/20 text-red-400'
                                    }`}
                                  >
                                    {userItem.isActive !== false ? 'Active' : 'Inactive'}
                                  </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleEditUser(userItem)}
                                      className="p-1 hover:bg-primary/20 rounded text-primary transition-all"
                                      title="Edit"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUser(userItem._id || userItem.id)}
                                      className="p-1 hover:bg-red-500/20 rounded text-red-500 transition-all"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {users.length === 0 && (
                          <div className="text-center py-12 text-gray-400">
                            No users found
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Role Descriptions */}
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold text-white mb-4">Role Descriptions</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-5 h-5 text-red-400" />
                            <h4 className="text-white font-semibold">Admin</h4>
                          </div>
                          <ul className="text-sm text-gray-300 space-y-1">
                            <li>• Full system access</li>
                            <li>• Manage all users and roles</li>
                            <li>• CRUD operations on all modules</li>
                            <li>• Oversee all activities</li>
                          </ul>
                        </div>
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-5 h-5 text-blue-400" />
                            <h4 className="text-white font-semibold">HR Officer</h4>
                          </div>
                          <ul className="text-sm text-gray-300 space-y-1">
                            <li>• Manage employee records</li>
                            <li>• Approve/reject leave requests</li>
                            <li>• Track attendance</li>
                            <li>• Generate reports</li>
                          </ul>
                        </div>
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-5 h-5 text-accent" />
                            <h4 className="text-white font-semibold">Payroll Officer</h4>
                          </div>
                          <ul className="text-sm text-gray-300 space-y-1">
                            <li>• Process payroll</li>
                            <li>• Manage salary records</li>
                            <li>• Generate payslips</li>
                            <li>• View payroll reports</li>
                          </ul>
                        </div>
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <UserIcon className="w-5 h-5 text-green-400" />
                            <h4 className="text-white font-semibold">Employee</h4>
                          </div>
                          <ul className="text-sm text-gray-300 space-y-1">
                            <li>• View own records</li>
                            <li>• Request leave</li>
                            <li>• Mark attendance</li>
                            <li>• View payslips</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
      </div>
    </div>

      {/* ==================== EMPLOYEE DETAILS PANEL (Right Side) ==================== */}
      <AnimatePresence>
        {showEmployeePanel && selectedEmployee && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEmployeePanel(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-50 overflow-y-auto"
            >
              {/* Panel Header */}
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Employee Details</h3>
                <button
                  onClick={() => setShowEmployeePanel(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-all"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Panel Content */}
              <div className="p-6 space-y-6">
                {/* Avatar & Name */}
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4">
                    {`${selectedEmployee.firstName || ''} ${selectedEmployee.lastName || ''}`.trim().split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </div>
                  <h4 className="text-xl font-bold text-white">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </h4>
                  <p className="text-gray-400 text-sm mt-1">{selectedEmployee.position || selectedEmployee.title}</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <StatusIndicator status={getEmployeeStatus(selectedEmployee)} />
                    <span className="text-sm text-gray-400 capitalize">{getEmployeeStatus(selectedEmployee)}</span>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-300">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{selectedEmployee.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{selectedEmployee.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{selectedEmployee.department}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{selectedEmployee.employeeId}</span>
                  </div>
                </div>

                {/* Employee Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Employment Type</p>
                    <p className="text-white font-semibold text-sm mt-1">
                      {selectedEmployee.employmentType || 'Full-time'}
                    </p>
                  </div>
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Start Date</p>
                    <p className="text-white font-semibold text-sm mt-1">
                      {selectedEmployee.startDate 
                        ? new Date(selectedEmployee.startDate).toLocaleDateString() 
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3">
                  <h5 className="text-sm font-semibold text-gray-400 uppercase">Quick Actions</h5>
                  
                  <button 
                    onClick={() => alert('Mark attendance functionality')}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all text-left"
                  >
                    <Clock4 className="w-4 h-4 text-primary" />
                    <span className="text-white text-sm">View Attendance</span>
                  </button>

                  <button 
                    onClick={() => alert('Edit employee functionality')}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all text-left"
                  >
                    <FileEdit className="w-4 h-4 text-primary" />
                    <span className="text-white text-sm">Edit Details</span>
                  </button>

                  <button 
                    onClick={() => alert('View payslip functionality')}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all text-left"
                  >
                    <ClipboardCheck className="w-4 h-4 text-primary" />
                    <span className="text-white text-sm">View Payslip</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ==================== USER CREATE/EDIT MODAL ==================== */}
      <AnimatePresence>
        {showUserModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUserModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-2xl pointer-events-auto overflow-hidden">
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">
                    {editingUser ? 'Edit User' : 'Create New User'}
                  </h3>
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Modal Body */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const userData = Object.fromEntries(formData);
                    
                    if (editingUser) {
                      api.users.update(editingUser._id || editingUser.id, userData)
                        .then(() => {
                          setShowUserModal(false);
                          fetchDashboardData();
                          alert('User updated successfully!');
                        })
                        .catch(err => {
                          console.error('Error updating user:', err);
                          alert(`Failed to update user: ${err.message || 'Please check if the backend server is running.'}`);
                        });
                    } else {
                      api.users.create(userData)
                        .then(() => {
                          setShowUserModal(false);
                          fetchDashboardData();
                          alert('User created successfully!');
                        })
                        .catch(err => {
                          console.error('Error creating user:', err);
                          alert(`Failed to create user: ${err.message || 'Please check if the backend server is running.'}`);
                        });
                    }
                  }}
                  className="p-6 space-y-4 max-h-[70vh] overflow-y-auto"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        defaultValue={editingUser?.firstName || ''}
                        required
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        defaultValue={editingUser?.lastName || ''}
                        required
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      defaultValue={editingUser?.email || ''}
                      required
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {!editingUser && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Password *
                      </label>
                      <input
                        type="password"
                        name="password"
                        required
                        minLength={6}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Role *
                      </label>
                      <select
                        name="role"
                        defaultValue={editingUser?.role || 'Employee'}
                        required
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="Admin">Admin</option>
                        <option value="HR Officer">HR Officer</option>
                        <option value="Payroll Officer">Payroll Officer</option>
                        <option value="Employee">Employee</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Department
                      </label>
                      <select
                        name="department"
                        defaultValue={editingUser?.department || ''}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select Department</option>
                        <option value="HR">HR</option>
                        <option value="IT">IT</option>
                        <option value="Finance">Finance</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Sales">Sales</option>
                        <option value="Operations">Operations</option>
                        <option value="Legal">Legal</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Company *
                    </label>
                    <input
                      type="text"
                      name="company"
                      defaultValue={editingUser?.company || 'DayFlow'}
                      required
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Modal Footer */}
                  <div className="flex gap-3 pt-4 border-t border-gray-800">
                    <button
                      type="button"
                      onClick={() => setShowUserModal(false)}
                      className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {editingUser ? 'Update User' : 'Create User'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mark Attendance Modal */}
      <AnimatePresence>
        {showMarkAttendance && selectedUser && (
          <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
                onClick={() => setShowMarkAttendance(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-96 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">Mark Attendance</h3>
                    <button
                      onClick={() => setShowMarkAttendance(false)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Staff Member Info */}
                    <div className="bg-gray-800/50 p-4 rounded-lg border-l-4 border-primary">
                      <p className="text-sm text-gray-400">Staff Member</p>
                      <p className="text-lg font-semibold text-white">{selectedUser.name}</p>
                      <p className="text-xs text-gray-500">{selectedUser.role}</p>
                    </div>

                    {/* Date Selection */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Date</label>
                      <input
                        type="date"
                        value={attendanceDate}
                        onChange={(e) => setAttendanceDate(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={async () => {
                          setMarkingCheckIn(true);
                          try {
                            const response = await fetch(`http://localhost:5000/api/attendance/simple-mark`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('dayflow_token')}`
                              },
                              body: JSON.stringify({
                                userId: selectedUser._id,
                                date: attendanceDate,
                                status: 'present'
                              })
                            });
                            const data = await response.json();
                            if (data.success) {
                              showToast(`✓ ${selectedUser.name} marked as PRESENT`, 'success');
                              setTimeout(() => {
                                fetchDashboardData();
                                setShowMarkAttendance(false);
                                setSelectedUser(null);
                                setAttendanceDate(new Date().toISOString().split('T')[0]);
                              }, 500);
                            } else {
                              showToast(data.message || 'Failed to mark attendance', 'error');
                            }
                          } catch (error) {
                            console.error('Error:', error);
                            showToast('Failed to mark attendance', 'error');
                          } finally {
                            setMarkingCheckIn(false);
                          }
                        }}
                        disabled={markingCheckIn || markingCheckOut}
                        className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                      >
                        {markingCheckIn ? 'Marking...' : '✓ Mark as PRESENT'}
                      </button>
                      
                      <button
                        onClick={async () => {
                          setMarkingCheckOut(true);
                          try {
                            const response = await fetch(`http://localhost:5000/api/attendance/simple-mark`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('dayflow_token')}`
                              },
                              body: JSON.stringify({
                                userId: selectedUser._id,
                                date: attendanceDate,
                                status: 'absent'
                              })
                            });
                            const data = await response.json();
                            if (data.success) {
                              showToast(`✓ ${selectedUser.name} marked as ABSENT`, 'success');
                              setTimeout(() => {
                                fetchDashboardData();
                                setShowMarkAttendance(false);
                                setSelectedUser(null);
                                setAttendanceDate(new Date().toISOString().split('T')[0]);
                              }, 500);
                            } else {
                              showToast(data.message || 'Failed to mark attendance', 'error');
                            }
                          } catch (error) {
                            console.error('Error:', error);
                            showToast('Failed to mark attendance', 'error');
                          } finally {
                            setMarkingCheckOut(false);
                          }
                        }}
                        disabled={markingCheckOut || markingCheckIn}
                        className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                      >
                        {markingCheckOut ? 'Marking...' : '✗ Mark as ABSENT'}
                      </button>
                    </div>

                    <button
                      onClick={() => setShowMarkAttendance(false)}
                      className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all mt-2"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
      </AnimatePresence>
    </div>
  );
}

export default DashboardAdmin;
