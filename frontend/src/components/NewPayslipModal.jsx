/**
 * WorkZen HRMS - New Payslip Modal Component
 * Create new payslip with salary computation and validation
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Calculator, User, DollarSign, AlertCircle, Download } from 'lucide-react';

function NewPayslipModal({ show, onClose, onSubmit }) {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);
  
  // Payslip form data
  const [formData, setFormData] = useState({
    employeeId: '',
    payPeriodStart: '',
    payPeriodEnd: '',
    payDate: '',
    
    // Basic salary
    basicSalary: 0,
    
    // Earnings/Allowances
    houseRentAllowance: 0,
    conveyanceAllowance: 0,
    medicalAllowance: 0,
    leaveTravelAllowance: 0,
    standardAllowance: 0,
    fixedAllowance: 0,
    performanceBonus: 0,
    overtimeHours: 0,
    overtimeRate: 0,
    
    // Deductions
    pfEmployee: 0,
    pfEmployer: 0,
    professionalTax: 0,
    incomeTax: 0,
    
    // Attendance
    totalDays: 22,
    presentDays: 20,
    paidLeaves: 2
  });
  
  const [computed, setComputed] = useState({
    grossEarnings: 0,
    totalDeductions: 0,
    netPay: 0,
    overtimeAmount: 0
  });

  useEffect(() => {
    if (show) {
      fetchEmployees();
      // Set default dates
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      setFormData(prev => ({
        ...prev,
        payPeriodStart: firstDay.toISOString().split('T')[0],
        payPeriodEnd: lastDay.toISOString().split('T')[0],
        payDate: today.toISOString().split('T')[0]
      }));
    }
  }, [show]);

  // Auto-compute whenever form values change (with debounce for performance)
  useEffect(() => {
    if (formData.basicSalary > 0) {
      // Debounce to prevent excessive calculations
      const timer = setTimeout(() => {
        const {
          basicSalary,
          houseRentAllowance,
          conveyanceAllowance,
          medicalAllowance,
          leaveTravelAllowance,
          standardAllowance,
          fixedAllowance,
          performanceBonus,
          overtimeHours,
          overtimeRate,
          pfEmployee,
          pfEmployer,
          professionalTax,
          incomeTax
        } = formData;

        // Calculate overtime
        const overtimeAmount = overtimeHours * overtimeRate;

        // Calculate gross earnings
        const grossEarnings = 
          basicSalary +
          houseRentAllowance +
          conveyanceAllowance +
          medicalAllowance +
          leaveTravelAllowance +
          standardAllowance +
          fixedAllowance +
          performanceBonus +
          overtimeAmount;

        // Calculate total deductions
        const totalDeductions = 
          pfEmployee +
          pfEmployer +
          professionalTax +
          incomeTax;

        // Calculate net pay
        const netPay = grossEarnings - totalDeductions;

        setComputed({
          grossEarnings,
          totalDeductions,
          netPay,
          overtimeAmount
        });
      }, 200); // 200ms debounce for faster response

      return () => clearTimeout(timer);
    }
  }, [
    formData.basicSalary,
    formData.houseRentAllowance,
    formData.conveyanceAllowance,
    formData.medicalAllowance,
    formData.leaveTravelAllowance,
    formData.standardAllowance,
    formData.fixedAllowance,
    formData.performanceBonus,
    formData.overtimeHours,
    formData.overtimeRate,
    formData.pfEmployee,
    formData.pfEmployer,
    formData.professionalTax,
    formData.incomeTax
  ]);

  const fetchEmployees = async () => {
    try {
      console.log('Fetching employees from API...');
      const response = await fetch('http://localhost:5000/api/users');
      const data = await response.json();
      
      console.log('API Response:', data);
      console.log('Users data:', data.data);
      
      if (data.success && data.data) {
        // API returns users in 'data' field
        const activeEmployees = data.data.filter(u => u.isActive);
        console.log('Active employees:', activeEmployees);
        console.log('Number of active employees:', activeEmployees.length);
        setEmployees(activeEmployees);
      } else {
        console.error('API response not successful or no data:', data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleEmployeeSelect = (e) => {
    const empId = e.target.value;
    setFormData(prev => ({ ...prev, employeeId: empId }));
    
    const employee = employees.find(emp => emp._id === empId);
    setSelectedEmployee(employee);
    
    // Pre-fill basic salary if available
    if (employee?.salary || employee?.basicSalary) {
      const basic = employee.salary || employee.basicSalary || 0;
      setFormData(prev => ({
        ...prev,
        basicSalary: basic,
        // Calculate standard allowances (50% of basic for HRA, 10% for others)
        houseRentAllowance: Math.round(basic * 0.5),
        conveyanceAllowance: Math.round(basic * 0.1),
        medicalAllowance: Math.round(basic * 0.1),
        leaveTravelAllowance: Math.round(basic * 0.083),
        standardAllowance: Math.round(basic * 0.05),
        fixedAllowance: Math.round(basic * 0.05),
        // Calculate deductions (12% PF)
        pfEmployee: Math.round(basic * 0.12),
        pfEmployer: Math.round(basic * 0.12),
        professionalTax: 200,
        overtimeRate: Math.round(basic / 208) // Hourly rate based on 208 hours/month
      }));
    }
  };

  const handleInputChange = (field, value) => {
    // For date fields, keep the string value
    if (field === 'payPeriodStart' || field === 'payPeriodEnd' || field === 'payDate') {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else {
      // For numeric fields, parse to number
      const numValue = parseFloat(value) || 0;
      setFormData(prev => ({ ...prev, [field]: numValue }));
    }
  };

  const computePayslip = () => {
    setComputing(true);
    
    const {
      basicSalary,
      houseRentAllowance,
      conveyanceAllowance,
      medicalAllowance,
      leaveTravelAllowance,
      standardAllowance,
      fixedAllowance,
      performanceBonus,
      overtimeHours,
      overtimeRate,
      pfEmployee,
      pfEmployer,
      professionalTax,
      incomeTax
    } = formData;

    // Calculate overtime
    const overtimeAmount = overtimeHours * overtimeRate;

    // Calculate gross earnings
    const grossEarnings = 
      basicSalary +
      houseRentAllowance +
      conveyanceAllowance +
      medicalAllowance +
      leaveTravelAllowance +
      standardAllowance +
      fixedAllowance +
      performanceBonus +
      overtimeAmount;

    // Calculate total deductions
    const totalDeductions = 
      pfEmployee +
      pfEmployer +
      professionalTax +
      incomeTax;

    // Calculate net pay
    const netPay = grossEarnings - totalDeductions;

    setComputed({
      grossEarnings,
      totalDeductions,
      netPay,
      overtimeAmount
    });

    setComputing(false);
  };

  const handleDownloadPDF = () => {
    if (!selectedEmployee) {
      alert('Please select an employee first');
      return;
    }

    if (computed.netPay === 0) {
      alert('Please compute the payslip first');
      return;
    }

    // Generate PDF using print dialog
    const employeeName = selectedEmployee.name || `${selectedEmployee.firstName} ${selectedEmployee.lastName}`;
    const WindowPrint = window.open('', '', 'width=900,height=650');
    
    WindowPrint.document.write(`
      <html>
        <head>
          <title>Payslip - ${employeeName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; color: #000; background: #fff; }
            .payslip-container { max-width: 800px; margin: 0 auto; border: 2px solid #000; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px; }
            .company-logo { font-size: 24px; font-weight: bold; color: #005eb8; margin-bottom: 5px; }
            .payslip-title { font-size: 18px; font-weight: bold; color: #00a8e8; margin: 10px 0; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
            .info-item { padding: 5px 0; }
            .info-label { font-size: 12px; color: #666; display: inline-block; width: 140px; }
            .info-value { font-size: 13px; font-weight: 600; color: #000; }
            .section { margin: 20px 0; }
            .section-title { background: #e8b4f7; padding: 8px 15px; font-weight: bold; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
            th { background: #f5f5f5; font-weight: 600; font-size: 12px; }
            td { font-size: 13px; }
            .amount { text-align: right; font-family: monospace; }
            .total-row { background: #b0e0f7; font-weight: bold; }
            .net-pay { background: #b0e0f7; padding: 15px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: bold; border: 2px solid #00a8e8; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="payslip-container">
            <div class="header">
              <div class="company-logo">WorkZen HRMS</div>
              <div class="payslip-title">Employee Payslip</div>
            </div>

            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Employee Name:</span>
                <span class="info-value">${employeeName}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Email:</span>
                <span class="info-value">${selectedEmployee.email}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Department:</span>
                <span class="info-value">${selectedEmployee.department || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Designation:</span>
                <span class="info-value">${selectedEmployee.designation || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Pay Period:</span>
                <span class="info-value">${formData.payPeriodStart} to ${formData.payPeriodEnd}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Pay Date:</span>
                <span class="info-value">${formData.payDate}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Earnings & Allowances</div>
              <table>
                <tr><th>Description</th><th class="amount">Amount (₹)</th></tr>
                <tr><td>Basic Salary</td><td class="amount">₹${formData.basicSalary.toFixed(2)}</td></tr>
                <tr><td>House Rent Allowance</td><td class="amount">₹${formData.houseRentAllowance.toFixed(2)}</td></tr>
                <tr><td>Conveyance Allowance</td><td class="amount">₹${formData.conveyanceAllowance.toFixed(2)}</td></tr>
                <tr><td>Medical Allowance</td><td class="amount">₹${formData.medicalAllowance.toFixed(2)}</td></tr>
                <tr><td>Leave Travel Allowance</td><td class="amount">₹${formData.leaveTravelAllowance.toFixed(2)}</td></tr>
                <tr><td>Standard Allowance</td><td class="amount">₹${formData.standardAllowance.toFixed(2)}</td></tr>
                <tr><td>Fixed Allowance</td><td class="amount">₹${formData.fixedAllowance.toFixed(2)}</td></tr>
                <tr><td>Performance Bonus</td><td class="amount">₹${formData.performanceBonus.toFixed(2)}</td></tr>
                <tr><td>Overtime (${formData.overtimeHours} hrs @ ₹${formData.overtimeRate}/hr)</td><td class="amount">₹${computed.overtimeAmount.toFixed(2)}</td></tr>
                <tr class="total-row"><td>Gross Earnings</td><td class="amount">₹${computed.grossEarnings.toFixed(2)}</td></tr>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Deductions</div>
              <table>
                <tr><th>Description</th><th class="amount">Amount (₹)</th></tr>
                <tr><td>PF Employee</td><td class="amount">₹${formData.pfEmployee.toFixed(2)}</td></tr>
                <tr><td>PF Employer</td><td class="amount">₹${formData.pfEmployer.toFixed(2)}</td></tr>
                <tr><td>Professional Tax</td><td class="amount">₹${formData.professionalTax.toFixed(2)}</td></tr>
                <tr><td>Income Tax</td><td class="amount">₹${formData.incomeTax.toFixed(2)}</td></tr>
                <tr class="total-row"><td>Total Deductions</td><td class="amount">₹${computed.totalDeductions.toFixed(2)}</td></tr>
              </table>
            </div>

            <div class="net-pay">
              NET PAY: ₹ ${computed.netPay.toFixed(2)}
            </div>

            <div style="margin-top: 30px; font-size: 11px; color: #666;">
              <p>This is a computer-generated payslip. No signature required.</p>
              <p>Generated on: ${new Date().toLocaleDateString()}</p>
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

  const handleValidate = async () => {
    if (!formData.employeeId) {
      alert('Please select an employee');
      return;
    }

    if (!formData.payPeriodStart || !formData.payPeriodEnd || !formData.payDate) {
      alert('Please fill all date fields');
      return;
    }

    if (formData.basicSalary <= 0) {
      alert('Basic salary must be greater than 0');
      return;
    }

    // Show confirmation dialog
    const employeeName = selectedEmployee?.name || selectedEmployee?.firstName + ' ' + selectedEmployee?.lastName;
    const confirmMessage = `
Are you sure you want to create this payslip?

Employee: ${employeeName}
Period: ${formData.payPeriodStart} to ${formData.payPeriodEnd}
Gross Earnings: ₹${computed.grossEarnings.toFixed(2)}
Total Deductions: ₹${computed.totalDeductions.toFixed(2)}
Net Pay: ₹${computed.netPay.toFixed(2)}

Click OK to confirm and save.
    `;

    if (!window.confirm(confirmMessage)) {
      return; // User cancelled
    }

    setLoading(true);

    try {
      const payrollData = {
        employee: formData.employeeId,
        payPeriod: {
          startDate: formData.payPeriodStart,
          endDate: formData.payPeriodEnd
        },
        payDate: formData.payDate,
        basicSalary: formData.basicSalary,
        
        earnings: {
          allowances: {
            hra: formData.houseRentAllowance,
            conveyance: formData.conveyanceAllowance,
            medical: formData.medicalAllowance,
            lta: formData.leaveTravelAllowance,
            other: formData.standardAllowance + formData.fixedAllowance
          },
          bonus: formData.performanceBonus,
          overtime: {
            hours: formData.overtimeHours,
            rate: formData.overtimeRate,
            amount: computed.overtimeAmount
          }
        },
        
        deductions: {
          providentFund: {
            employee: formData.pfEmployee,
            employer: formData.pfEmployer
          },
          tax: {
            professionalTax: formData.professionalTax,
            incomeTax: formData.incomeTax
          }
        },
        
        attendanceSummary: {
          totalDays: formData.totalDays,
          presentDays: formData.presentDays,
          leaveDays: formData.paidLeaves
        },
        
        grossEarnings: computed.grossEarnings,
        netPay: computed.netPay,
        paymentStatus: 'pending',
        status: 'draft'
      };

      const response = await fetch('http://localhost:5000/api/payroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('workzen_token')}`
        },
        body: JSON.stringify(payrollData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success! Call parent's onSubmit callback
        if (onSubmit) {
          onSubmit(data.payroll);
        }
        // Close and reset the modal
        handleClose();
      } else {
        // Handle specific error messages
        let errorMessage = data.message || 'Failed to create payslip';
        
        // Check for duplicate payslip error
        if (errorMessage.includes('duplicate') || errorMessage.includes('E11000') || errorMessage.includes('already exists')) {
          errorMessage = `❌ A payslip already exists for this employee (${employeeName}) for the period ${formData.payPeriodStart} to ${formData.payPeriodEnd}.\n\nPlease:\n• Select a different employee, OR\n• Change the pay period dates`;
        }
        
        alert('❌ Error: ' + errorMessage);
      }
    } catch (error) {
      console.error('Error creating payslip:', error);
      
      // Check if it's a network/fetch error
      if (error.message === 'Failed to fetch' || error instanceof TypeError) {
        alert('❌ Connection Error!\n\nCannot connect to the server. Please ensure:\n• Backend server is running on http://localhost:5000\n• You have internet connection\n• No firewall is blocking the request');
      }
      // Check if it's a duplicate error from server
      else if (error.message && (error.message.includes('duplicate') || error.message.includes('E11000'))) {
        alert(`❌ Duplicate Payslip Error!\n\nA payslip already exists for this employee for the selected period.\n\nPlease:\n• Select a different employee, OR\n• Change the pay period dates`);
      } else {
        alert('❌ Error creating payslip: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      employeeId: '',
      payPeriodStart: '',
      payPeriodEnd: '',
      payDate: '',
      basicSalary: 0,
      houseRentAllowance: 0,
      conveyanceAllowance: 0,
      medicalAllowance: 0,
      leaveTravelAllowance: 0,
      standardAllowance: 0,
      fixedAllowance: 0,
      performanceBonus: 0,
      overtimeHours: 0,
      overtimeRate: 0,
      pfEmployee: 0,
      pfEmployer: 0,
      professionalTax: 0,
      incomeTax: 0,
      totalDays: 22,
      presentDays: 20,
      paidLeaves: 2
    });
    setComputed({ grossEarnings: 0, totalDeductions: 0, netPay: 0, overtimeAmount: 0 });
    setSelectedEmployee(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-900 border-2 border-purple-500/50 rounded-xl max-w-6xl w-full my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-gray-800 bg-purple-900/20">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-purple-400" />
              <div>
                <h3 className="text-2xl font-bold text-white">New Payslip</h3>
                <p className="text-gray-400 text-sm mt-1">Create and compute employee payslip</p>
              </div>
            </div>
            <motion.button
              onClick={handleClose}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Body */}
          <div className="px-8 py-6 max-h-[calc(100vh-250px)] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Employee & Dates */}
              <div className="space-y-6">
                {/* Employee Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Select Employee *
                  </label>
                  <select
                    value={formData.employeeId}
                    onChange={handleEmployeeSelect}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">
                      {employees.length === 0 ? 'No employees found - Loading...' : 'Choose employee...'}
                    </option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name || `${emp.firstName} ${emp.lastName}`} ({emp.role}) - {emp.department || 'N/A'}
                      </option>
                    ))}
                  </select>
                  {employees.length === 0 && (
                    <p className="mt-2 text-sm text-yellow-400">
                      ⚠️ No employees loaded. Check browser console for errors.
                    </p>
                  )}
                  {employees.length > 0 && (
                    <p className="mt-2 text-sm text-green-400">
                      ✅ {employees.length} employee(s) available
                    </p>
                  )}
                  {selectedEmployee && (
                    <div className="mt-2 p-3 bg-gray-800/50 rounded-lg text-sm text-gray-400">
                      <p>Email: {selectedEmployee.email}</p>
                      <p>Role: {selectedEmployee.role}</p>
                      <p>Department: {selectedEmployee.department || 'N/A'}</p>
                      <p>Designation: {selectedEmployee.designation || 'N/A'}</p>
                    </div>
                  )}
                </div>

                {/* Pay Period */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Pay Period Start *</label>
                  <input
                    type="date"
                    value={formData.payPeriodStart}
                    onChange={(e) => handleInputChange('payPeriodStart', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Pay Period End *</label>
                  <input
                    type="date"
                    value={formData.payPeriodEnd}
                    onChange={(e) => handleInputChange('payPeriodEnd', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Pay Date *</label>
                  <input
                    type="date"
                    value={formData.payDate}
                    onChange={(e) => handleInputChange('payDate', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Attendance */}
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3">Attendance Summary</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Total Days</label>
                      <input
                        type="number"
                        value={formData.totalDays}
                        onChange={(e) => handleInputChange('totalDays', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Present Days</label>
                      <input
                        type="number"
                        value={formData.presentDays}
                        onChange={(e) => handleInputChange('presentDays', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Paid Leaves</label>
                      <input
                        type="number"
                        value={formData.paidLeaves}
                        onChange={(e) => handleInputChange('paidLeaves', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Column - Earnings */}
              <div className="space-y-4">
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    Earnings & Allowances
                  </h4>
                  <div className="space-y-3">
                    {[
                      { key: 'basicSalary', label: 'Basic Salary *', required: true },
                      { key: 'houseRentAllowance', label: 'House Rent Allowance' },
                      { key: 'conveyanceAllowance', label: 'Conveyance Allowance' },
                      { key: 'medicalAllowance', label: 'Medical Allowance' },
                      { key: 'leaveTravelAllowance', label: 'Leave Travel Allowance' },
                      { key: 'standardAllowance', label: 'Standard Allowance' },
                      { key: 'fixedAllowance', label: 'Fixed Allowance' },
                      { key: 'performanceBonus', label: 'Performance Bonus' }
                    ].map(field => (
                      <div key={field.key}>
                        <label className="block text-sm text-gray-400 mb-1">
                          {field.label} {field.required && <span className="text-red-400">*</span>}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            value={formData[field.key]}
                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                            required={field.required}
                          />
                        </div>
                      </div>
                    ))}

                    {/* Overtime */}
                    <div className="pt-3 border-t border-gray-700">
                      <label className="block text-sm text-gray-400 mb-1">Overtime Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.overtimeHours}
                        onChange={(e) => handleInputChange('overtimeHours', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Overtime Rate (₹/hour)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.overtimeRate}
                        onChange={(e) => handleInputChange('overtimeRate', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                      />
                    </div>
                    {formData.overtimeHours > 0 && (
                      <div className="bg-gray-800 p-2 rounded text-sm">
                        <span className="text-gray-400">Overtime Amount:</span>
                        <span className="text-green-400 ml-2 font-semibold">
                          ₹ {(formData.overtimeHours * formData.overtimeRate).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Deductions & Summary */}
              <div className="space-y-4">
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    Deductions
                  </h4>
                  <div className="space-y-3">
                    {[
                      { key: 'pfEmployee', label: 'PF Employee' },
                      { key: 'pfEmployer', label: 'PF Employer' },
                      { key: 'professionalTax', label: 'Professional Tax' },
                      { key: 'incomeTax', label: 'Income Tax' }
                    ].map(field => (
                      <div key={field.key}>
                        <label className="block text-sm text-gray-400 mb-1">{field.label}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            value={formData[field.key]}
                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compute Button */}
                <motion.button
                  onClick={computePayslip}
                  disabled={computing}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Calculator className="w-5 h-5" />
                  {computing ? 'Computing...' : 'Compute Payslip'}
                </motion.button>

                {/* Computation Summary */}
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-4">Payslip Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Gross Earnings:</span>
                      <span className="text-green-400 font-semibold">₹ {computed.grossEarnings.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Deductions:</span>
                      <span className="text-red-400 font-semibold">- ₹ {computed.totalDeductions.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-700 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-white font-bold">Net Pay:</span>
                        <span className="text-blue-400 font-bold text-lg">₹ {computed.netPay.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-8 py-6 border-t border-gray-800 bg-gray-900/50">
            <motion.button
              onClick={handleDownloadPDF}
              disabled={!selectedEmployee || computed.netPay === 0}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              Download PDF
            </motion.button>
            <motion.button
              onClick={handleValidate}
              disabled={loading || !formData.employeeId}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Validate & Save
                </>
              )}
            </motion.button>
            <motion.button
              onClick={handleClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all"
            >
              Cancel
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NewPayslipModal;
