/**
 * WorkZen HRMS - Profile Page
 * Single-file profile page accessible from navbar dropdown
 * Shows user information and allows basic updates
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, User, Mail, Briefcase, Shield, Calendar, 
  Edit2, Save, X
} from 'lucide-react';

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
  });

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('workzen_token');
    const userData = localStorage.getItem('workzen_user');

    if (!token) {
      navigate('/login');
      return;
    }

    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setFormData({
        name: parsedUser.name,
        email: parsedUser.email,
        role: parsedUser.role,
      });
    }
  }, [navigate]);

  const handleBack = () => {
    const role = localStorage.getItem('workzen_role');
    // Navigate back to appropriate dashboard
    switch (role) {
      case 'Admin':
        navigate('/dashboard/admin');
        break;
      case 'Employee':
        navigate('/dashboard/employee');
        break;
      case 'HR Officer':
        navigate('/dashboard/hr');
        break;
      case 'Payroll Officer':
        navigate('/dashboard/payroll');
        break;
      default:
        navigate('/');
    }
  };

  const handleSave = () => {
    // Update user data in localStorage
    const updatedUser = { ...user, ...formData };
    localStorage.setItem('workzen_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    setIsEditing(false);
    
    // TODO: Send update to backend API
    console.log('✅ Profile updated (local only - TODO: sync with backend)');
  };

  const handleCancel = () => {
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
    });
    setIsEditing(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Background Gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <motion.button
          onClick={handleBack}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -4 }}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-all mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </motion.button>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-accent p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* Avatar */}
                <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white font-bold text-3xl border-4 border-white/30">
                  {(user.name || user.firstName + ' ' + user.lastName || 'U').split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                
                {/* Name & Role */}
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">{user.name || user.firstName + ' ' + user.lastName || 'User'}</h1>
                  <div className="flex items-center gap-2 text-white/90">
                    <Shield className="w-4 h-4" />
                    <span className="font-medium">{user.role}</span>
                  </div>
                </div>
              </div>

              {/* Edit Button */}
              {!isEditing && (
                <motion.button
                  onClick={() => setIsEditing(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-xl text-white rounded-lg transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </motion.button>
              )}
            </div>
          </div>

          {/* Profile Information */}
          <div className="p-8">
            <h2 className="text-xl font-semibold text-white mb-6">Profile Information</h2>
            
            <div className="space-y-6">
              {/* Name Field */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
                  <User className="w-4 h-4" />
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <div className="px-4 py-3 bg-gray-800/50 border border-gray-800 rounded-lg text-white">
                    {user.name || user.firstName + ' ' + user.lastName || 'User'}
                  </div>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <div className="px-4 py-3 bg-gray-800/50 border border-gray-800 rounded-lg text-white">
                    {user.email}
                  </div>
                )}
              </div>

              {/* Role Field (Read-only) */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
                  <Briefcase className="w-4 h-4" />
                  Role
                </label>
                <div className="px-4 py-3 bg-gray-800/50 border border-gray-800 rounded-lg text-gray-400">
                  {user.role}
                  <span className="text-xs ml-2">(Cannot be changed)</span>
                </div>
              </div>

              {/* User ID (Read-only) */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
                  <Shield className="w-4 h-4" />
                  User ID
                </label>
                <div className="px-4 py-3 bg-gray-800/50 border border-gray-800 rounded-lg text-gray-400 font-mono text-sm">
                  {user.userId}
                </div>
              </div>

              {/* Member Since (Mock) */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
                  <Calendar className="w-4 h-4" />
                  Member Since
                </label>
                <div className="px-4 py-3 bg-gray-800/50 border border-gray-800 rounded-lg text-gray-400">
                  November 2025
                </div>
              </div>
            </div>

            {/* Action Buttons (When Editing) */}
            {isEditing && (
              <div className="flex items-center gap-4 mt-8">
                <motion.button
                  onClick={handleSave}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/80 text-white rounded-lg font-medium transition-all"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </motion.button>
                <motion.button
                  onClick={handleCancel}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-all"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Additional Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-3">Account Security</h3>
          <p className="text-gray-400 text-sm mb-4">
            To change your password or update security settings, please contact your administrator.
          </p>
          <p className="text-xs text-gray-500">
            Note: This is a demo version. In production, integrate with backend API for real updates.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default Profile;
