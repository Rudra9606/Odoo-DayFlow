/**
 * WorkZen HRMS - API Service
 * Centralized API service for all backend communication
 */

// Use relative URL to leverage Vite proxy in development
// In production, set VITE_API_URL to your backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Generic API request handler
 */
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('workzen_token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// ==================== AUTHENTICATION ====================

export const authAPI = {
  login: (credentials) => 
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (userData) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  getCurrentUser: () => apiRequest('/auth/me'),

  logout: () => {
    localStorage.removeItem('workzen_token');
    localStorage.removeItem('workzen_role');
    localStorage.removeItem('workzen_user');
  },
};

// ==================== DASHBOARD ====================

export const dashboardAPI = {
  getOverview: () => apiRequest('/dashboard/overview'),
  
  getStats: () => apiRequest('/dashboard/stats'),
  
  getRecentActivities: (limit = 10) => 
    apiRequest(`/dashboard/activities?limit=${limit}`),
  
  getAttendanceTrend: (days = 7) =>
    apiRequest(`/dashboard/attendance-trend?days=${days}`),
};

// ==================== USERS ====================

export const userAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/users${queryString ? `?${queryString}` : ''}`);
  },

  getById: (id) => apiRequest(`/users/${id}`),

  create: (userData) =>
    apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  update: (id, userData) =>
    apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),

  delete: (id) =>
    apiRequest(`/users/${id}`, {
      method: 'DELETE',
    }),

  updateRole: (id, role) =>
    apiRequest(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  toggleStatus: (id) =>
    apiRequest(`/users/${id}/toggle-status`, {
      method: 'PATCH',
    }),
};

// ==================== EMPLOYEES ====================
// Note: Employees are stored in the User model
// This API provides employee-specific endpoints for convenience

export const employeeAPI = {
  // Get all employees (users with employee data)
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    // Fetch from users endpoint since employees are users
    return apiRequest(`/users${queryString ? `?${queryString}` : ''}`);
  },

  getById: (id) => apiRequest(`/users/${id}`),

  create: (employeeData) =>
    apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    }),

  update: (id, employeeData) =>
    apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employeeData),
    }),

  delete: (id) =>
    apiRequest(`/users/${id}`, {
      method: 'DELETE',
    }),

  getByDepartment: (department) =>
    apiRequest(`/users?department=${department}`),

  search: (query) =>
    apiRequest(`/users?search=${query}`),

  getDepartmentStats: () =>
    apiRequest('/users/stats/departments'),
};

// ==================== ATTENDANCE ====================
// Note: Attendance records reference User IDs (not separate Employee IDs)

export const attendanceAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/attendance${queryString ? `?${queryString}` : ''}`);
  },

  getById: (id) => apiRequest(`/attendance/${id}`),

  checkIn: (data) =>
    apiRequest('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  checkOut: (id, data) =>
    apiRequest(`/attendance/${id}/check-out`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getByUser: (userId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/attendance/user/${userId}${queryString ? `?${queryString}` : ''}`);
  },

  getToday: () => apiRequest('/attendance/today'),

  update: (id, data) =>
    apiRequest(`/attendance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    apiRequest(`/attendance/${id}`, {
      method: 'DELETE',
    }),

  approve: (id) =>
    apiRequest(`/attendance/${id}/approve`, {
      method: 'PATCH',
    }),

  getStats: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/attendance/stats${queryString ? `?${queryString}` : ''}`);
  },

  // Admin-only functions to mark attendance for any user
  adminCheckIn: (userId, data) =>
    apiRequest(`/attendance/admin/check-in/${userId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  adminCheckOut: (userId, data) =>
    apiRequest(`/attendance/admin/check-out/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ==================== LEAVES / TIME OFF ====================

export const leaveAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/leaves${queryString ? `?${queryString}` : ''}`);
  },

  getById: (id) => apiRequest(`/leaves/${id}`),

  create: (leaveData) =>
    apiRequest('/leaves', {
      method: 'POST',
      body: JSON.stringify(leaveData),
    }),

  update: (id, leaveData) =>
    apiRequest(`/leaves/${id}`, {
      method: 'PUT',
      body: JSON.stringify(leaveData),
    }),

  delete: (id) =>
    apiRequest(`/leaves/${id}`, {
      method: 'DELETE',
    }),

  approve: (id, comments) =>
    apiRequest(`/leaves/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ comments }),
    }),

  reject: (id, reason) =>
    apiRequest(`/leaves/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  cancel: (id) =>
    apiRequest(`/leaves/${id}/cancel`, {
      method: 'PATCH',
    }),

  getPending: () => apiRequest('/leaves?status=pending'),

  getByEmployee: (employeeId) =>
    apiRequest(`/leaves/employee/${employeeId}`),

  getBalance: (employeeId) =>
    apiRequest(`/leaves/balance/${employeeId}`),

  getStats: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/leaves/stats${queryString ? `?${queryString}` : ''}`);
  },
};

// ==================== LEAVE REQUESTS (User-based) ====================
// Note: Backend uses /api/leaves endpoint (matches server.js routing)

export const leaveRequestAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/leaves${queryString ? `?${queryString}` : ''}`);
  },

  getById: (id) => apiRequest(`/leaves/${id}`),

  create: (requestData) =>
    apiRequest('/leaves', {
      method: 'POST',
      body: JSON.stringify(requestData),
    }),

  update: (id, requestData) =>
    apiRequest(`/leaves/${id}`, {
      method: 'PUT',
      body: JSON.stringify(requestData),
    }),

  delete: (id) =>
    apiRequest(`/leaves/${id}`, {
      method: 'DELETE',
    }),

  approve: (id, comments) =>
    apiRequest(`/leaves/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ comments, status: 'Approved' }),
    }),

  reject: (id, comments) =>
    apiRequest(`/leaves/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ comments, status: 'Rejected' }),
    }),

  getPending: () => apiRequest('/leaves?status=Pending'),

  getMyRequests: () => apiRequest('/leaves/my'),
};

