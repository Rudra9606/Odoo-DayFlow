import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LogOut, 
  User, 
  Mail, 
  Briefcase, 
  Calendar, 
  Clock, 
  DollarSign,
  Users,
  BarChart3,
  Settings
} from 'lucide-react';

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is authenticated
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      navigate('/login');
      return;
    }

    // Get user data from localStorage
    const userEmail = localStorage.getItem('userEmail');
    const userRole = localStorage.getItem('userRole');
    
    setUser({
      email: userEmail,
      role: userRole,
      name: userEmail?.split('@')[0] || 'User',
    });
  }, [navigate]);

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    
    // Redirect to login
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const quickStats = [
    { icon: Users, label: 'Total Employees', value: '248', color: 'text-blue-400' },
    { icon: Calendar, label: 'Today\'s Attendance', value: '234', color: 'text-green-400' },
    { icon: Clock, label: 'Pending Leaves', value: '12', color: 'text-yellow-400' },
    { icon: DollarSign, label: 'Payroll This Month', value: '₹124K', color: 'text-accent' },
  ];

  const quickActions = [
    { icon: Calendar, label: 'Mark Attendance', path: '/attendance' },
    { icon: Clock, label: 'Apply Leave', path: '/leave' },
    { icon: DollarSign, label: 'View Payroll', path: '/payroll' },
    { icon: Users, label: 'Manage Employees', path: '/employees' },
    { icon: BarChart3, label: 'View Analytics', path: '/analytics' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Background Gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 bg-gray-900/50 backdrop-blur-xl border-b border-gray-800"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                DayFlow HRMS
              </h1>
            </Link>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm text-gray-400">Welcome back,</p>
                <p className="text-white font-semibold capitalize">{user.name || user.firstName + ' ' + user.lastName || 'User'}</p>
              </div>
              
              <motion.button
                onClick={handleLogout}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all border border-gray-700"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold text-white mb-2">
            Welcome, {user.name || user.firstName + ' ' + user.lastName || 'User'}! 👋
          </h2>
          <p className="text-gray-400">
            You're logged in as <span className="text-primary font-semibold">{user.role}</span>
          </p>
        </motion.div>

        {/* User Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-primary/10 to-accent/10 border border-gray-800 rounded-2xl p-6 mb-8"
        >
          <h3 className="text-xl font-bold text-white mb-4">Your Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-900 rounded-lg">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Name</p>
                <p className="text-white font-semibold capitalize">{user.name || user.firstName + ' ' + user.lastName || 'User'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-900 rounded-lg">
                <Mail className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Email</p>
                <p className="text-white font-semibold">{user.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-900 rounded-lg">
                <Briefcase className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Role</p>
                <p className="text-white font-semibold">{user.role}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h3 className="text-xl font-bold text-white mb-4">Quick Stats</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickStats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all"
              >
                <stat.icon className={`w-8 h-8 ${stat.color} mb-3`} />
                <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-primary hover:bg-gray-900 transition-all text-center group"
              >
                <action.icon className="w-8 h-8 text-gray-400 group-hover:text-primary transition-colors mx-auto mb-3" />
                <p className="text-gray-300 text-sm font-medium">{action.label}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Coming Soon Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 text-center"
        >
          <p className="text-blue-400 font-semibold mb-2">🚀 Dashboard Under Development</p>
          <p className="text-gray-400 text-sm">
            Full dashboard features including attendance tracking, leave management, payroll processing, and analytics are coming soon!
          </p>
        </motion.div>
      </main>
    </div>
  );
}

export default Dashboard;
