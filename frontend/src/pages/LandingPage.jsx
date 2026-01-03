/* 
 * DayFlow HRMS - Single-File Landing Page
 * All 14 sections in one component for simplicity
 * Inspired by Zoho HRMS with dark theme and smooth animations
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, Clock, TrendingUp, Shield, Smartphone, Zap, Award, 
  BarChart3, DollarSign, UserPlus, GraduationCap, FileText,
  ChevronDown, Menu, X, Check, Star, ArrowRight, Play,
  Calendar, MessageSquare, Database, Cloud, Lock
} from 'lucide-react';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll function
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  return (
    <div className="bg-black text-white">
      {/* ==================== NAVIGATION BAR ==================== */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-black/95 backdrop-blur-md border-b border-gray-800' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <button 
              onClick={() => scrollToSection('hero')}
              className="text-2xl font-bold text-primary-500 hover:text-primary-400 transition-colors"
            >
              DayFlow
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollToSection('features')} className="hover:text-primary-500 transition-colors">Features</button>
              <button onClick={() => scrollToSection('analytics')} className="hover:text-primary-500 transition-colors">Analytics</button>
              <Link to="/about" className="hover:text-primary-500 transition-colors">About</Link>
              <Link to="/contact" className="hover:text-primary-500 transition-colors">Contact</Link>
              <Link 
                to="/login"
                className="hover:text-primary-500 transition-colors"
              >
                Login
              </Link>
              <Link 
                to="/signup"
                className="px-6 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors font-semibold"
              >
                Sign Up
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 space-y-4 border-t border-gray-800">
              <button onClick={() => scrollToSection('features')} className="block w-full text-left hover:text-primary-500 transition-colors">Features</button>
              <button onClick={() => scrollToSection('analytics')} className="block w-full text-left hover:text-primary-500 transition-colors">Analytics</button>
              <Link to="/about" className="block hover:text-primary-500 transition-colors">About</Link>
              <Link to="/contact" className="block hover:text-primary-500 transition-colors">Contact</Link>
              <Link to="/login" className="block hover:text-primary-500 transition-colors">Login</Link>
              <Link 
                to="/signup"
                className="block w-full text-left px-6 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors font-semibold"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* ==================== SECTION 1: HERO ==================== */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background gradient orbs */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 container-custom text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm mb-8"
          >
            <Star className="w-4 h-4 mr-2" />
            #1 HRMS Solution for Indian Businesses
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold mb-6"
          >
            Transform Your HR
            <span className="block gradient-text">Operations with DayFlow</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto"
          >
            Streamline employee management, automate payroll, track attendance, and gain powerful insights
            with India's most comprehensive HRMS platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <a 
              href="/login"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors font-semibold text-lg flex items-center justify-center"
            >
              Get Started <ArrowRight className="ml-2 w-5 h-5" />
            </a>
            <button 
              onClick={() => scrollToSection('features')}
              className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-semibold text-lg flex items-center justify-center"
            >
              <Play className="mr-2 w-5 h-5" /> Watch Demo
            </button>
          </motion.div>

          {/* Scroll indicator */}
          <motion.button
            onClick={() => scrollToSection('built-for-people')}
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <ChevronDown className="w-8 h-8 text-gray-400" />
          </motion.button>
        </div>
      </section>

      {/* ==================== SECTION 2: BUILT FOR YOUR PEOPLE ==================== */}
      <section id="built-for-people" className="section-padding bg-gray-900/50">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Built for <span className="gradient-text">Your People</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              An intuitive, people-first HRMS that empowers your team and simplifies HR workflows
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: 'Employee Self-Service',
                description: 'Empower employees to manage their profiles, leaves, and documents independently.',
              },
              {
                icon: Clock,
                title: 'Smart Attendance',
                description: 'Biometric, mobile, and web-based attendance tracking with GPS and geofencing.',
              },
              {
                icon: Calendar,
                title: 'Leave Management',
                description: 'Automated leave accrual, approval workflows, and leave balance tracking.',
              },
              {
                icon: DollarSign,
                title: 'Payroll Automation',
                description: 'Seamless salary processing with statutory compliance and tax calculations.',
              },
              {
                icon: BarChart3,
                title: 'Real-Time Analytics',
                description: 'Comprehensive dashboards and reports for data-driven HR decisions.',
              },
              {
                icon: Shield,
                title: 'Data Security',
                description: 'Bank-grade encryption and ISO 27001 certified data protection.',
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-black border border-gray-800 hover:border-primary-500/50 transition-all duration-300"
              >
                <feature.icon className="w-12 h-12 text-primary-500 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== SECTION 5: HR SOFTWARE THAT GROWS ==================== */}
      <section id="scalable" className="section-padding bg-gray-900/50">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              HR Software That <span className="gradient-text">Grows with You</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              From startups to enterprises, DayFlow scales effortlessly with your business needs
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Users, number: '1-50', label: 'Startups' },
              { icon: TrendingUp, number: '50-200', label: 'Growing Teams' },
              { icon: Database, number: '200-1000', label: 'Mid-Market' },
              { icon: Award, number: '1000+', label: 'Enterprise' },
            ].map((tier, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-black border border-gray-800 hover:border-primary-500/50 transition-all duration-300 text-center"
              >
                <tier.icon className="w-12 h-12 text-primary-500 mx-auto mb-4" />
                <div className="text-3xl font-bold mb-2">{tier.number}</div>
                <div className="text-gray-400">{tier.label}</div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-primary-500/10 to-accent-500/10 border border-primary-500/20"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl font-bold mb-2">Open Source & Customizable</h3>
                <p className="text-gray-400">Self-hosted solution with full access to source code for complete customization</p>
              </div>
              <a 
                href="https://github.com/Rudra9606/Odoo-DayFlow"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors font-semibold whitespace-nowrap"
              >
                View Documentation
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ==================== SECTION 7: EMPLOYEE ENGAGEMENT ==================== */}
      <section id="engagement" className="section-padding bg-gray-900/50">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="relative bg-gradient-to-br from-accent-500/20 to-primary-500/20 rounded-3xl p-8 backdrop-blur-sm border border-white/10">
                <MessageSquare className="w-full h-64 text-accent-500/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl font-bold gradient-text mb-2">95%</div>
                    <div className="text-xl text-gray-400">Employee Satisfaction</div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Boost <span className="gradient-text">Employee Engagement</span>
              </h2>
              <p className="text-xl text-gray-400 mb-8">
                Create a culture of transparency, recognition, and continuous feedback
              </p>
              <div className="space-y-6">
                {[
                  { icon: MessageSquare, title: 'Pulse Surveys', description: 'Regular feedback collection to gauge employee sentiment' },
                  { icon: Award, title: 'Recognition Programs', description: 'Peer-to-peer and manager recognition systems' },
                  { icon: TrendingUp, title: 'Performance Reviews', description: '360-degree feedback and goal tracking' },
                  { icon: Users, title: 'Team Collaboration', description: 'Internal communication and social features' },
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-primary-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                      <p className="text-gray-400">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION 8: HR ANALYTICS ==================== */}
      <section id="analytics" className="section-padding">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Powerful <span className="gradient-text">HR Analytics</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Make data-driven decisions with comprehensive workforce analytics and insights
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              { icon: BarChart3, title: 'Real-Time Dashboards', description: 'Live metrics and KPIs for instant insights' },
              { icon: TrendingUp, title: 'Predictive Analytics', description: 'AI-powered forecasting and trend analysis' },
              { icon: FileText, title: 'Custom Reports', description: 'Build and schedule automated reports' },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-black border border-gray-800 hover:border-primary-500/50 transition-all duration-300"
              >
                <feature.icon className="w-12 h-12 text-primary-500 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Mock Analytics Dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="p-8 rounded-2xl bg-gradient-to-br from-gray-900 to-black border border-gray-800"
          >
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              {[
                { label: 'Total Employees', value: '1,234', change: '+12%' },
                { label: 'Avg. Attendance', value: '94.2%', change: '+2.1%' },
                { label: 'Open Positions', value: '23', change: '-5' },
                { label: 'Satisfaction Score', value: '4.6/5', change: '+0.3' },
              ].map((metric, index) => (
                <div key={index} className="p-4 rounded-xl bg-black/50">
                  <div className="text-sm text-gray-400 mb-1">{metric.label}</div>
                  <div className="text-2xl font-bold mb-1">{metric.value}</div>
                  <div className="text-sm text-green-400">{metric.change}</div>
                </div>
              ))}
            </div>
            <div className="h-64 bg-black/50 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-24 h-24 text-primary-500/30" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ==================== SECTION 9: INTEGRATED PAYROLL ==================== */}
      <section id="payroll" className="section-padding bg-gray-900/50">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="gradient-text">Integrated Payroll</span> Management
              </h2>
              <p className="text-xl text-gray-400 mb-8">
                Automate salary processing with 100% compliance for Indian tax and labor laws
              </p>
              <div className="space-y-4 mb-8">
                {[
                  'Automatic PF, ESI, and PT calculations',
                  'Income tax computation as per latest IT rules',
                  'Form 16, Form 12BB generation',
                  'Direct bank transfer integration',
                  'Reimbursement and expense management',
                  'Salary revision and arrears handling',
                ].map((item, index) => (
                  <div key={index} className="flex items-center">
                    <Check className="w-5 h-5 text-primary-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
              <button className="px-8 py-3 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors font-semibold">
                Explore Payroll Features
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="p-8 rounded-2xl bg-black border border-gray-800">
                <DollarSign className="w-16 h-16 text-primary-500 mb-6" />
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-900 rounded-lg">
                    <span className="text-gray-400">Basic Salary</span>
                    <span className="font-semibold">₹50,000</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-900 rounded-lg">
                    <span className="text-gray-400">HRA</span>
                    <span className="font-semibold">₹20,000</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-900 rounded-lg">
                    <span className="text-gray-400">Allowances</span>
                    <span className="font-semibold">₹10,000</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-900 rounded-lg">
                    <span className="text-gray-400">Deductions</span>
                    <span className="font-semibold text-red-400">-₹8,000</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-primary-500/20 border border-primary-500 rounded-lg">
                    <span className="font-semibold">Net Salary</span>
                    <span className="text-2xl font-bold text-primary-400">₹72,000</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION 13: FAQ ==================== */}
      <section id="faq" className="section-padding bg-gray-900/50">
        <div className="container-custom max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Frequently Asked <span className="gradient-text">Questions</span>
            </h2>
            <p className="text-xl text-gray-400">
              Everything you need to know about DayFlow HRMS
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'How long does it take to implement DayFlow HRMS?',
                a: 'Most organizations can go live within 2-4 weeks, including data migration and employee training.',
              },
              {
                q: 'Is DayFlow HRMS compliant with Indian labor laws?',
                a: 'Yes, DayFlow is fully compliant with all Indian labor laws including PF, ESI, PT, and IT regulations.',
              },
              {
                q: 'Can I integrate DayFlow with my existing accounting software?',
                a: 'Absolutely! We support integration with popular accounting tools like Tally, QuickBooks, and SAP.',
              },
              {
                q: 'What kind of support do you provide?',
                a: 'We offer 24/7 email and chat support, dedicated account managers for enterprise clients, and comprehensive training materials.',
              },
              {
                q: 'Is my data secure with DayFlow?',
                a: 'Yes, we use bank-grade encryption, regular security audits, and are ISO 27001 certified for data security.',
              },
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-black border border-gray-800"
              >
                <h3 className="text-lg font-semibold mb-2">{faq.q}</h3>
                <p className="text-gray-400">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== SECTION 14: FOOTER ==================== */}
      <section id="awards" className="section-padding">
        <div className="container-custom">
          {/* Footer */}
          <footer className="border-t border-gray-800 pt-12">
            <div className="grid md:grid-cols-4 gap-8 mb-12">
              <div>
                <div className="text-2xl font-bold text-primary-500 mb-4">DayFlow</div>
                <p className="text-gray-400 mb-4">
                  Open Source HRMS for modern businesses
                </p>
                <div className="flex space-x-4">
                  <a href="https://github.com/Rudra9606/Odoo-DayFlow" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center hover:bg-primary-500 transition-colors">
                    <span className="text-xs">GH</span>
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center hover:bg-primary-500 transition-colors">
                    <span className="text-xs">T</span>
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center hover:bg-primary-500 transition-colors">
                    <span className="text-xs">L</span>
                  </a>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Product</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><button onClick={() => scrollToSection('features')} className="hover:text-primary-500">Features</button></li>
                  <li><button onClick={() => scrollToSection('analytics')} className="hover:text-primary-500">Analytics</button></li>
                  <li><button onClick={() => scrollToSection('demo')} className="hover:text-primary-500">Demo</button></li>
                  <li><a href="https://github.com/Rudra9606/Odoo-DayFlow" target="_blank" rel="noopener noreferrer" className="hover:text-primary-500">Documentation</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Company</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><Link to="/about" className="hover:text-primary-500">About Us</Link></li>
                  <li><a href="#" className="hover:text-primary-500">Careers</a></li>
                  <li><a href="#" className="hover:text-primary-500">Blog</a></li>
                  <li><Link to="/contact" className="hover:text-primary-500">Contact</Link></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Legal</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-primary-500">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-primary-500">Terms of Service</a></li>
                  <li><a href="#" className="hover:text-primary-500">Security</a></li>
                  <li><a href="#" className="hover:text-primary-500">Compliance</a></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-800 text-center text-gray-400">
              <p>&copy; {new Date().getFullYear()} DayFlow HRMS. Open Source under MIT License. Made with ❤️ by the community.</p>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}
