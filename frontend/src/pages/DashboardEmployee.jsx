/**
 * WorkZen HRMS - Employee Dashboard
 * Single-file page aligned visually with Admin Dashboard but restricted to Employee features:
 * - Left sidebar: Employees, Attendance, Time Off (no Payroll/Reports/Settings)
 * - Topbar: Search, Apply Time Off CTA, Avatar dropdown (Profile/Logout)
 * - Main area: KPI widgets, Tabs (Directory / Attendance / Time Off)
 *
 * Replace mocks with real API calls as back-end evolves. Keep single-file convention.
 */

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Clock, Calendar, Search, UserPlus, LogOut, User as UserIcon, ChevronDown,
  CheckCircle, AlertCircle, X, Mail, Phone, MapPin
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function DashboardEmployee() {
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
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const avatarBtnRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  function updateDropdownPosition() {
    const btn = avatarBtnRef.current;
    if (!btn || typeof window === 'undefined') return;
    const rect = btn.getBoundingClientRect();
    const dropdownWidth = 192; // matches w-48 (192px)
    let left = rect.right + window.scrollX - dropdownWidth;
    const minLeft = 8 + window.scrollX;
    const maxLeft = window.innerWidth - dropdownWidth - 8 + window.scrollX;
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;
    const top = rect.bottom + window.scrollY + 8;
    setDropdownPos({ top, left });
  }

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

  // Data states
  const [directory, setDirectory] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [kpis, setKpis] = useState({ present: 0, late: 0, leaves: 0, performance: 88 });
  const [chartData, setChartData] = useState(null);

  // Attendance marking states
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [attendanceView, setAttendanceView] = useState('daily'); // 'daily' or 'monthly'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Time off
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: 'Vacation', from: '', to: '', reason: '' });
  const [leaves, setLeaves] = useState([]);
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Employee panel
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeePanel, setShowEmployeePanel] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('workzen_token');
    const role = localStorage.getItem('workzen_role');
    const userData = localStorage.getItem('workzen_user');

    if (!token || role !== 'Employee') {
      navigate('/login');
      return;
    }
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      console.log('👤 User loaded:', parsedUser.email);
    }

    // initial fetches
    fetchDirectory();
    fetchAttendance();
    fetchTodayAttendance();
    fetchKPIs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Fetch leaves when user is loaded
  useEffect(() => {
    if (user?.email) {
      console.log('🔄 User email available, fetching leaves for:', user.email);
      fetchLeaves();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fetch directory (uses /api/users)
  async function fetchDirectory() {
    try {
      const res = await fetch('http://localhost:5000/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('workzen_token')}`
        }
      });
      if (!res.ok) throw new Error('Directory load failed');
      const data = await res.json();
      setDirectory(data.users || []);
      console.log('✅ Directory loaded:', data.users?.length || 0, 'users');
    } catch (err) {
      console.error('❌ Fetch directory error:', err);
      setDirectory([]); // fallback
    }
  }

  // Fetch attendance from real API
  async function fetchAttendance() {
    try {
      const storedUser = JSON.parse(localStorage.getItem('workzen_user') || '{}');
      const userId = storedUser._id || storedUser.id;
      
      console.log('👤 Stored user:', storedUser);
      console.log('🆔 User ID:', userId);
      
      if (!userId) {
        console.log('⚠️ No user ID for attendance fetch');
        setAttendance([]);
        return;
      }

      console.log('📊 Fetching attendance records for user:', userId);

      // Fetch last 30 days of attendance (add high limit to get all records)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      console.log('📅 Date range:', startDate, 'to', endDate);
      
      const apiUrl = `http://localhost:5000/api/attendance?employeeId=${userId}&startDate=${startDate}&endDate=${endDate}&limit=100`;
      console.log('🌐 API URL:', apiUrl);
      
      const res = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('workzen_token')}`
        }
      });
      
      const data = await res.json();
      console.log('📥 Attendance API response:', data);
      
      // Handle different response formats
      const attendanceRecords = data.data?.attendance || data.attendance || [];
      
      if (res.ok && attendanceRecords.length > 0) {
        const records = attendanceRecords.map(a => ({
          ...a,
          date: a.date ? new Date(a.date).toISOString().split('T')[0] : null,
          day: new Date(a.date).getDate(),
          present: a.status === 'present' || a.status === 'late' ? 1 : 0,
          timeIn: a.checkIn?.time ? new Date(a.checkIn.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null,
          timeOut: a.checkOut?.time ? new Date(a.checkOut.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null,
          workHours: a.workHours || 0,
          status: a.status
        }));
        
        setAttendance(records);
        console.log(`✅ Loaded ${records.length} attendance records`);
      } else {
        console.log('ℹ️ No attendance records found');
        setAttendance([]);
      }
    } catch (err) {
      console.error('❌ Fetch attendance error:', err);
      setAttendance([]);
    }
  }

  // Fetch KPI statistics
  async function fetchKPIs() {
    try {
      const storedUser = JSON.parse(localStorage.getItem('workzen_user') || '{}');
      const userId = storedUser._id || storedUser.id;
      
      if (!userId) {
        console.log('⚠️ No user ID for KPI fetch');
        return;
      }

      console.log('📊 Fetching KPIs for user:', userId);

      // Get current month dates
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
      const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

      // Fetch attendance records for current month
      const attendanceRes = await fetch(`http://localhost:5000/api/attendance?employeeId=${userId}&startDate=${startOfMonth}&endDate=${endOfMonth}&limit=100`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('workzen_token')}`
        }
      });

      if (attendanceRes.ok) {
        const attendanceData = await attendanceRes.json();
        console.log('📥 KPI attendance data:', attendanceData);
        
        // Handle different response formats
        const records = attendanceData.data?.attendance || attendanceData.attendance || [];
        
        console.log('📊 Processing', records.length, 'attendance records for KPIs');
        
        // Calculate present days (status === 'present')
        const presentDays = records.filter(r => r.status === 'present').length;
        
        // Calculate late days (check-in time after 9:30 AM)
        const lateDays = records.filter(r => {
          if (!r.checkIn?.time) return false;
          const checkInTime = new Date(r.checkIn.time);
          const hours = checkInTime.getHours();
          const minutes = checkInTime.getMinutes();
          return hours > 9 || (hours === 9 && minutes > 30);
        }).length;

        console.log('✅ Attendance KPIs - Present:', presentDays, 'Late:', lateDays);
        
        // Fetch leaves for current month
        const leavesRes = await fetch(`http://localhost:5000/api/leaves`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('workzen_token')}`
          }
        });

        let leavesTaken = 0;
        if (leavesRes.ok) {
          const leavesData = await leavesRes.json();
          const userEmail = storedUser.email;
          const allLeaves = leavesData.leaves || leavesData.data || [];
          
          // Count approved leaves in current month for this user
          leavesTaken = allLeaves.filter(leave => {
            const isApproved = leave.status === 'approved';
            const isCurrentUser = leave.employee?.email === userEmail || leave.userEmail === userEmail;
            const leaveStart = new Date(leave.startDate);
            const leaveEnd = new Date(leave.endDate);
            const monthStart = new Date(startOfMonth);
            const monthEnd = new Date(endOfMonth);
            
            // Check if leave overlaps with current month
            const overlaps = leaveStart <= monthEnd && leaveEnd >= monthStart;
            
            return isApproved && isCurrentUser && overlaps;
          }).length;
        }

        console.log('✅ KPIs updated - Present:', presentDays, 'Leaves:', leavesTaken, 'Late:', lateDays);
        
        setKpis({
          present: presentDays,
          leaves: leavesTaken,
          late: lateDays,
          performance: 88 // Keep static for now
        });
      }
    } catch (err) {
      console.error('❌ Fetch KPIs error:', err);
    }
  }

  async function fetchLeaves() {
    try {
      console.log('📋 Fetching leaves from API...');
      const res = await fetch('http://localhost:5000/api/leaves', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('workzen_token')}`
        }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('✅ API Response:', data);
      
      // Get user email from state or localStorage
      const userEmail = user?.email || JSON.parse(localStorage.getItem('workzen_user') || '{}').email;
      
      if (!userEmail) {
        console.warn('⚠️ No user email available, cannot filter leaves');
        setLeaves([]);
        return;
      }
      
      console.log('� Filtering leaves for user:', userEmail);
      
      // Filter by user email and map to include all fields
      const allLeaves = data.leaves || data.data || [];
      console.log('📊 Total leaves from API:', allLeaves.length);
      
      const my = allLeaves.filter(l => {
        const matches = l.email === userEmail || 
                       l.userEmail === userEmail ||
                       l.userId?.email === userEmail;
        if (matches) {
          console.log('✓ Match found:', l.type, l.from, l.status);
        }
        return matches;
      }).map(l => ({
        id: l._id || l.id,
        type: l.type,
        from: l.from ? new Date(l.from).toISOString().split('T')[0] : '',
        to: l.to ? new Date(l.to).toISOString().split('T')[0] : '',
        reason: l.reason,
        status: l.status,
        comments: l.comments,
        duration: l.duration,
        createdAt: l.createdAt,
        approvedAt: l.approvedAt,
        rejectedAt: l.rejectedAt,
        approverId: l.approverId
      }));
      
      // Sort by creation date (newest first)
      my.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setLeaves(my);
      console.log(`✅ Loaded ${my.length} leave requests for user ${userEmail}`);
    } catch (err) {
      console.error('❌ Fetch leaves error:', err);
      setLeaves([]);
    }
  }

  function computeKpisFromAttendance(records) {
    const present = records.filter(r => r.present === 1).length;
    const late = records.filter(r => r.timeIn && r.timeIn > '09:15').length;
    const leavesTaken = leaves.filter(l => l.status === 'Approved').length;
    setKpis({ present, late, leaves: leavesTaken, performance: 88 });
  }

  function buildChartFromAttendance(records) {
    const labels = records.map(r => `D${r.day}`);
    const data = records.map(r => (r.present ? 1 : 0));
    setChartData({ labels, datasets: [{ label: 'Present (1/0)', data, borderColor: '#005eb8', backgroundColor: 'rgba(0,94,184,0.1)', tension: 0.3 }] });
  }

  // Submit leave (with proper field names)
  async function submitLeave(e) {
    e.preventDefault();
    if (!leaveForm.from || !leaveForm.to || !leaveForm.reason) {
      alert('Please fill from/to/reason');
      return;
    }
    
    // Validate dates
    const fromDate = new Date(leaveForm.from);
    const toDate = new Date(leaveForm.to);
    if (toDate < fromDate) {
      alert('End date must be after or equal to start date');
      return;
    }
    
    const optimistic = { 
      id: Date.now(), 
      type: leaveForm.type, 
      from: leaveForm.from, 
      to: leaveForm.to, 
      reason: leaveForm.reason, 
      status: 'Pending', 
      email: user?.email,
      userEmail: user?.email,
      createdAt: new Date().toISOString() 
    };
    
    setLeaves(prev => [optimistic, ...prev]);
    setSubmittingLeave(true);
    
    try {
      console.log('📤 Submitting leave request:', optimistic);
      
      const res = await fetch('/api/leaves', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(optimistic) 
      });
      
      const data = await res.json();
      console.log('📥 Leave submission response:', data);
      
      if (!res.ok) {
        throw new Error(data.message || 'Submit failed');
      }
      
      // Success - update with real data from server
      setLeaves(prev => prev.map(l => 
        l.id === optimistic.id ? { ...data.leave, id: data.id || data.leave._id } : l
      ));
      
      // Re-fetch to get updated list
      fetchLeaves();
      
      alert('✅ Leave request submitted successfully!');
      setLeaveForm({ type: 'Vacation', from: '', to: '', reason: '' });
      
    } catch (err) {
      console.error('❌ Submit leave error:', err);
      
      // Mark as failed
      setLeaves(prev => prev.map(l => 
        l.id === optimistic.id ? { ...l, status: 'Failed' } : l
      ));
      
      alert(`Submit failed: ${err.message}. Please try again.`);
      
    } finally {
      setSubmittingLeave(false);
    }
  }

  // Fetch today's attendance
  async function fetchTodayAttendance() {
    try {
      const storedUser = JSON.parse(localStorage.getItem('workzen_user') || '{}');
      const userId = storedUser._id || storedUser.id;
      
      if (!userId) {
        console.log('⚠️ No user ID found for attendance fetch');
        return;
      }

      console.log('📊 Fetching today\'s attendance for user:', userId);
      
      const today = new Date().toISOString().split('T')[0];
      console.log('📅 Today\'s date:', today);
      
      const url = `http://localhost:5000/api/attendance?employeeId=${userId}&startDate=${today}&endDate=${today}&limit=10`;
      console.log('🔗 Fetching from URL:', url);
      
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('workzen_token')}`
        }
      });
      
      const data = await res.json();
      console.log('📥 Today\'s attendance response:', data);
      console.log('📥 Response status:', res.status, res.ok);
      
      // Handle different response formats
      const todayRecords = data.data?.attendance || data.attendance || [];
      console.log('📋 Today\'s records found:', todayRecords.length, todayRecords);
      
      if (res.ok && todayRecords.length > 0) {
        setTodayAttendance(todayRecords[0]);
        console.log('✅ Today\'s attendance SET TO STATE:', todayRecords[0]);
      } else {
        setTodayAttendance(null);
        console.log('ℹ️ No attendance marked today - STATE SET TO NULL');
      }
    } catch (err) {
      console.error('❌ Fetch today attendance error:', err);
      setTodayAttendance(null);
    }
  }

  // Mark check-in
  async function checkIn() {
    setCheckingIn(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem('workzen_user') || '{}');
      const userId = storedUser._id || storedUser.id;
      
      if (!userId) {
        alert('User not found. Please login again.');
        return;
      }

      // Get location if available
      let location = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            address: 'Office' // You can use reverse geocoding here
          };
        } catch (geoErr) {
          console.log('Geolocation not available:', geoErr);
        }
      }

      const payload = {
        employeeId: userId,
        location: location,
        method: 'web'
      };

      console.log('📤 Sending check-in payload:', payload);
      
      const res = await fetch('http://localhost:5000/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('📥 Check-in response status:', res.status);
      
      const data = await res.json();
      console.log('📥 Check-in response data:', data);
      
      if (!res.ok) {
        console.error('❌ Server error response:', data);
        
        // If already checked in, fetch today's attendance to update UI
        if (data.message && data.message.includes('Already checked in')) {
          await fetchTodayAttendance();
          alert('ℹ️ You have already checked in today');
        } else {
          throw new Error(data.message || data.error || 'Check-in failed');
        }
        return;
      }

      setTodayAttendance(data.data?.attendance || data.attendance || data);
      alert('✅ Checked in successfully!');
      
      // Refresh attendance list and KPIs
      fetchAttendance();
      fetchKPIs();
      
    } catch (err) {
      console.error('❌ Check-in error:', err);
      console.error('❌ Error details:', {
        message: err.message,
        stack: err.stack
      });
      alert(`Check-in failed: ${err.message}`);
    } finally {
      setCheckingIn(false);
    }
  }

  // Mark check-out
  async function checkOut() {
    if (!todayAttendance || !todayAttendance._id) {
      alert('No check-in record found for today');
      return;
    }

    setCheckingOut(true);
    try {
      // Get location if available
      let location = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            address: 'Office'
          };
        } catch (geoErr) {
          console.log('Geolocation not available:', geoErr);
        }
      }

      const payload = {
        employeeId: user?._id || user?.id,
        checkOut: {
          time: new Date().toISOString(),
          location: location,
          method: 'web',
          ipAddress: '0.0.0.0',
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform || 'Unknown'
          }
        }
      };

      const res = await fetch(`http://localhost:5000/api/attendance/check-out`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Check-out failed');
      }

      setTodayAttendance(data.data?.attendance || data.attendance || data);
      alert('✅ Checked out successfully!');
      
      // Refresh attendance list and KPIs
      fetchAttendance();
      fetchKPIs();
      
    } catch (err) {
      console.error('❌ Check-out error:', err);
      alert(`Check-out failed: ${err.message}`);
    } finally {
      setCheckingOut(false);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('workzen_token');
    localStorage.removeItem('workzen_role');
    localStorage.removeItem('workzen_user');
    navigate('/login');
  };

  const filteredDirectory = directory.filter(u => (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.role || '').toLowerCase().includes(searchQuery.toLowerCase()));

  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: 'Last 30 Days Attendance', color: '#fff' } }, scales: { y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(156,163,175,0.05)' } }, x: { ticks: { color: '#9ca3af' } } } };

  if (!user) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <motion.aside initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="w-64 bg-gray-900/50 backdrop-blur-xl border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800 flex items-center gap-2">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">WorkZen</h2>
          <p className="text-sm text-gray-400">Employee</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <motion.button onClick={() => setActiveMenu('Dashboard')} whileHover={{ x: 4 }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeMenu === 'Dashboard' ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}><Clock className="w-5 h-5" /><span className="font-medium">Dashboard</span></motion.button>
          <motion.button onClick={() => setActiveMenu('Time Off')} whileHover={{ x: 4 }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeMenu === 'Time Off' ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}><Calendar className="w-5 h-5" /><span className="font-medium">Time Off</span></motion.button>
        </nav>
      </motion.aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-gray-900/50 backdrop-blur-xl border-b border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-xl relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input aria-label="Search employees" type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex items-center gap-4 ml-6">
              {/* <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowTimeOffModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg font-medium transition-all"><UserPlus className="w-4 h-4" />Apply</motion.button> */}
              <div className="relative">
                <motion.button ref={avatarBtnRef} onClick={() => setShowProfileDropdown(p => !p)} whileHover={{ scale: 1.05 }} className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-all">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold text-sm">{(user.name || user.firstName + ' ' + user.lastName || 'U').split(' ')[0][0].toUpperCase()}</div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
                </motion.button>

                {typeof document !== 'undefined' && createPortal(
                  <AnimatePresence>
                    {showProfileDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: 192 }}
                        className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50"
                      >
                        <button onClick={() => { setShowProfileDropdown(false); navigate('/profile'); }} className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-all text-left"><UserIcon className="w-4 h-4" />Profile</button>
                        <button onClick={() => { setShowProfileDropdown(false); handleLogout(); }} className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-all text-left border-t border-gray-700"><LogOut className="w-4 h-4" />Logout</button>
                      </motion.div>
                    )}
                  </AnimatePresence>,
                  document.body
                )}
              </div>
            </div>
          </div>
        </motion.header>

        <div className="flex-1 overflow-y-auto p-6 relative">
          <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div><div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div></div>
          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6"><div className="flex items-center justify-between"><div><p className="text-gray-400 text-sm">Present this month</p><h3 className="text-3xl font-bold text-white mt-2">{kpis.present}</h3></div><div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center"><CheckCircle className="w-6 h-6 text-green-500" /></div></div></motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6"><div className="flex items-center justify-between"><div><p className="text-gray-400 text-sm">Leaves taken</p><h3 className="text-3xl font-bold text-white mt-2">{kpis.leaves}</h3></div><div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center"><Calendar className="w-6 h-6 text-accent" /></div></div></motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6"><div className="flex items-center justify-between"><div><p className="text-gray-400 text-sm">Late days</p><h3 className="text-3xl font-bold text-white mt-2">{kpis.late}</h3></div><div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center"><AlertCircle className="w-6 h-6 text-yellow-500" /></div></div></motion.div>
              {/* <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6"><div className="flex items-center justify-between"><div><p className="text-gray-400 text-sm">Performance</p><h3 className="text-3xl font-bold text-white mt-2">{kpis.performance}%</h3></div><div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center"><UserIcon className="w-6 h-6 text-primary" /></div></div></motion.div> */}
            </div>

            <div>
              {activeMenu === 'Dashboard' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">My Attendance</h2>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setAttendanceView('daily')}
                        className={`px-4 py-2 rounded-lg ${attendanceView === 'daily' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-300'}`}
                      >
                        Daily
                      </button>
                      <button 
                        onClick={() => setAttendanceView('monthly')}
                        className={`px-4 py-2 rounded-lg ${attendanceView === 'monthly' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-300'}`}
                      >
                        Monthly
                      </button>
                    </div>
                  </div>

                  {/* Check In/Out Panel */}
                  <div className="bg-gradient-to-r from-primary/20 to-accent/20 backdrop-blur-xl border border-gray-800 rounded-xl p-6 mb-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      <div>
                        <h3 className="text-white font-semibold text-lg">Today's Attendance</h3>
                        <p className="text-gray-400 text-sm mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p className="text-gray-300 text-2xl font-bold mt-2">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                      </div>
                      <div className="flex flex-col gap-3">
                        {todayAttendance ? (
                          <>
                            <div className="text-center mb-2">
                              <p className="text-gray-300 text-sm">
                                Check-in: {todayAttendance.checkIn?.time ? new Date(todayAttendance.checkIn.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                              </p>
                              {todayAttendance.checkOut?.time && (
                                <p className="text-gray-300 text-sm">
                                  Check-out: {new Date(todayAttendance.checkOut.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                              {todayAttendance.workHours && (
                                <p className="text-primary font-semibold mt-1">
                                  Work Hours: {formatWorkHours(todayAttendance.workHours, todayAttendance.workHoursFormatted)}
                                </p>
                              )}
                            </div>
                            
                            {/* Show Already Checked In button (disabled, grey) */}
                            <button
                              disabled
                              className="bg-gray-700 border-2 border-gray-600 text-gray-400 px-6 py-3 rounded-lg font-semibold flex items-center gap-2 justify-center cursor-not-allowed"
                            >
                              <CheckCircle className="w-5 h-5" />
                              Already Checked In
                            </button>
                            
                            {/* Show Check Out button if not checked out yet */}
                            {!todayAttendance.checkOut && (
                              <button
                                onClick={checkOut}
                                disabled={checkingOut}
                                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 justify-center"
                              >
                                <LogOut className="w-5 h-5" />
                                {checkingOut ? 'Checking Out...' : 'Check Out'}
                              </button>
                            )}
                            
                            {/* Show completed status when both check-in and check-out are done */}
                            {todayAttendance.checkOut && (
                              <div className="bg-green-600/20 border-2 border-green-500 text-green-400 px-6 py-3 rounded-lg font-semibold text-center flex items-center gap-2 justify-center">
                                <CheckCircle className="w-5 h-5" />
                                ✓ Attendance Complete
                              </div>
                            )}
                          </>
                        ) : (
                          // Show Check In button when not checked in yet
                          <button
                            onClick={checkIn}
                            disabled={checkingIn}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
                          >
                            <CheckCircle className="w-5 h-5" />
                            {checkingIn ? 'Checking In...' : 'Check In'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Attendance Logs */}
                  {attendanceView === 'daily' ? (
                    <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
                      <h3 className="text-white font-semibold mb-4">Daily Attendance Log</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="text-gray-400 border-b border-gray-800">
                            <tr>
                              <th className="pb-3">Date</th>
                              <th className="pb-3">Check In</th>
                              <th className="pb-3">Check Out</th>
                              <th className="pb-3">Work Hours</th>
                              <th className="pb-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="text-gray-300">
                            {attendance.length > 0 ? (
                              attendance.map((record, idx) => (
                                <tr key={idx} className="border-b border-gray-800">
                                  <td className="py-3">{record.date || `Day ${record.day}`}</td>
                                  <td className="py-3">{record.timeIn || record.checkIn?.time ? new Date(record.checkIn?.time || record.timeIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</td>
                                  <td className="py-3">{record.timeOut || record.checkOut?.time ? new Date(record.checkOut?.time || record.timeOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</td>
                                  <td className="py-3">{record.workHours ? formatWorkHours(record.workHours, record.workHoursFormatted) : 'N/A'}</td>
                                  <td className="py-3">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      record.status === 'present' ? 'bg-green-500/20 text-green-400' :
                                      record.status === 'late' ? 'bg-yellow-500/20 text-yellow-400' :
                                      record.status === 'absent' ? 'bg-red-500/20 text-red-400' :
                                      record.present ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                    }`}>
                                      {record.status || (record.present ? 'Present' : 'Absent')}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="5" className="py-6 text-center text-gray-400">No attendance records found</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-semibold">Monthly Calendar View</h3>
                        <div className="flex gap-2">
                          <select 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="bg-gray-800 text-white px-3 py-1 rounded border border-gray-700"
                          >
                            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                              <option key={i} value={i}>{m}</option>
                            ))}
                          </select>
                          <select 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-gray-800 text-white px-3 py-1 rounded border border-gray-700"
                          >
                            {[2023, 2024, 2025].map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} className="text-center text-gray-400 font-semibold text-sm py-2">{day}</div>
                        ))}
                        {Array.from({ length: new Date(selectedYear, selectedMonth + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
                          const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const record = attendance.find(a => a.date === dateStr);
                          return (
                            <div 
                              key={day} 
                              className={`aspect-square flex items-center justify-center rounded-lg border ${
                                record?.status === 'present' || record?.present ? 'bg-green-500/20 border-green-500/50 text-green-400' :
                                record?.status === 'late' ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' :
                                record?.status === 'absent' || (record && !record.present) ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                                'bg-gray-800 border-gray-700 text-gray-400'
                              }`}
                            >
                              {day}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 flex gap-4 text-xs text-gray-400">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-green-500/20 border border-green-500/50 rounded"></div>
                          <span>Present</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-yellow-500/20 border border-yellow-500/50 rounded"></div>
                          <span>Late</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-red-500/20 border border-red-500/50 rounded"></div>
                          <span>Absent</span>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeMenu === 'Time Off' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                  <h2 className="text-xl font-semibold text-white mb-6">Time Off</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-semibold">My Leave Requests</h3>
                        <span className="text-xs text-gray-400">{leaves.length} total requests</span>
                      </div>
                      <div className="space-y-3">
                        {leaves.map(l => (
                          <div key={l.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="text-white font-medium flex items-center gap-2">
                                  <span>{l.type}</span>
                                  <span className="text-gray-500">•</span>
                                  <span className="text-sm text-gray-400">{l.from} → {l.to}</span>
                                </div>
                                <div className="text-gray-400 text-sm mt-1">{l.reason}</div>
                                {l.comments && (
                                  <div className="text-gray-500 text-xs mt-2 italic">
                                    💬 {l.comments}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  l.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 
                                  l.status === 'Approved' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                                  'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}>
                                  {l.status}
                                </span>
                                {(l.approvedAt || l.rejectedAt) && (
                                  <span className="text-xs text-gray-500">
                                    {new Date(l.approvedAt || l.rejectedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-700/50">
                              <span className="text-xs text-gray-500">
                                📅 Submitted: {new Date(l.createdAt || Date.now()).toLocaleDateString()}
                              </span>
                              {l.duration && (
                                <span className="text-xs text-gray-500">
                                  ⏱️ {l.duration} {l.duration === 1 ? 'day' : 'days'}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {leaves.length === 0 && (
                          <div className="text-center py-8 text-gray-400">
                            <div className="text-4xl mb-2">📋</div>
                            <div>No leave requests yet.</div>
                            <div className="text-sm text-gray-500 mt-1">Submit your first request using the form →</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6"><h3 className="text-white font-semibold mb-4">Apply for Time Off</h3><form onSubmit={submitLeave} className="space-y-3"><label className="block text-sm text-gray-300">Type<select aria-label="Leave type" value={leaveForm.type} onChange={e=>setLeaveForm({...leaveForm,type:e.target.value})} className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"><option>Vacation</option><option>Sick Leave</option><option>Casual Leave</option></select></label><label className="block text-sm text-gray-300">From<input aria-label="Leave from date" value={leaveForm.from} onChange={e=>setLeaveForm({...leaveForm,from:e.target.value})} type="date" className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" /></label><label className="block text-sm text-gray-300">To<input aria-label="Leave to date" value={leaveForm.to} onChange={e=>setLeaveForm({...leaveForm,to:e.target.value})} type="date" className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" /></label><label className="block text-sm text-gray-300">Reason<textarea aria-label="Leave reason" value={leaveForm.reason} onChange={e=>setLeaveForm({...leaveForm,reason:e.target.value})} className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"></textarea></label><div className="flex items-center gap-3"><button type="submit" disabled={submittingLeave} className="px-4 py-2 bg-primary text-white rounded-lg">{submittingLeave ? 'Submitting...' : 'Submit'}</button><button type="button" onClick={()=>setLeaveForm({type:'Vacation',from:'',to:'',reason:''})} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg">Reset</button></div></form></div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Employee details panel (read-only) */}
      <AnimatePresence>
        {showEmployeePanel && selectedEmployee && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEmployeePanel(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed right-0 top-0 bottom-0 w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-50 overflow-y-auto">
              <div className="p-6 border-b border-gray-800 flex items-center justify-between"><h3 className="text-xl font-bold text-white">Employee Profile</h3><button onClick={() => setShowEmployeePanel(false)} className="p-2 hover:bg-gray-800 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button></div>
              <div className="p-6 space-y-6"><div className="text-center"><div className="w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4">{(selectedEmployee.name||'U').split(' ').map(n=>n[0]).join('').toUpperCase()}</div><h4 className="text-xl font-bold text-white">{selectedEmployee.name}</h4><p className="text-gray-400">{selectedEmployee.role || selectedEmployee.title}</p><p className="text-gray-500 text-sm mt-1">{selectedEmployee.department}</p></div><div className="space-y-3"><div className="flex items-center gap-3 text-gray-300"><Mail className="w-4 h-4 text-gray-400" /> <span className="text-sm">{selectedEmployee.email}</span></div><div className="flex items-center gap-3 text-gray-300"><Phone className="w-4 h-4 text-gray-400" /> <span className="text-sm">{selectedEmployee.phone || '—'}</span></div><div className="flex items-center gap-3 text-gray-300"><MapPin className="w-4 h-4 text-gray-400" /> <span className="text-sm">{selectedEmployee.department || '—'}</span></div><div className="flex items-center gap-3 text-gray-300"><Clock className="w-4 h-4 text-gray-400" /> <span className="text-sm">Joined: {selectedEmployee.joined || 'N/A'}</span></div></div><div><h5 className="text-sm font-semibold text-gray-400 uppercase mb-2">Recent Attendance</h5><div className="space-y-2 text-sm text-gray-300">{attendance.slice(0,5).map((a,i)=>(<div key={i} className="flex items-center justify-between border-b border-gray-800 py-2"><div>{`Day ${a.day}`}</div><div className="text-gray-400">{a.present?`${a.timeIn} - ${a.timeOut}`:'Absent'}</div></div>))}</div></div></div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DashboardEmployee;
