/**
 * WorkZen HRMS - Payroll Officer Dashboard
 * Single-file dashboard for Payroll Officer role matching Admin UI
 * 
 * FEATURES:
 * - Sidebar navigation: Payroll, Time Off, Attendance, Reports (NO Settings/Employee CRUD)
 * - Topbar: Search, NEW button, Avatar dropdown (portal-based, no clipping)
 * - Payroll panel: employee payroll table, Generate Payroll, View Payslip modal, Chart.js distribution
 * - Time Off panel: pending leave approvals with Approve/Reject actions, filter by status
 * - Attendance panel: attendance summary with Chart.js bar chart by department, Export CSV
 * - Reports panel: report type dropdown, Generate Report, preview, Export PDF/CSV
 * 
 * BUSINESS RULES (Payroll Officer Permissions):
 * ✅ CAN: Approve/reject time-off requests, generate payslips & reports, access attendance for payroll, manage payroll/time off/reports
 * ❌ CANNOT: Create/modify employee profiles, access system settings, view admin-only reports
 * 
 * API ENDPOINTS USED:
 * - GET /api/payroll → fetch all payrolls
 * - POST /api/payroll/process → trigger new payrun
 * - GET /api/leaves → fetch leave requests
 * - PUT /api/leaves/:id/approve → approve leave
 * - PUT /api/leaves/:id/reject → reject leave
 * - GET /api/attendance → fetch attendance records
 * 
 * TODO (Backend):
 * - Add role-based auth middleware verifying 'Payroll Officer' permissions
 * - Add audit logging for payroll processing and leave approvals
 * - Add rate limiting on payroll process endpoint
 * - Add PDF generation for payslips and reports (use jsPDF or server-side)
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { 
  DollarSign, Plane, Clock, FileText, Search, ChevronDown,
  User as UserIcon, LogOut, Check, X, Filter, Download,
  PlayCircle, TrendingUp, Users, Calendar, AlertCircle,
  Eye, Save, FileDown, BarChart3, IndianRupee
} from 'lucide-react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, 
  PointElement, LineElement, Title, Tooltip, Legend 
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import PayslipModal from '../components/PayslipModal';
import NewPayslipModal from '../components/NewPayslipModal';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

function DashboardPayrollOfficer() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  // Navigation & UI state
  const [activeMenu, setActiveMenu] = useState('Payroll');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const avatarBtnRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  
  // Payroll state
  const [payrolls, setPayrolls] = useState([]);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [showNewPayslipModal, setShowNewPayslipModal] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [processingPayroll, setProcessingPayroll] = useState(false);
  const [payrollChart, setPayrollChart] = useState(null);
  
  // Dashboard stats
  const [stats, setStats] = useState({
    totalEmployees: 0,
    payruns: 0,
    pendingLeaves: 0,
    currentMonthPayroll: 0
  });
  
  // Time Off state
  const [leaves, setLeaves] = useState([]);
  const [leaveFilter, setLeaveFilter] = useState('pending'); // pending / approved / rejected / all
  const [processingLeave, setProcessingLeave] = useState(null);
  
  // Attendance state
  const [attendance, setAttendance] = useState([]);
  const [attendanceChart, setAttendanceChart] = useState(null);
  
  // Reports state
  const [reportType, setReportType] = useState('payroll-summary');
  const [reports, setReports] = useState([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  
  // Toast notifications
  const [toast, setToast] = useState(null);

  // Helper: Update dropdown position (portal fix for avatar dropdown)
  const updateDropdownPosition = () => {
    if (avatarBtnRef.current && showProfileDropdown) {
      const rect = avatarBtnRef.current.getBoundingClientRect();
      const dropdownWidth = 180;
      const dropdownHeight = 120;
      
      let top = rect.bottom + 8;
      let left = rect.right - dropdownWidth;
      
      // Clamp to viewport
      const maxTop = window.innerHeight - dropdownHeight - 16;
      const maxLeft = window.innerWidth - dropdownWidth - 16;
      
      if (top > maxTop) top = rect.top - dropdownHeight - 8;
      if (left > maxLeft) left = maxLeft;
      if (left < 16) left = 16;
      
      setDropdownPos({ top, left });
    }
  };

  // Update dropdown position on resize/scroll/orientation change
  useEffect(() => {
    if (showProfileDropdown) {
      updateDropdownPosition();
      
      let rafId;
      const handleUpdate = () => {
        rafId = requestAnimationFrame(updateDropdownPosition);
      };
      
      window.addEventListener('resize', handleUpdate);
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('orientationchange', handleUpdate);
      
      return () => {
        window.removeEventListener('resize', handleUpdate);
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('orientationchange', handleUpdate);
        if (rafId) cancelAnimationFrame(rafId);
      };
    }
  }, [showProfileDropdown]);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('workzen_token');
    const role = localStorage.getItem('workzen_role');
    const userData = localStorage.getItem('workzen_user');

    if (!token || role !== 'Payroll Officer') {
      navigate('/login');
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    // Fetch initial data
    fetchStats();
    fetchPayrolls();
    fetchLeaves();
    fetchAttendance();
  }, [navigate]);

  // Fetch dashboard statistics
  const fetchStats = async () => {
    try {
      console.log('📊 Fetching payroll dashboard stats...');
      const response = await fetch('http://localhost:5000/api/payroll/stats');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Payroll stats loaded:', data.stats);
      
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
      showToast('Failed to load dashboard statistics', 'error');
    }
  };

  // Fetch payrolls from API
  const fetchPayrolls = async () => {
    try {
      console.log('💰 Fetching payrolls from API...');
      const response = await fetch('http://localhost:5000/api/payroll');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch payrolls: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Payrolls API response:', data);
      console.log('📊 Number of payrolls:', data.payrolls?.length || 0);
      
      if (data.success && data.payrolls && data.payrolls.length > 0) {
        // Format payrolls for display
        console.log('🔄 Formatting payrolls for display...');
        const formattedPayrolls = data.payrolls.map(p => ({
          id: p._id,
          employeeId: p.employee?._id || p.employee,
          name: p.employee?.name || `${p.employee?.firstName || ''} ${p.employee?.lastName || ''}`.trim() || 'Unknown',
          department: p.employee?.department || 'N/A',
          role: p.employee?.role || p.role || 'Employee', // Store role for filtering
          baseSalary: p.basicSalary || 0,
          grossEarnings: p.grossEarnings || 0,
          deductions: (p.deductions?.tax?.incomeTax || 0) + 
                      (p.deductions?.tax?.professionalTax || 0) + 
                      (p.deductions?.providentFund?.employee || 0) +
                      (p.deductions?.insurance || 0) +
                      (p.deductions?.loanRepayment || 0) +
                      (p.deductions?.other || 0),
          netPay: p.netPay || 0,
          status: p.paymentStatus || p.status || 'pending',
          payDate: p.payDate,
          payPeriod: p.payPeriod,
          fullData: p // Store full payroll data for payslip modal
        }));
        
        console.log('✅ Formatted payrolls:', formattedPayrolls);
        console.log(`📋 Displaying ${formattedPayrolls.length} payroll records`);
        setPayrolls(formattedPayrolls);
        buildPayrollChart(formattedPayrolls);
      } else {
        console.warn('⚠️ No payroll records in response');
        setPayrolls([]);
        showToast('No payroll records found', 'info');
      }
    } catch (error) {
      console.error('❌ Error fetching payrolls:', error);
      showToast('Failed to load payroll data', 'error');
      setPayrolls([]);
    }
  };

  // Build payroll distribution chart
  const buildPayrollChart = (payrollData) => {
    const deptTotals = {};
    payrollData.forEach(p => {
      if (!deptTotals[p.department]) deptTotals[p.department] = 0;
      deptTotals[p.department] += p.netPay;
    });
    
    const chartData = {
      labels: Object.keys(deptTotals),
      datasets: [{
        label: 'Total Payroll by Department (₹)',
        data: Object.values(deptTotals),
        backgroundColor: 'rgba(0, 94, 184, 0.7)',
        borderColor: '#005eb8',
        borderWidth: 2,
        borderRadius: 8,
      }],
    };
    
    setPayrollChart(chartData);
  };

  // Process payroll
  const processPayroll = async () => {
    setProcessingPayroll(true);
    
    try {
      // TODO: Replace with real API call
      // await fetch('/api/payroll/process', { 
      //   method: 'POST', 
      //   headers: { 'Authorization': `Bearer ${localStorage.getItem('workzen_token')}` } 
      // });
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      showToast('Payroll processed successfully!', 'success');
      fetchPayrolls(); // Refresh data
    } catch (error) {
      console.error('Error processing payroll:', error);
      showToast('Failed to process payroll', 'error');
    } finally {
      setProcessingPayroll(false);
    }
  };

  // View payslip
  const viewPayslip = (payroll) => {
    setSelectedPayslip(payroll);
    setShowPayslipModal(true);
  };

  // Fetch leaves
  const fetchLeaves = async () => {
    try {
      console.log('📋 Payroll - Fetching leaves from API');
      
      const response = await fetch('/api/leaves');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch leaves: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Payroll - Fetched leaves:', data);
      
      // Handle both response formats
      const leavesList = data.leaves || data.data || [];
      
      // Format leaves to match expected structure
      const formattedLeaves = leavesList.map(l => ({
        id: l._id || l.id,
        employeeName: l.userId?.name || l.employee?.firstName + ' ' + l.employee?.lastName || 'Unknown',
        email: l.email || l.userEmail || l.userId?.email || l.employee?.email,
        type: l.type || l.leaveType,
        startDate: l.from || l.startDate,
        endDate: l.to || l.endDate,
        days: l.duration || Math.ceil((new Date(l.to || l.endDate) - new Date(l.from || l.startDate)) / (1000*60*60*24)) + 1,
        status: l.status?.toLowerCase() || 'pending',
        reason: l.reason,
        createdAt: l.createdAt,
        comments: l.comments
      }));
      
      setLeaves(formattedLeaves);
    } catch (error) {
      console.error('❌ Error fetching leaves:', error);
      showToast(error.message || 'Failed to load leave requests', 'error');
      
      // Fallback to empty array instead of mock data to avoid confusion
      setLeaves([]);
    }
  };

  // Approve leave
  const approveLeave = async (leaveId) => {
    if (!confirm('Approve this leave request?')) return;
    
    setProcessingLeave(leaveId);
    
    try {
      console.log('✅ Payroll - Approving leave:', leaveId);
      
      // Get current user ID from localStorage
      let approverId = null;
      const storedUser = localStorage.getItem('workzen_user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        approverId = parsedUser._id || parsedUser.id;
      }
      
      if (!approverId) {
        throw new Error('User not authenticated. Please log in again.');
      }
      
      const res = await fetch(`/api/leaves/${leaveId}`, { 
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('workzen_token')}` 
        },
        body: JSON.stringify({ 
          status: 'Approved',
          approverId: approverId
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Server returned ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log('✅ Payroll - Leave approved:', data);
      
      // Re-fetch leaves to get updated data
      await fetchLeaves();
      showToast('Leave request approved', 'success');
    } catch (error) {
      console.error('❌ Error approving leave:', error);
      showToast(error.message || 'Failed to approve leave', 'error');
    } finally {
      setProcessingLeave(null);
    }
  };

  // Reject leave
  const rejectLeave = async (leaveId) => {
    const reason = prompt('Reject this leave request? Enter reason (optional):');
    if (reason === null) return; // User cancelled
    
    setProcessingLeave(leaveId);
    
    try {
      console.log('❌ Payroll - Rejecting leave:', leaveId);
      
      // Get current user ID from localStorage
      let approverId = null;
      const storedUser = localStorage.getItem('workzen_user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        approverId = parsedUser._id || parsedUser.id;
      }
      
      if (!approverId) {
        throw new Error('User not authenticated. Please log in again.');
      }
      
      const res = await fetch(`/api/leaves/${leaveId}`, { 
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('workzen_token')}` 
        },
        body: JSON.stringify({ 
          status: 'Rejected',
          approverId: approverId,
          comments: reason || 'No reason provided'
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Server returned ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log('❌ Payroll - Leave rejected:', data);
      
      // Re-fetch leaves to get updated data
      await fetchLeaves();
      showToast('Leave request rejected', 'success');
    } catch (error) {
      console.error('❌ Error rejecting leave:', error);
      showToast(error.message || 'Failed to reject leave', 'error');
    } finally {
      setProcessingLeave(null);
    }
  };

  // Fetch attendance
  const fetchAttendance = async () => {
    try {
      console.log('📊 Fetching attendance data from API...');
      const response = await fetch('http://localhost:5000/api/attendance/stats/by-department', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('workzen_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch attendance: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Attendance API response:', result);

      if (result.success && result.data) {
        const attendanceData = result.data;
        console.log('📊 Attendance by department:', attendanceData);
        
        setAttendance(attendanceData);
        buildAttendanceChart(attendanceData);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('❌ Error fetching attendance:', error);
      showToast('Failed to load attendance data', 'error');
      
      // Fallback to empty data
      setAttendance([]);
    }
  };

  // Build attendance chart
  const buildAttendanceChart = (attendanceData) => {
    const chartData = {
      labels: attendanceData.map(a => a.department),
      datasets: [{
        label: 'Attendance %',
        data: attendanceData.map(a => a.percentage),
        backgroundColor: 'rgba(34, 197, 94, 0.7)',
        borderColor: '#22c55e',
        borderWidth: 2,
        borderRadius: 8,
      }],
    };
    
    setAttendanceChart(chartData);
  };

  // Generate report
  const generateReport = async () => {
    setGeneratingReport(true);
    
    try {
      // TODO: Replace with real API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newReport = {
        id: reports.length + 1,
        type: reportType,
        title: reportType === 'payroll-summary' ? 'Payroll Summary Report' : 'Leave Report',
        date: new Date().toLocaleString(),
        status: 'Ready',
      };
      
      setReports(prev => [newReport, ...prev]);
      showToast('Report generated successfully', 'success');
    } catch (error) {
      console.error('Error generating report:', error);
      showToast('Failed to generate report', 'error');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('workzen_token');
    localStorage.removeItem('workzen_role');
    localStorage.removeItem('workzen_user');
    navigate('/login');
  };

  // Toast notification
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Export report as PDF
  const handleExportPDF = (report) => {
    if (!report) {
      showToast('Report data not available', 'error');
      return;
    }

    const WindowPrint = window.open('', '', 'width=900,height=650');
    
    WindowPrint.document.write(`
      <html>
        <head>
          <title>${report.title || 'Report'} - WorkZen HRMS</title>
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
            .status-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
            .status-ready { background: #d1fae5; color: #065f46; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd; font-size: 11px; color: #666; text-align: center; }
            @media print { 
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="report-container">
            <div class="header">
              <div class="company-logo">WorkZen HRMS</div>
              <div class="report-title">${report.title || 'Report'}</div>
            </div>

            <div class="report-info">
              <div class="info-item">
                <div class="info-label">Report Type:</div>
                <div class="info-value">${report.type || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Generated On:</div>
                <div class="info-value">${report.date || new Date().toLocaleString()}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Status:</div>
                <div class="info-value">
                  <span class="status-badge status-ready">${report.status || 'Ready'}</span>
                </div>
              </div>
              <div class="info-item">
                <div class="info-label">Report ID:</div>
                <div class="info-value">${report.id || 'N/A'}</div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Report Summary</div>
              <div style="padding: 15px; background: #f9fafb; border-radius: 5px;">
                <p style="font-size: 14px; line-height: 1.8;">
                  This ${report.title || 'report'} contains comprehensive data analysis for the selected period. 
                  The information presented below has been generated from the WorkZen HRMS database 
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
                    <td>${report.id || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Report Title</td>
                    <td>${report.title || 'Unnamed Report'}</td>
                  </tr>
                  <tr>
                    <td>Report Type</td>
                    <td>${report.type || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Status</td>
                    <td>${report.status || 'Ready'}</td>
                  </tr>
                  <tr>
                    <td>Generated On</td>
                    <td>${report.date || new Date().toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="footer">
              <p><strong>WorkZen HRMS</strong> - Human Resource Management System</p>
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
      showToast('Report PDF opened for printing', 'success');
    }, 250);
  };

  // Export report as CSV
  const handleExportCSV = (report) => {
    if (!report) {
      showToast('Report data not available', 'error');
      return;
    }

    // Create CSV content
    const csvRows = [];
    
    // Add header
    csvRows.push('WorkZen HRMS - Report Export');
    csvRows.push('');
    csvRows.push(`Report Title,${report.title || 'Unnamed Report'}`);
    csvRows.push(`Report Type,${report.type || 'N/A'}`);
    csvRows.push(`Generated On,${report.date || new Date().toLocaleString()}`);
    csvRows.push(`Status,${report.status || 'Ready'}`);
    csvRows.push(`Report ID,${report.id || 'N/A'}`);
    csvRows.push('');
    csvRows.push('This report was generated from WorkZen HRMS');
    
    const csvContent = csvRows.join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${report.title || 'report'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('CSV file downloaded successfully', 'success');
  };

  // Filtered employees for search
  const filteredPayrolls = payrolls.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filtered leaves
  const filteredLeaves = leaves.filter(l =>
    leaveFilter === 'all' ? true : l.status === leaveFilter
  );

  // Use stats from API (fallback to calculated values if stats not loaded)
  const totalEmployees = payrolls.filter(p => p.role === 'Employee').length || stats.totalEmployees || 0;
  const activeToday = payrolls.filter(p => (p.role === 'Employee') && (p.isActive !== false && p.status !== 'inactive')).length;
  const payrunsCompleted = stats.payruns || payrolls.filter(p => p.status === 'processed' || p.status === 'paid').length;
  const pendingLeaveApprovals = stats.pendingLeaves || leaves.filter(l => l.status === 'pending').length;
  const currentMonthPayroll = stats.currentMonthPayroll || payrolls.reduce((sum, p) => sum + p.netPay, 0);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: '',
        color: '#fff',
        font: { size: 14 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
      },
      x: {
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
      },
    },
  };

  // Menu items (restricted to Payroll Officer features only)
  const menuItems = [
    { name: 'Payroll', icon: DollarSign },
    { name: 'Time Off', icon: Plane },
    { name: 'Attendance', icon: Clock },
    { name: 'Reports', icon: FileText },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }


  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* LEFT SIDEBAR - Matching Admin Dashboard */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="relative z-10 w-64 bg-gray-900/50 backdrop-blur-xl border-r border-gray-800 flex flex-col"
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-800 flex items-center gap-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            WorkZen
          </h1>
          <p className="text-sm text-gray-400">Payroll Officer</p>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.name;
            
            return (
              <motion.button
                key={item.name}
                onClick={() => setActiveMenu(item.name)}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </motion.button>
            );
          })}
        </nav>

        {/* User Info at Bottom */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2 bg-gray-800/50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
              {(user.name || user.firstName + ' ' + user.lastName || 'P').charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name || user.firstName + ' ' + user.lastName || 'Payroll Officer'}</p>
              <p className="text-xs text-gray-400 truncate">Payroll Officer</p>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOPBAR - Matching Admin Dashboard */}
        <motion.header
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="relative z-20 bg-gray-900/50 backdrop-blur-xl border-b border-gray-800"
        >
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employees, departments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* NEW Button (New Payslip CTA) */}
            <motion.button
              onClick={() => setShowNewPayslipModal(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 bg-primary hover:bg-blue-600 text-white shadow-lg shadow-primary/30"
            >
              <PlayCircle className="w-5 h-5" />
              New Payslip
            </motion.button>
            
            {/* Generate Payroll Button */}
            <motion.button
              onClick={processPayroll}
              disabled={processingPayroll}
              whileHover={{ scale: processingPayroll ? 1 : 1.05 }}
              whileTap={{ scale: processingPayroll ? 1 : 0.95 }}
              className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                processingPayroll
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/30'
              }`}
            >
              {processingPayroll ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <BarChart3 className="w-5 h-5" />
                  Generate Payroll
                </>
              )}
            </motion.button>

            {/* Avatar Dropdown */}
            <div className="relative">
              <motion.button
                ref={avatarBtnRef}
                onClick={() => {
                  setShowProfileDropdown(!showProfileDropdown);
                  if (!showProfileDropdown) updateDropdownPosition();
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold border-2 border-gray-700 hover:border-primary transition-all"
              >
                {user.name?.charAt(0) || (user.firstName + user.lastName).charAt(0) || 'P'}
              </motion.button>
            </div>
          </div>
        </motion.header>

        {/* DASHBOARD CONTENT */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Currently Logged In User Card */}
          {user && (
            <div className="mb-8 bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold text-2xl">
                    {(user.firstName || user.name || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest">Currently Logged In</p>
                    <h3 className="text-xl font-bold text-white">
                      {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold">
                        {user.role || 'Payroll Officer'}
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

          {/* KPI Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0, 94, 184, 0.2)' }}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-6"
            >
              <Users className="w-8 h-8 text-primary mb-3" />
              <p className="text-gray-400 text-sm mb-1">Total Employees</p>
              <p className="text-3xl font-bold text-white">{totalEmployees}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(34, 197, 94, 0.2)' }}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-6"
            >
              <Check className="w-8 h-8 text-green-400 mb-3" />
              <p className="text-gray-400 text-sm mb-1">Payslips Generated</p>
              <p className="text-3xl font-bold text-white">{payrunsCompleted}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(242, 199, 68, 0.2)' }}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-6"
            >
              <AlertCircle className="w-8 h-8 text-accent mb-3" />
              <p className="text-gray-400 text-sm mb-1">Pending Leave Approvals</p>
              <p className="text-3xl font-bold text-white">{pendingLeaveApprovals}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0, 94, 184, 0.2)' }}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-6"
            >
              <IndianRupee className="w-8 h-8 text-primary mb-3" />
              <p className="text-gray-400 text-sm mb-1">Current Month Payroll</p>
              <p className="text-3xl font-bold text-white">₹{(currentMonthPayroll / 1000).toFixed(1)}K</p>
            </motion.div>
          </div>

          {/* TABBED CONTENT PANELS */}
          <AnimatePresence mode="wait">
            {/* PAYROLL PANEL */}
            {activeMenu === 'Payroll' && (
              <motion.div
                key="payroll"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Payroll Distribution Chart */}
                {payrollChart && (
                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <BarChart3 className="w-6 h-6 text-primary" />
                      Payroll Distribution by Department
                    </h3>
                    <div className="h-80">
                      <Bar data={payrollChart} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { ...chartOptions.plugins.title, text: 'Total Payroll by Department' } } }} />
                    </div>
                  </div>
                )}

                {/* Employee Payroll Table */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-green-400" />
                    Employee Payroll
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Name</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Department</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Base Salary</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Deductions</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Net Pay</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-400">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPayrolls.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-12 text-center">
                              <div className="flex flex-col items-center gap-3">
                                <DollarSign className="w-16 h-16 text-gray-600" />
                                <p className="text-gray-400 text-lg">No payroll records found</p>
                                <p className="text-gray-500 text-sm">Click "New Payslip" to create employee payslips</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredPayrolls.map((payroll, index) => (
                            <motion.tr
                              key={payroll.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: index * 0.05 }}
                              className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                            >
                              <td className="py-3 px-4 text-white font-medium">{payroll.name}</td>
                              <td className="py-3 px-4 text-gray-400">{payroll.department}</td>
                              <td className="py-3 px-4 text-right text-white">₹{payroll.baseSalary.toLocaleString()}</td>
                              <td className="py-3 px-4 text-right text-red-400">₹{payroll.deductions.toLocaleString()}</td>
                              <td className="py-3 px-4 text-right text-green-400 font-semibold">₹{payroll.netPay.toLocaleString()}</td>
                              <td className="py-3 px-4 text-center">
                                <motion.button
                                  onClick={() => viewPayslip(payroll)}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="px-3 py-1.5 bg-primary hover:bg-blue-600 text-white text-sm rounded-lg transition-all inline-flex items-center gap-1"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Payslip
                                </motion.button>
                              </td>
                            </motion.tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TIME OFF PANEL */}
            {activeMenu === 'Time Off' && (
              <motion.div
                key="timeoff"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Filter */}
                <div className="flex items-center gap-4">
                  <Filter className="w-5 h-5 text-gray-400" />
                  <select
                    value={leaveFilter}
                    onChange={(e) => setLeaveFilter(e.target.value)}
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="all">All Requests</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {/* Pending Leave Requests */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Plane className="w-6 h-6 text-accent" />
                    Leave Requests
                  </h3>

                  <div className="space-y-4">
                    {filteredLeaves.map((leave, index) => (
                      <motion.div
                        key={leave.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-white font-semibold">{leave.employeeName}</h4>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  leave.status === 'approved'
                                    ? 'bg-green-500/20 text-green-400'
                                    : leave.status === 'rejected'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                                }`}
                              >
                                {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                              </span>
                            </div>
                            <p className="text-gray-400 text-sm">{leave.type}</p>
                            <p className="text-gray-500 text-sm mt-1">
                              {leave.startDate} to {leave.endDate} ({leave.days} {leave.days === 1 ? 'day' : 'days'})
                            </p>
                            {leave.reason && (
                              <p className="text-gray-500 text-sm mt-2 italic">Reason: {leave.reason}</p>
                            )}
                          </div>

                          {leave.status === 'pending' && (
                            <div className="flex gap-2">
                              <motion.button
                                onClick={() => approveLeave(leave.id)}
                                disabled={processingLeave === leave.id}
                                whileHover={{ scale: processingLeave === leave.id ? 1 : 1.05 }}
                                whileTap={{ scale: processingLeave === leave.id ? 1 : 0.95 }}
                                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                                  processingLeave === leave.id
                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : 'bg-green-500 hover:bg-green-600 text-white'
                                }`}
                              >
                                <Check className="w-4 h-4" />
                                Approve
                              </motion.button>
                              <motion.button
                                onClick={() => rejectLeave(leave.id)}
                                disabled={processingLeave === leave.id}
                                whileHover={{ scale: processingLeave === leave.id ? 1 : 1.05 }}
                                whileTap={{ scale: processingLeave === leave.id ? 1 : 0.95 }}
                                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                                  processingLeave === leave.id
                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : 'bg-red-500 hover:bg-red-600 text-white'
                                }`}
                              >
                                <X className="w-4 h-4" />
                                Reject
                              </motion.button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}

                    {filteredLeaves.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        No {leaveFilter === 'all' ? '' : leaveFilter} leave requests found
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ATTENDANCE PANEL */}
            {activeMenu === 'Attendance' && (
              <motion.div
                key="attendance"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Attendance Chart */}
                {attendanceChart && (
                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Clock className="w-6 h-6 text-green-400" />
                        Attendance by Department
                      </h3>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export CSV
                      </motion.button>
                    </div>
                    <div className="h-80">
                      <Bar data={attendanceChart} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { ...chartOptions.plugins.title, text: 'Department-wise Attendance %' } } }} />
                    </div>
                  </div>
                )}

                {/* Attendance Summary Table */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Attendance Summary</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Department</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-400">Present</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-400">Total</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Attendance %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.length > 0 ? (
                          attendance.map((dept, index) => (
                            <motion.tr
                              key={index}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: index * 0.05 }}
                              className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                            >
                              <td className="py-3 px-4 text-white font-medium">{dept.department}</td>
                              <td className="py-3 px-4 text-center text-green-400">{dept.present}</td>
                              <td className="py-3 px-4 text-center text-gray-400">{dept.total}</td>
                              <td className="py-3 px-4 text-right text-white font-semibold">{dept.percentage}%</td>
                            </motion.tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="py-8 text-center text-gray-400">
                              No attendance data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* REPORTS PANEL */}
            {activeMenu === 'Reports' && (
              <motion.div
                key="reports"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Generate Report */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-primary" />
                    Generate Report
                  </h3>

                  <div className="flex flex-col md:flex-row items-end gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-400 mb-2">Report Type</label>
                      <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      >
                        <option value="payroll-summary">Payroll Summary</option>
                        <option value="leave-report">Leave Report</option>
                      </select>
                    </div>

                    <motion.button
                      onClick={generateReport}
                      disabled={generatingReport}
                      whileHover={{ scale: generatingReport ? 1 : 1.05 }}
                      whileTap={{ scale: generatingReport ? 1 : 0.95 }}
                      className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                        generatingReport
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-primary hover:bg-blue-600 text-white'
                      }`}
                    >
                      {generatingReport ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="w-5 h-5" />
                          Generate Report
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>

                {/* Report History */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Recent Reports</h3>

                  <div className="space-y-4">
                    {reports.map((report, index) => (
                      <motion.div
                        key={report.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex items-center justify-between"
                      >
                        <div>
                          <h4 className="text-white font-semibold">{report.title}</h4>
                          <p className="text-gray-400 text-sm mt-1">{report.date}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                            {report.status}
                          </span>
                          <motion.button
                            onClick={() => handleExportPDF(report)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-3 py-1.5 bg-primary hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-1"
                          >
                            <FileDown className="w-4 h-4" />
                            Export PDF
                          </motion.button>
                          <motion.button
                            onClick={() => handleExportCSV(report)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            CSV
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}

                    {reports.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        No reports generated yet. Generate your first report above.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* PAYSLIP MODAL - View Payslip */}
      <PayslipModal
        show={showPayslipModal}
        payslip={selectedPayslip}
        onClose={() => setShowPayslipModal(false)}
      />

      {/* NEW PAYSLIP MODAL - Create New Payslip */}
      <NewPayslipModal
        show={showNewPayslipModal}
        onClose={() => setShowNewPayslipModal(false)}
        onSubmit={(newPayslip) => {
          // Show success notification
          showToast('Payslip created successfully!', 'success');
          
          // Close the modal
          setShowNewPayslipModal(false);
          
          // Add the newly created payslip to the list
          setPayrolls(prev => [newPayslip, ...prev]);
          
          // Refresh stats
          fetchStats();
          
          // Refresh payroll list to get latest data
          fetchPayrolls();
        }}
      />

      {/* PROFILE DROPDOWN (PORTAL) */}
      {showProfileDropdown && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{ position: 'fixed', top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px`, zIndex: 9999 }}
            className="w-48 bg-gray-900 border border-gray-800 rounded-lg shadow-2xl overflow-hidden"
          >
            <motion.button
              onClick={() => {
                setShowProfileDropdown(false);
                navigate('/profile');
              }}
              whileHover={{ backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
              className="w-full px-4 py-3 text-left text-white hover:bg-gray-800/50 transition-all flex items-center gap-3"
            >
              <UserIcon className="w-4 h-4" />
              <span>Profile</span>
            </motion.button>
            <div className="border-t border-gray-800"></div>
            <motion.button
              onClick={() => {
                setShowProfileDropdown(false);
                handleLogout();
              }}
              whileHover={{ backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
              className="w-full px-4 py-3 text-left text-red-400 hover:bg-gray-800/50 transition-all flex items-center gap-3"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </motion.button>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <div
              className={`px-6 py-4 rounded-lg shadow-2xl border flex items-center gap-3 ${
                toast.type === 'success'
                  ? 'bg-green-500 border-green-400 text-white'
                  : toast.type === 'error'
                  ? 'bg-red-500 border-red-400 text-white'
                  : 'bg-gray-800 border-gray-700 text-white'
              }`}
            >
              {toast.type === 'success' && <Check className="w-5 h-5" />}
              {toast.type === 'error' && <X className="w-5 h-5" />}
              <span className="font-medium">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DashboardPayrollOfficer;
