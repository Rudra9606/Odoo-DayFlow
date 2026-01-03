const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Import routes
const usersRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./controllers/attendanceController');
const payrollRoutes = require('./controllers/payrollController');
const leaveRoutes = require('./controllers/leaveController');

// API Routes
app.use('/api/users', usersRoutes);
app.use('/api/auth', authRoutes);

// Direct controller routes for simplicity
app.get('/api/attendance', attendanceRoutes.getAttendance);
app.post('/api/attendance', attendanceRoutes.markAttendance);

app.get('/api/payroll', payrollRoutes.getPayroll);
app.post('/api/payroll/process', payrollRoutes.processPayroll);

app.get('/api/leaves', leaveRoutes.getLeaves);
app.post('/api/leaves', leaveRoutes.applyLeave);
app.put('/api/leaves/:id/approve', leaveRoutes.approveLeave);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'WorkZen HRMS API is running',
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'WorkZen HRMS API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth (login, register, users)',
      users: '/api/users',
      attendance: '/api/attendance',
      payroll: '/api/payroll',
      leaves: '/api/leaves',
      health: '/api/health'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 WorkZen HRMS Backend server is running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
