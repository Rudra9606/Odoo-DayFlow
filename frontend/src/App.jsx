import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import About from './pages/About';
import Pricing from './pages/Pricing';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import DashboardEmployee from './pages/DashboardEmployee';
import DashboardHROfficer from './pages/DashboardHROfficer';
import DashboardPayrollOfficer from './pages/DashboardPayrollOfficer';
import DashboardAdmin from './pages/DashboardAdmin';
import Profile from './pages/Profile';

/**
 * PrivateRoute - Protects routes based on authentication and role
 * Checks localStorage for token and role before allowing access
 */
function PrivateRoute({ children, allowedRole }) {
  const token = localStorage.getItem('dayflow_token');
  const role = localStorage.getItem('dayflow_role');

  if (!token) {
    // Not logged in, redirect to login
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    // Wrong role, redirect to appropriate dashboard
    switch (role) {
      case 'Employee':
        return <Navigate to="/dashboard/employee" replace />;
      case 'HR Officer':
        return <Navigate to="/dashboard/hr" replace />;
      case 'Payroll Officer':
        return <Navigate to="/dashboard/payroll" replace />;
      case 'Admin':
        return <Navigate to="/dashboard/admin" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Profile Page (Protected) */}
        <Route 
          path="/profile" 
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } 
        />
        
        {/* Legacy Dashboard (kept for backwards compatibility) */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Role-Based Protected Dashboards */}
        <Route 
          path="/dashboard/admin" 
          element={
            <PrivateRoute allowedRole="Admin">
              <DashboardAdmin />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/dashboard/employee" 
          element={
            <PrivateRoute allowedRole="Employee">
              <DashboardEmployee />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/dashboard/hr" 
          element={
            <PrivateRoute allowedRole="HR Officer">
              <DashboardHROfficer />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/dashboard/payroll" 
          element={
            <PrivateRoute allowedRole="Payroll Officer">
              <DashboardPayrollOfficer />
            </PrivateRoute>
          } 
        />

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
