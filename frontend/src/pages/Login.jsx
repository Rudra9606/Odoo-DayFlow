/**
 * WorkZen HRMS - Login Page
 * Single-file login page with role-based redirection
 * Redirects to appropriate dashboard based on user role:
 * - Employee → /dashboard/employee
 * - HR Officer → /dashboard/hr
 * - Payroll Officer → /dashboard/payroll
 * - Admin → /dashboard/employee (fallback)
 * Follows Excalidraw HRMS workflow
 */

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, LogIn, CheckCircle } from 'lucide-react';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    identifier: '', // Can be email or userId
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Check for success message from signup redirect
  useState(() => {
    if (location.state?.message) {
      setSuccess(location.state.message);
      // Clear message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    }
  }, [location]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Determine if identifier is email or userId
      const isEmail = formData.identifier.includes('@');
      const loginData = {
        password: formData.password,
        ...(isEmail ? { email: formData.identifier } : { userId: formData.identifier })
      };

      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (response.ok) {
        // Save token and user info to localStorage
        localStorage.setItem('workzen_token', data.token);
        localStorage.setItem('workzen_role', data.user.role);
        localStorage.setItem('workzen_user', JSON.stringify(data.user));
        
        console.log('✅ Login successful, redirecting to role dashboard:', data.user.role);
        
        // Role-based redirection following Excalidraw workflow
        switch (data.user.role) {
          case 'Employee':
            navigate('/dashboard/employee');
            break;
          case 'HR Officer':
            navigate('/dashboard/hr');
            break;
          case 'Payroll Officer':
            navigate('/dashboard/payroll');
            break;
          case 'Admin':
            // Admin redirects to admin dashboard
            navigate('/dashboard/admin');
            break;
          default:
            // Fallback
            navigate('/dashboard/employee');
        }
      } else {
        setError(data.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('Unable to connect to server. Please try again later.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12">
      {/* Background Gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <Link to="/">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              WorkZen
            </h1>
          </Link>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl p-8"
        >
          {/* Header */}
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-2">
              Welcome Back to WorkZen HRMS
            </h2>
            <p className="text-gray-400 text-sm">
              Login to manage attendance, payroll, and more.
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              {success}
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email/UserID Field */}
            <motion.div
              whileFocus={{ scale: 1.01 }}
              className="space-y-2"
            >
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-300">
                Email or User ID
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                  type="text"
                  id="identifier"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="admin@workzen.com or WOJOSU20250001"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                You can login with your email or User ID
              </p>
            </motion.div>

            {/* Password Field */}
            <motion.div
              whileFocus={{ scale: 1.01 }}
              className="space-y-2"
            >
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-12 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-2 space-y-1">
                <p className="font-semibold text-gray-400">Test credentials:</p>
                <p>• Employee: employee1@workzen.com / emp123</p>
                <p>• HR Officer: hr1@workzen.com / hr1234</p>
                <p>• Payroll Officer: payroll1@workzen.com / pay123</p>
                <p>• Admin: admin@workzen.com / admin123</p>
              </div>
            </motion.div>

            {/* Login Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-primary hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Login to Dashboard
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-800"></div>
            <span className="px-4 text-gray-500 text-sm">OR</span>
            <div className="flex-1 border-t border-gray-800"></div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-primary hover:text-accent font-semibold transition-colors"
              >
                Sign Up →
              </Link>
            </p>
          </div>

          {/* Back to Home */}
          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </motion.div>

        {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-gray-500 text-xs"
        >
          <p>Secure authentication powered by WorkZen HRMS</p>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default Login;