// ==================== PAYROLL ====================

export const payrollAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/payroll${queryString ? `?${queryString}` : ''}`);
  },

  getById: (id) => apiRequest(`/payroll/${id}`),

  create: (payrollData) =>
    apiRequest('/payroll', {
      method: 'POST',
      body: JSON.stringify(payrollData),
    }),

  update: (id, payrollData) =>
    apiRequest(`/payroll/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payrollData),
    }),

  delete: (id) =>
    apiRequest(`/payroll/${id}`, {
      method: 'DELETE',
    }),

  process: (id) =>
    apiRequest(`/payroll/${id}/process`, {
      method: 'POST',
    }),

  approve: (id) =>
    apiRequest(`/payroll/${id}/approve`, {
      method: 'PATCH',
    }),

  getByEmployee: (employeeId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/payroll/employee/${employeeId}${queryString ? `?${queryString}` : ''}`);
  },

  generatePayslip: (id) =>
    apiRequest(`/payroll/${id}/payslip`, {
      method: 'GET',
    }),

  bulkProcess: (payrollIds) =>
    apiRequest('/payroll/bulk-process', {
      method: 'POST',
      body: JSON.stringify({ payrollIds }),
    }),

  getStats: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/payroll/stats${queryString ? `?${queryString}` : ''}`);
  },
};

// ==================== REPORTS ====================

export const reportAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/reports${queryString ? `?${queryString}` : ''}`);
  },

  getById: (id) => apiRequest(`/reports/${id}`),

  create: (reportData) =>
    apiRequest('/reports', {
      method: 'POST',
      body: JSON.stringify(reportData),
    }),

  delete: (id) =>
    apiRequest(`/reports/${id}`, {
      method: 'DELETE',
    }),

  generate: (type, filters) =>
    apiRequest('/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ type, filters }),
    }),

  export: (id, format = 'pdf') =>
    apiRequest(`/reports/${id}/export?format=${format}`),

  getAttendanceReport: (filters) =>
    apiRequest('/reports/attendance', {
      method: 'POST',
      body: JSON.stringify(filters),
    }),

  getLeaveReport: (filters) =>
    apiRequest('/reports/leave', {
      method: 'POST',
      body: JSON.stringify(filters),
    }),

  getPayrollReport: (filters) =>
    apiRequest('/reports/payroll', {
      method: 'POST',
      body: JSON.stringify(filters),
    }),

  getEmployeeReport: (filters) =>
    apiRequest('/reports/employee', {
      method: 'POST',
      body: JSON.stringify(filters),
    }),
};

// ==================== SETTINGS ====================

export const settingsAPI = {
  getAll: () => apiRequest('/settings'),

  update: (settings) =>
    apiRequest('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  getRoles: () => apiRequest('/settings/roles'),

  getDepartments: () => apiRequest('/settings/departments'),

  getLeaveTypes: () => apiRequest('/settings/leave-types'),

  updateLeavePolicy: (policy) =>
    apiRequest('/settings/leave-policy', {
      method: 'PUT',
      body: JSON.stringify(policy),
    }),

  updateAttendancePolicy: (policy) =>
    apiRequest('/settings/attendance-policy', {
      method: 'PUT',
      body: JSON.stringify(policy),
    }),
};

// Export all APIs as a single object
export default {
  auth: authAPI,
  dashboard: dashboardAPI,
  users: userAPI,
  employees: employeeAPI,
  attendance: attendanceAPI,
  leaves: leaveAPI,
  leaveRequests: leaveRequestAPI,
  payroll: payrollAPI,
  reports: reportAPI,
  settings: settingsAPI,
};
